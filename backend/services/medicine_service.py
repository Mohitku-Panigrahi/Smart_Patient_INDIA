"""
medicine_service.py
-------------------
Core clinical pharmacology and database querying service for Smart Patient India v3.
Executes canonical ID entity resolution, exact-match pairwise DDI analysis,
allergy ontology cross-reactivity evaluations, statutory regulatory alerts,
and ML-assisted Adverse Drug Reaction (ADR) risk assessment with SHAP explainability.
"""

import json
import math
import os
import sqlite3
from typing import Any, Dict, List, Optional, Set, Tuple

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB_PATH = os.path.join(BASE_DIR, "backend", "data", "medicines.db")
ML_WEIGHTS_PATH = os.path.join(BASE_DIR, "data", "adr_model_weights.json")

# In-memory cached ML weights
_ML_MODEL_CACHE: Optional[Dict[str, Any]] = None

def get_db_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def _load_ml_model() -> Dict[str, Any]:
    global _ML_MODEL_CACHE
    if _ML_MODEL_CACHE is not None:
        return _ML_MODEL_CACHE

    if os.path.exists(ML_WEIGHTS_PATH):
        with open(ML_WEIGHTS_PATH, "r", encoding="utf-8") as f:
            _ML_MODEL_CACHE = json.load(f)
            return _ML_MODEL_CACHE

    # Built-in fallback weights if file missing
    _ML_MODEL_CACHE = {
        "coefficients": {
            "overall_adr": {
                "intercept": -2.40,
                "weights": {
                    "age_normalized": 1.45, "is_female": 0.18, "polypharmacy_count": 2.10,
                    "renal_impairment": 1.35, "hepatic_impairment": 1.50,
                    "has_hypertension": 0.45, "has_diabetes": 0.55, "has_ckd": 1.25,
                    "has_peptic_ulcer": 0.85, "has_cardiovascular": 0.70,
                    "drug_nsaid": 1.10, "drug_ace_arb": 0.65, "drug_beta_blocker": 0.40,
                    "drug_statin": 0.50, "drug_metformin": 0.45, "drug_antibiotic_potent": 0.80,
                    "drug_anticoagulant": 1.30, "drug_ppi": 0.35, "drug_sedative": 1.05,
                    "drug_ayur_active": 0.60
                },
                "interaction_bonuses": [
                    {"features": ["drug_nsaid", "drug_ace_arb"], "weight": 1.65, "reason": "NSAID + ACE/ARB synergism (Collapses renal perfusion)"},
                    {"features": ["drug_nsaid", "drug_anticoagulant"], "weight": 1.95, "reason": "NSAID + Antiplatelet synergism (Severe GI ulceration & hemorrhage)"},
                    {"features": ["drug_sedative", "drug_ayur_active"], "weight": 1.40, "reason": "Sedative + Ayurvedic GABAergic herb synergy (Compounded CNS depression)"},
                    {"features": ["drug_metformin", "renal_impairment"], "weight": 1.85, "reason": "Metformin accumulation in renal compromise (Risk of Lactic Acidosis)"}
                ]
            }
        }
    }
    return _ML_MODEL_CACHE

class MedicineService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def _resolve_canonical_ids(self, medicine_name: str, cursor: sqlite3.Cursor) -> List[Tuple[str, str]]:
        """
        Resolves a user-provided name (brand or generic) into a list of (canonical_id, display_name) tuples.
        Decomposes complex combination salts across brands and generics
        (e.g. Combiflam -> [ibp-001, ibu-001, para-001], Pan-D -> [pan-001, dom-001]).
        """
        clean = medicine_name.strip()
        results: List[Tuple[str, str]] = []
        seen_ids: Set[str] = set()

        # 1. Match Indian trade brand
        brand_row = cursor.execute("""
            SELECT canonical_medicine_id, generic_name, composition, brand_name 
            FROM indian_brands 
            WHERE brand_name = ? OR brand_name LIKE ?
            ORDER BY CASE WHEN brand_name = ? THEN 1 ELSE 2 END, LENGTH(brand_name) ASC
            LIMIT 1
        """, (clean, f"{clean}%", clean)).fetchone()

        if brand_row:
            c_id = brand_row["canonical_medicine_id"]
            if c_id and c_id not in seen_ids:
                seen_ids.add(c_id)
                results.append((c_id, brand_row["brand_name"]))

            # Decompose combination salts from generic_name and composition
            combo_text = f"{brand_row['generic_name']} + {brand_row['composition'] or ''}"
            parts = combo_text.replace(" and ", ",").replace("+", ",").replace("/", ",").replace("&", ",").split(",")
            for part in parts:
                part_clean = ''.join([c for c in part if not c.isdigit()]).replace("mg", "").replace("mcg", "").replace("ml", "").replace("IU", "").strip()
                if len(part_clean) < 3:
                    continue
                p_lower = part_clean.lower()
                m_row = cursor.execute("""
                    SELECT id, generic_name FROM medicines 
                    WHERE normalized_name = ? OR normalized_name LIKE ? OR normalized_name LIKE ?
                    ORDER BY 
                       CASE WHEN normalized_name = ? THEN 1 WHEN normalized_name LIKE ? THEN 2 ELSE 3 END,
                       CASE WHEN generic_name LIKE '% and %' OR generic_name LIKE '%+%' OR generic_name LIKE '%/%' THEN 2 ELSE 1 END,
                       LENGTH(generic_name) ASC
                    LIMIT 1
                """, (p_lower, f"{p_lower} %", f"{p_lower} (%", p_lower, f"{p_lower} %")).fetchone()
                if m_row and m_row["id"] not in seen_ids:
                    seen_ids.add(m_row["id"])
                    results.append((m_row["id"], m_row["generic_name"]))

        # 2. Direct master medicine match (precision single-entity or exact combo match)
        clean_lower = clean.lower()
        m_rows = cursor.execute("""
            SELECT id, generic_name, normalized_name FROM medicines 
            WHERE normalized_name = ? 
               OR normalized_name LIKE ? 
               OR normalized_name LIKE ?
            ORDER BY 
               CASE 
                 WHEN normalized_name = ? THEN 1
                 WHEN normalized_name LIKE ? THEN 2
                 ELSE 3
               END,
               -- Penalize multi-ingredient combination drugs when querying a single salt (e.g. Paracetamol != Ibuprofen and Paracetamol)
               CASE 
                 WHEN generic_name LIKE '% and %' OR generic_name LIKE '%+%' OR generic_name LIKE '%/%' THEN 2 
                 ELSE 1 
               END,
               LENGTH(generic_name) ASC
            LIMIT 1
        """, (
            clean_lower, 
            f"{clean_lower} %", 
            f"{clean_lower} (%", 
            clean_lower, 
            f"{clean_lower} %"
        )).fetchall()

        # Fallback if no exact prefix match
        if not m_rows:
            m_rows = cursor.execute("""
                SELECT id, generic_name, normalized_name FROM medicines 
                WHERE normalized_name LIKE ? OR generic_name LIKE ?
                ORDER BY LENGTH(generic_name) ASC
                LIMIT 1
            """, (f"%{clean_lower}%", f"%{clean}%")).fetchall()

        for m_row in m_rows:
            if m_row["id"] not in seen_ids:
                seen_ids.add(m_row["id"])
                results.append((m_row["id"], m_row["generic_name"]))

            # Decompose if generic name itself is an explicit combination (e.g. Amoxicillin/Clavulanate)
            gen_name = m_row["generic_name"]
            if "/" in gen_name or " and " in gen_name or "+" in gen_name:
                subparts = gen_name.replace(" and ", ",").replace("+", ",").replace("/", ",").split(",")
                for sub in subparts:
                    sub_clean = sub.strip()
                    if len(sub_clean) >= 3:
                        s_lower = sub_clean.lower()
                        sub_row = cursor.execute("""
                            SELECT id, generic_name FROM medicines 
                            WHERE (normalized_name = ? OR normalized_name LIKE ? OR normalized_name LIKE ?) AND id != ?
                            LIMIT 1
                        """, (s_lower, f"{s_lower} %", f"{s_lower} (%", m_row["id"])).fetchone()
                        if sub_row and sub_row["id"] not in seen_ids:
                            seen_ids.add(sub_row["id"])
                            results.append((sub_row["id"], sub_row["generic_name"]))

        return results

    def get_medicine(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves complete pharmacological breakdown for a drug by brand name or generic compound.
        Seamlessly resolves Indian brand names to Jan Aushadhi alternatives, allergy profiles,
        statutory boxed warnings, and evidence provenance metadata.
        """
        if not query:
            return None

        conn = get_db_connection(self.db_path)
        cursor = conn.cursor()
        q = query.strip()

        # Step 1: Check if input matches an Indian Trade Brand (e.g. Dolo 650, Augmentin, Pan-D)
        brand_row = cursor.execute("""
            SELECT * FROM indian_brands 
            WHERE brand_name LIKE ? OR brand_name LIKE ?
            LIMIT 1
        """, (f"%{q}%", f"{q}%")).fetchone()

        generic_target = brand_row["generic_name"] if brand_row else q

        # Step 2: Query master medicines table
        med_row = cursor.execute("""
            SELECT * FROM medicines 
            WHERE generic_name LIKE ? OR normalized_name LIKE ?
            LIMIT 1
        """, (f"%{generic_target}%", f"%{generic_target.lower()}%")).fetchone()

        if not med_row and not brand_row:
            conn.close()
            return None

        med_id = med_row["id"] if med_row else (brand_row["canonical_medicine_id"] if brand_row else None)
        generic_name = med_row["generic_name"] if med_row else brand_row["generic_name"]

        # Step 3: Fetch related clinical attributes
        indications = []
        adverse_effects = []
        contraindications = []
        boxed_warnings = []
        allergy_risks = []

        if med_id:
            for r in cursor.execute("SELECT indication, source FROM indications WHERE medicine_id = ?", (med_id,)).fetchall():
                indications.append(r["indication"])

            for r in cursor.execute("SELECT reaction, frequency, source FROM adverse_effects WHERE medicine_id = ?", (med_id,)).fetchall():
                adverse_effects.append({"reaction": r["reaction"], "frequency": r["frequency"]})

            for r in cursor.execute("SELECT condition, severity, why_avoid, source FROM contraindications WHERE medicine_id = ?", (med_id,)).fetchall():
                contraindications.append({"condition": r["condition"], "severity": r["severity"], "why": r["why_avoid"]})

            for r in cursor.execute("""
                SELECT warning_type, severity, title, description, source, source_url, last_verified 
                FROM boxed_warnings WHERE medicine_id = ?
            """, (med_id,)).fetchall():
                boxed_warnings.append({
                    "warning_type": r["warning_type"],
                    "severity": r["severity"],
                    "title": r["title"],
                    "description": r["description"],
                    "source": r["source"],
                    "source_url": r["source_url"],
                    "last_verified": r["last_verified"]
                })

            for r in cursor.execute("""
                SELECT ac.name as class_name, mar.cross_reactivity_level, mar.hypersensitivity_warning, mar.severity, mar.source
                FROM medicine_allergy_risks mar
                JOIN allergy_classes ac ON mar.allergy_class_id = ac.id
                WHERE mar.medicine_id = ?
            """, (med_id,)).fetchall():
                allergy_risks.append({
                    "allergy_class": r["class_name"],
                    "cross_reactivity_level": r["cross_reactivity_level"],
                    "hypersensitivity_warning": r["hypersensitivity_warning"],
                    "severity": r["severity"],
                    "source": r["source"]
                })

        # Step 4: Indian brand & Jan Aushadhi generic mapping
        indian_brand_info = None
        if brand_row:
            indian_brand_info = {
                "brand_name": brand_row["brand_name"],
                "manufacturer": brand_row["manufacturer"],
                "composition": brand_row["composition"],
                "cdsco_schedule": brand_row["cdsco_schedule"],
                "branded_mrp_inr": brand_row["branded_mrp_inr"],
                "jan_aushadhi_name": brand_row["jan_aushadhi_name"],
                "jan_aushadhi_price_inr": brand_row["jan_aushadhi_price_inr"],
                "savings_percentage": brand_row["savings_percentage"],
                "plain_hindi_summary": brand_row["plain_hindi_summary"],
                "safety_warning": brand_row["safety_warning"],
                "source": brand_row["source"],
                "source_url": brand_row["source_url"],
                "effective_date": brand_row["effective_date"],
                "last_verified": brand_row["last_verified"]
            }

        conn.close()

        return {
            "id": med_id,
            "generic_name": generic_name,
            "category": med_row["category"] if med_row else "Indian Pharma",
            "dosage_forms": json.loads(med_row["dosage_forms"]) if (med_row and med_row["dosage_forms"]) else ["Tablet"],
            "plain_english_summary": med_row["plain_english_summary"] if med_row else (brand_row["composition"] if brand_row else ""),
            "confidence_grade": med_row["confidence_grade"] if med_row else "A",
            "indications": indications,
            "adverse_effects": adverse_effects,
            "contraindications": contraindications,
            "boxed_warnings": boxed_warnings,
            "allergy_risks": allergy_risks,
            "indian_brand_profile": indian_brand_info,
            "source": med_row["source"] if med_row else "Indian Pharmacopoeia (IP) / CDSCO",
            "source_url": med_row["source_url"] if med_row else None,
            "last_verified": med_row["last_verified"] if med_row else "2026-03-15"
        }

    def check_interactions(self, medicine_list: List[str]) -> List[Dict[str, Any]]:
        """
        Evaluates pairwise drug-drug clashes using exact canonical drug ID matching (eliminating LIKE false matches)
        and evaluates clinically referenced Ayurveda-Allopathy herb clashes with evidence levels.
        """
        if not medicine_list or len(medicine_list) < 2:
            return []

        conn = get_db_connection(self.db_path)
        cursor = conn.cursor()
        detected_clashes = []

        # 1. Resolve canonical ID candidate groups for each medicine in regimen
        candidate_groups: List[List[Tuple[str, str]]] = []
        for m in medicine_list:
            ids = self._resolve_canonical_ids(m, cursor)
            candidate_groups.append(ids)

        # 2. Deterministic pairwise DDI check by exact canonical IDs
        n = len(candidate_groups)
        seen_clashes: Set[str] = set()

        for i in range(n):
            for j in range(i + 1, n):
                group_a = candidate_groups[i]
                group_b = candidate_groups[j]
                found_match = False

                for id_a, name_a in group_a:
                    if found_match:
                        break
                    for id_b, name_b in group_b:
                        row = cursor.execute("""
                            SELECT * FROM drug_interactions 
                            WHERE (drug_a_id = ? AND drug_b_id = ?) OR (drug_a_id = ? AND drug_b_id = ?)
                            LIMIT 1
                        """, (id_a, id_b, id_b, id_a)).fetchone()

                        if row:
                            clash_key = f"{min(row['drug_a_id'], row['drug_b_id'])}_{max(row['drug_a_id'], row['drug_b_id'])}"
                            if clash_key not in seen_clashes:
                                seen_clashes.add(clash_key)
                                detected_clashes.append({
                                    "type": "drug_drug_interaction",
                                    "drug_a": row["drug_a"],
                                    "drug_b": row["drug_b"],
                                    "drug_a_id": row["drug_a_id"],
                                    "drug_b_id": row["drug_b_id"],
                                    "severity": row["severity"],
                                    "title": row["title"],
                                    "mechanism": row["mechanism"],
                                    "clinical_risk": row["clinical_risk"],
                                    "evidence_level": row["evidence_level"],
                                    "source": row["source"],
                                    "source_url": row["source_url"],
                                    "last_verified": row["last_verified"]
                                })
                            found_match = True
                            break

        # 3. Ayurveda Herb-Drug checks with evidence levels
        all_drugs_str = " ".join([m.lower() for m in medicine_list])
        ayur_rows = cursor.execute("SELECT * FROM ayurveda_interactions").fetchall()

        for a in ayur_rows:
            herb = a["herb_name"].lower()
            # If herb was in input list
            if any(herb in m.lower() for m in medicine_list):
                allo_group = a["allopathy_group"].lower()
                # Check for clashing allopathic keywords
                if any(kw in all_drugs_str for kw in ["metformin", "glycomet", "aspirin", "ecosprin", "sedative", "alprazolam", "tramadol", "insulin", "statin", "atorva"]):
                    detected_clashes.append({
                        "type": "ayurveda_allopathy_interaction",
                        "herb": a["herb_name"],
                        "clashing_with": a["allopathy_group"],
                        "severity": a["severity"],
                        "title": a["title"],
                        "mechanism": a["mechanism"],
                        "clinical_risk": a["clinical_risk"],
                        "hindi_warning": a["hindi_warning"],
                        "evidence_level": a["evidence_level"],
                        "source": a["source"],
                        "last_verified": a["last_verified"]
                    })

        conn.close()
        return detected_clashes

    def check_allergies(self, patient_allergies: List[str], medicine_list: List[str]) -> List[Dict[str, Any]]:
        """
        Clinical allergy evaluation distinguishing IgE-mediated hypersensitivity from adverse effects.
        Cross-checks patient reported allergies against drug classes (e.g. Penicillins, NSAIDs, Sulfa)
        and individual active salts.
        """
        if not patient_allergies or not medicine_list:
            return []

        conn = get_db_connection(self.db_path)
        cursor = conn.cursor()
        detected_allergies = []
        seen_keys: Set[str] = set()

        for med in medicine_list:
            canonical_pairs = self._resolve_canonical_ids(med, cursor)
            for m_id, m_name in canonical_pairs:
                # Query allergy risks for this medicine
                risks = cursor.execute("""
                    SELECT ac.id as class_id, ac.name as class_name, ac.common_manifestations, ac.synonyms,
                           mar.cross_reactivity_level, mar.hypersensitivity_warning, mar.severity, mar.source
                    FROM medicine_allergy_risks mar
                    JOIN allergy_classes ac ON mar.allergy_class_id = ac.id
                    WHERE mar.medicine_id = ?
                """, (m_id,)).fetchall()

                for r in risks:
                    class_name = r["class_name"].lower()
                    class_id = r["class_id"].lower()
                    manifestations = r["common_manifestations"]
                    syn_list = []
                    if r["synonyms"]:
                        try:
                            syn_list = [s.lower() for s in json.loads(r["synonyms"])]
                        except Exception:
                            syn_list = [s.strip().lower() for s in r["synonyms"].split(",")]

                    # Check if any patient reported allergy matches class, synonyms, or drug name
                    for pa in patient_allergies:
                        pa_clean = pa.strip().lower()
                        if not pa_clean:
                            continue

                        # Match criteria:
                        # 1. Exact or partial match with class name or ID
                        # 2. Match with class clinical synonyms (e.g. Aspirin -> ALG_NSAIDS)
                        # 3. Match with active salt name
                        is_match = (
                            pa_clean in class_name or
                            pa_clean in class_id or
                            class_name in pa_clean or
                            pa_clean in m_name.lower() or
                            pa_clean in syn_list or
                            any(syn in pa_clean or pa_clean in syn for syn in syn_list)
                        )

                        if is_match:
                            alert_key = f"{m_id}_{r['class_id']}"
                            if alert_key not in seen_keys:
                                seen_keys.add(alert_key)
                                detected_allergies.append({
                                    "medicine": med,
                                    "active_salt": m_name,
                                    "allergy_reported": pa,
                                    "allergy_class": r["class_name"],
                                    "cross_reactivity_level": r["cross_reactivity_level"],
                                    "hypersensitivity_warning": r["hypersensitivity_warning"],
                                    "common_manifestations": manifestations,
                                    "severity": r["severity"],
                                    "source": r["source"]
                                })

        conn.close()
        return detected_allergies

    def predict_adr_risk(self, patient_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes ML-assisted ADR risk assessment on patient profile to estimate ADR risk probability,
        multi-organ hazard scores, and SHAP local attribution.
        Positioned strictly as supporting clinical signal, not diagnosis.
        """
        ml_data = _load_ml_model()
        model = ml_data["coefficients"]["overall_adr"]

        age = float(patient_profile.get("age", 35))
        is_female = 1.0 if str(patient_profile.get("gender", "")).lower() == "female" else 0.0
        renal = float(patient_profile.get("renal_impairment", 0.0))
        hepatic = float(patient_profile.get("hepatic_impairment", 0.0))

        conditions = [str(c).lower() for c in patient_profile.get("conditions", [])]
        meds = [str(m).lower() for m in patient_profile.get("medicines", [])]
        herbs = [str(h).lower() for h in patient_profile.get("ayurveda_herbs", [])]

        med_string = " ".join(meds + herbs)

        feats = {
            "age_normalized": min(max(age, 0.0), 110.0) / 100.0,
            "is_female": is_female,
            "polypharmacy_count": min(len(meds) + len(herbs), 15) / 10.0,
            "renal_impairment": renal,
            "hepatic_impairment": hepatic,
            "has_hypertension": 1.0 if any("hypertens" in c or "bp" in c for c in conditions) else 0.0,
            "has_diabetes": 1.0 if any("diabet" in c or "sugar" in c for c in conditions) else 0.0,
            "has_ckd": 1.0 if any("kidney" in c or "ckd" in c or "renal" in c for c in conditions) or renal > 0 else 0.0,
            "has_peptic_ulcer": 1.0 if any("ulcer" in c or "gerd" in c or "acid" in c for c in conditions) else 0.0,
            "has_cardiovascular": 1.0 if any("heart" in c or "cardio" in c for c in conditions) else 0.0,
            "drug_nsaid": 1.0 if any(k in med_string for k in ["combiflam", "ibuprofen", "diclofenac", "naproxen"]) else 0.0,
            "drug_ace_arb": 1.0 if any(k in med_string for k in ["telma", "telmisartan", "losartan", "lisinopril"]) else 0.0,
            "drug_beta_blocker": 1.0 if any(k in med_string for k in ["metoprolol", "atenolol"]) else 0.0,
            "drug_statin": 1.0 if any(k in med_string for k in ["atorva", "atorvastatin", "rosuvastatin"]) else 0.0,
            "drug_metformin": 1.0 if any(k in med_string for k in ["glycomet", "metformin"]) else 0.0,
            "drug_antibiotic_potent": 1.0 if any(k in med_string for k in ["azithral", "azithromycin", "cipro", "clavam", "augmentin"]) else 0.0,
            "drug_anticoagulant": 1.0 if any(k in med_string for k in ["ecosprin", "aspirin", "warfarin"]) else 0.0,
            "drug_ppi": 1.0 if any(k in med_string for k in ["pan-d", "pantocid", "pantoprazole", "omeprazole"]) else 0.0,
            "drug_sedative": 1.0 if any(k in med_string for k in ["alprazolam", "clonazepam", "tramadol"]) else 0.0,
            "drug_ayur_active": 1.0 if (herbs or any(k in med_string for k in ["ashwagandha", "giloy", "guggulu", "karela"])) else 0.0
        }

        z = model["intercept"]
        shap_list = []

        for feat, val in feats.items():
            w = model["weights"].get(feat, 0.0)
            impact = w * val
            z += impact
            if abs(impact) >= 0.10:
                shap_list.append({"feature": feat, "value": round(val, 2), "impact": round(impact, 3)})

        for bonus in model.get("interaction_bonuses", []):
            if all(feats.get(f, 0.0) > 0 for f in bonus["features"]):
                z += bonus["weight"]
                shap_list.append({
                    "feature": " + ".join(bonus["features"]),
                    "impact": bonus["weight"],
                    "reason": bonus["reason"]
                })

        risk_prob = 1.0 / (1.0 + math.exp(-max(min(z, 20.0), -20.0)))
        shap_list.sort(key=lambda x: abs(x["impact"]), reverse=True)

        recommendations = []
        if feats["drug_nsaid"] and feats["drug_ace_arb"]:
            recommendations.append("Substitute NSAID (Combiflam) with Paracetamol 650 alone to eliminate renal hemodynamics conflict.")
        if feats["drug_nsaid"] and feats["drug_anticoagulant"]:
            recommendations.append("Co-prescribing antiplatelets (Ecosprin) and NSAIDs requires proton pump inhibitor (Pan-D) mucosal protection.")
        if feats["drug_metformin"] and feats["renal_impairment"] >= 1.0:
            recommendations.append("Verify serum eGFR before continuing Metformin; contraindicated if eGFR < 30 mL/min.")
        if feats["drug_sedative"] and feats["drug_ayur_active"]:
            recommendations.append("Separate or taper sedative therapy if consuming Ashwagandha; monitor daytime somnolence.")
        if not recommendations:
            recommendations.append("No high-risk multi-drug synergy detected. Maintain standard therapeutic monitoring.")

        return {
            "risk_probability": round(risk_prob, 4),
            "risk_score_percentage": round(risk_prob * 100),
            "risk_category": "HIGH" if risk_prob >= 0.65 else "MODERATE" if risk_prob >= 0.35 else "LOW",
            "shap_explanations": shap_list[:5],
            "clinical_recommendations": recommendations
        }

    def get_all_indian_brands(self) -> List[Dict[str, Any]]:
        """Returns full Indian Brand and Jan Aushadhi savings catalog with provenance."""
        conn = get_db_connection(self.db_path)
        cursor = conn.cursor()
        rows = cursor.execute("SELECT * FROM indian_brands ORDER BY brand_name ASC").fetchall()
        brands = [dict(r) for r in rows]
        conn.close()
        return brands

    def evaluate_bio_cascades(self, medicines: List[str], herbs: Optional[List[str]] = None, patient_profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Executes multi-order physiological bio-cascade analysis:
        1. The Triple Whammy (Glomerular Hemodynamic Collapse)
        2. Hepatic CYP450 Enzymatic Competition & Clearance Matrix
        3. Cumulative Anticholinergic Cognitive Burden (ACB) Scale
        4. Composite QTc Interval Arrhythmia Vector Sum
        5. Cumulative Hemorrhagic Bleeding Risk Index
        6. Ayurvedic Bio-Enhancer Pharmacokinetic Surge (The Piperine Effect)
        """
        herbs = herbs or []
        patient_profile = patient_profile or {}
        med_str = " ".join([m.lower() for m in medicines])
        herb_str = " ".join([h.lower() for h in herbs])
        age = int(patient_profile.get("age", 35))

        # 1. Triple Whammy Detection
        has_nsaid = any(k in med_str for k in ["ibuprofen", "combiflam", "diclofenac", "naproxen", "aspirin"])
        has_raas = any(k in med_str for k in ["telmisartan", "telma", "lisinopril", "ramipril", "losartan", "enalapril"])
        has_diuretic = any(k in med_str for k in ["furosemide", "lasix", "hydrochlorothiazide", "chlorthalidone", "spironolactone"])

        triple_whammy = None
        if has_nsaid and has_raas and has_diuretic:
            triple_whammy = {
                "id": "cascade-triple-whammy-triad",
                "severity": "CRITICAL",
                "title": "The Triple Whammy: Glomerular Hemodynamic Collapse",
                "mechanism": "Three-point collapse of renal autoregulation: (1) NSAID constricts afferent arteriole, (2) ACEi/ARB dilates efferent arteriole, (3) Diuretic induces volume depletion. Glomerular filtration pressure collapses.",
                "clinical_risk": "Catastrophic Acute Kidney Injury (AKI), acute tubular necrosis, and severe hyperkalemia.",
                "actionable_guidance": "CRITICAL HARM-REDUCTION ADVISORY: Discuss with doctor immediately to PAUSE or REPLACE the NSAID with Paracetamol/topicals. DO NOT stop blood pressure medications (ACEi/ARB) or diuretics on your own, as abrupt cessation triggers acute hypertensive crisis.",
                "harm_reduction_directive": "MANDATORY GUARDRAIL: Never stop prescribed antihypertensive or diuretic medicines without physician supervision.",
                "evidence_level": "Established",
                "source": "NICE Guidelines / British Journal of Clinical Pharmacology / CDSCO"
            }
        elif has_nsaid and has_raas:
            triple_whammy = {
                "id": "cascade-triple-whammy-dyad",
                "severity": "AVOID",
                "title": "NSAID + Renin-Angiotensin Blockade: Renal Hemodynamic Strain",
                "mechanism": "NSAID inhibits vasodilatory renal prostaglandins while ARB/ACEi blocks efferent constriction.",
                "clinical_risk": "Acute elevation in serum creatinine, fluid retention, and hyperkalemia.",
                "actionable_guidance": "CLINICAL ADVISORY: Inquire with physician regarding substituting NSAID with Paracetamol. Do not stop blood pressure medicines.",
                "harm_reduction_directive": "MANDATORY GUARDRAIL: Do not stop cardiovascular medications without physician confirmation.",
                "evidence_level": "Established",
                "source": "FDA DailyMed / KDIGO Guidelines"
            }

        # 2. CYP450 Enzymatic Competition
        cyp_bottlenecks = []
        # CYP3A4
        if any(k in med_str for k in ["clarithromycin", "fluconazole", "ketoconazole"]) and any(k in med_str for k in ["atorvastatin", "atorva", "simvastatin"]):
            cyp_bottlenecks.append({
                "enzyme": "CYP3A4",
                "severity": "AVOID",
                "title": "Metabolic Clearance Blockade: CYP3A4 Inhibition Driven Statin Surge",
                "mechanism": "Macrolide/Azole strongly inhibits CYP3A4, collapsing hepatic first-pass degradation of statin.",
                "projected_exposure_multiplier": "4x to 8x AUC surge",
                "clinical_risk": "Severe rhabdomyolysis, myoglobinuria, and acute renal tubular necrosis.",
                "actionable_guidance": "CLINICAL ACTIONABILITY: When prescribing antimicrobials, discuss temporarily holding Atorvastatin or switching to a non-CYP3A4 statin (e.g. Rosuvastatin or Pravastatin).",
                "harm_reduction_directive": "MANDATORY GUARDRAIL: Consult prescribing physician before altering statin or antibiotic therapies.",
                "evidence_level": "Established",
                "source": "FDA DailyMed / Flockhart Table"
            })

        # 3. Anticholinergic Burden (ACB)
        acb_weights = {
            "amitriptyline": 3, "hydroxyzine": 3, "chlorpheniramine": 3, "diphenhydramine": 3,
            "cetirizine": 1, "levocetirizine": 1, "montair-lc": 1, "domperidone": 1, "pan-d": 1,
            "ranitidine": 1, "alprazolam": 1, "atenolol": 1
        }
        total_acb = sum(w for drug, w in acb_weights.items() if drug in med_str)
        is_geriatric = age >= 65
        acb_burden = {
            "total_score": total_acb,
            "risk_level": "HIGH" if (total_acb >= 3 or (is_geriatric and total_acb >= 2)) else "MODERATE" if total_acb >= 1 else "LOW",
            "is_geriatric": is_geriatric,
            "title": "Critical Geriatric Anticholinergic Burden (ACB >= 3)" if (total_acb >= 3 and is_geriatric) else "High Geriatric Anticholinergic Risk" if (is_geriatric and total_acb >= 2) else "Anticholinergic Cognitive Burden Score",
            "clinical_risk": "Cumulative muscarinic receptor blockade predisposing older adults to acute delirium, confusion, falls, and urinary retention." if (total_acb >= 2 and is_geriatric) else "Mild peripheral anticholinergic exposure.",
            "actionable_guidance": "Review anticholinergic load with physician or geriatrician for potential deprescribing." if (total_acb >= 2 and is_geriatric) else "Maintain hydration and standard observation.",
            "harm_reduction_directive": "MANDATORY GUARDRAIL: Do not abruptly stop prescription psychotropic drugs without medical supervision.",
            "evidence_level": "Established",
            "source": "ACB Scale (Boustani et al.) / Beers Criteria 2023"
        }

        # 4. Composite QTc Vector Sum
        qtc_weights = {
            "domperidone": 3.0, "pan-d": 3.0, "azithromycin": 2.5, "azithral": 2.5,
            "clarithromycin": 2.5, "ciprofloxacin": 2.0, "ondansetron": 2.0, "escitalopram": 2.0
        }
        qtc_score = sum(w for drug, w in qtc_weights.items() if drug in med_str)
        qtc_risk = {
            "composite_score": qtc_score,
            "severity": "AVOID" if qtc_score >= 5.0 else "CAUTION" if qtc_score >= 3.0 else "SAFE",
            "title": "Additive Cardiac Repolarization Delay & Arrhythmia Hazard" if qtc_score >= 3.0 else "Normal Repolarization Profile",
            "mechanism": "Cumulative blockade of cardiac hERG potassium channels (I_Kr) delaying myocardial repolarization.",
            "clinical_risk": "Synergistic prolongation predisposing to polymorphic ventricular tachycardia (Torsades de Pointes) and syncope.",
            "actionable_guidance": "CLINICAL ADVISORY: Obtain baseline 12-lead ECG prior to co-administration. Correct hypokalemia and hypomagnesemia.",
            "harm_reduction_directive": "MANDATORY GUARDRAIL: Do not stop cardiac or anti-infective medications without physician advice.",
            "evidence_level": "Established",
            "source": "CredibleMeds QTDrugs List / CDSCO Safety Notice"
        }

        # 5. Cumulative Hemorrhagic Bleeding Risk
        bleed_score = 0
        weighting_breakdown = []
        if any(k in med_str for k in ["warfarin", "dabigatran"]):
            bleed_score += 3
            weighting_breakdown.append({"category": "Anticoagulant", "points": 3})
        if any(k in med_str for k in ["aspirin", "ecosprin", "clopidogrel"]):
            bleed_score += 2
            weighting_breakdown.append({"category": "Antiplatelet", "points": 2})
        if any(k in med_str for k in ["ibuprofen", "combiflam", "diclofenac"]):
            bleed_score += 2
            weighting_breakdown.append({"category": "NSAID Gastric Mucosal Injury", "points": 2})
        if any(k in med_str for k in ["sertraline", "fluoxetine"]):
            bleed_score += 1
            weighting_breakdown.append({"category": "SSRI Platelet Serotonin Depletion", "points": 1})
        if any(k in herb_str for k in ["guggulu", "curcumin", "haldi", "chandraprabha", "kanchnar"]):
            bleed_score += 1
            weighting_breakdown.append({"category": "Herbal Antiplatelet Synergy", "points": 1})
        if "ulcer" in str(patient_profile.get("conditions", [])).lower():
            bleed_score += 2
            weighting_breakdown.append({"category": "Peptic Ulcer History", "points": 2})

        bleed_risk = {
            "bleed_score": bleed_score,
            "weighting_breakdown": weighting_breakdown,
            "level": "CRITICAL" if bleed_score >= 5 else "HIGH" if bleed_score >= 3 else "MODERATE" if bleed_score >= 2 else "LOW",
            "title": "Compounded Gastrointestinal & Systemic Hemorrhage Hazard" if bleed_score >= 3 else "Baseline Hemostasis",
            "clinical_risk": "Multi-pathway hemostatic impairment: Factor synthesis inhibition + platelet COX-1 blockade + mucosal injury.",
            "actionable_guidance": "CLINICAL ADVISORY: Review bleeding risk with physician; consider gastroprotection (PPI).",
            "harm_reduction_directive": "MANDATORY GUARDRAIL: Do not stop prescribed anticoagulants without physician oversight.",
            "evidence_level": "Established",
            "source": "HAS-BLED Adapted Criteria / FDA DailyMed"
        }

        # 6. Ayurvedic Bio-Enhancer Surge
        bio_enhancers = []
        has_piperine_herb = any(k in herb_str for k in ["trikatu", "maricha", "pippali", "pepper", "chyawanprash", "chandraprabha", "kanchnar"])
        if has_piperine_herb:
            if any(k in med_str for k in ["metformin", "glycomet"]):
                bio_enhancers.append({
                    "title": "Bio-Enhancer Surge: Piperine + Metformin",
                    "severity": "AVOID",
                    "mechanism": "Piperine inhibits intestinal P-glycoprotein efflux and hepatic CYP3A4, doubling systemic absorption.",
                    "clinical_risk": "Acute precipitous drop in blood glucose / hypoglycemic shock.",
                    "dose_dependence_caveat": "Standardized extracts (e.g. Trikatu tablets) produce far greater absorption increases than culinary black pepper in food.",
                    "actionable_guidance": "Separate administration by at least 4 hours. Monitor blood glucose closely.",
                    "harm_reduction_directive": "MANDATORY GUARDRAIL: Do not adjust prescribed antidiabetic doses without physician confirmation.",
                    "evidence_level": "Established",
                    "source": "Ayurvedic Pharmacopoeia of India / Clinical Pharmacokinetics"
                })

        has_critical = (
            (triple_whammy and triple_whammy["severity"] in ["CRITICAL", "AVOID"]) or
            len(cyp_bottlenecks) > 0 or
            acb_burden["risk_level"] == "HIGH" or
            qtc_risk["severity"] == "AVOID" or
            bleed_risk["level"] in ["CRITICAL", "HIGH"] or
            len(bio_enhancers) > 0
        )

        return {
            "has_critical_alerts": has_critical,
            "universal_harm_reduction_directive": "MANDATORY HARM-REDUCTION DIRECTIVE: Do NOT stop or alter any prescribed chronic medicine on your own. Discuss all alerts with your prescribing physician.",
            "triple_whammy": triple_whammy,
            "cyp_bottlenecks": cyp_bottlenecks,
            "acb_burden": acb_burden,
            "qtc_risk": qtc_risk,
            "bleed_risk": bleed_risk,
            "bio_enhancers": bio_enhancers
        }

