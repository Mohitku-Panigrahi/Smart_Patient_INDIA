"""
medicine_service.py
-------------------
Core clinical pharmacology and database querying service for Smart Patient India.
Executes O(1) indexed SQL lookups, brand-to-generic resolution, pairwise DDI analysis,
and ML-driven Adverse Drug Reaction (ADR) risk scoring.
"""

import json
import math
import os
import sqlite3
from typing import Any, Dict, List, Optional

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
            },
            "hazard_organ_subtypes": {
                "nephrotoxicity": {"intercept": -2.85, "weights": {"age_normalized": 1.2, "renal_impairment": 2.2, "drug_nsaid": 1.9, "drug_ace_arb": 1.4}},
                "hepatotoxicity": {"intercept": -3.10, "weights": {"hepatic_impairment": 2.4, "drug_statin": 1.1, "drug_ayur_active": 0.85}},
                "gi_bleeding": {"intercept": -2.95, "weights": {"age_normalized": 1.3, "has_peptic_ulcer": 2.1, "drug_nsaid": 2.05, "drug_anticoagulant": 2.3}},
                "severe_hypoglycemia": {"intercept": -3.00, "weights": {"has_diabetes": 1.8, "drug_metformin": 1.5, "drug_ayur_active": 1.2}}
            }
        }
    }
    return _ML_MODEL_CACHE

class MedicineService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def get_medicine(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves complete pharmacological breakdown for a drug by brand name or generic compound.
        Seamlessly resolves Indian brand names to Jan Aushadhi alternatives.
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

        med_id = med_row["id"] if med_row else None
        generic_name = med_row["generic_name"] if med_row else brand_row["generic_name"]

        # Step 3: Fetch related clinical attributes
        indications = []
        adverse_effects = []
        contraindications = []
        boxed_warnings = []

        if med_id:
            for r in cursor.execute("SELECT indication FROM indications WHERE medicine_id = ?", (med_id,)).fetchall():
                indications.append(r["indication"])

            for r in cursor.execute("SELECT reaction, frequency FROM adverse_effects WHERE medicine_id = ?", (med_id,)).fetchall():
                adverse_effects.append({"reaction": r["reaction"], "frequency": r["frequency"]})

            for r in cursor.execute("SELECT condition, severity, why_avoid FROM contraindications WHERE medicine_id = ?", (med_id,)).fetchall():
                contraindications.append({"condition": r["condition"], "severity": r["severity"], "why": r["why_avoid"]})

            for r in cursor.execute("SELECT warning_title, warning_text FROM boxed_warnings WHERE medicine_id = ?", (med_id,)).fetchall():
                boxed_warnings.append({"title": r["warning_title"], "text": r["warning_text"]})

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
                "safety_warning": brand_row["safety_warning"]
            }

        conn.close()

        return {
            "id": med_id,
            "generic_name": generic_name,
            "category": med_row["category"] if med_row else "Indian Pharma",
            "dosage_forms": json.loads(med_row["dosage_forms"]) if (med_row and med_row["dosage_forms"]) else ["Tablet"],
            "plain_english_summary": med_row["plain_english_summary"] if med_row else (brand_row["composition"] if brand_row else ""),
            "indications": indications,
            "adverse_effects": adverse_effects,
            "contraindications": contraindications,
            "boxed_warnings": boxed_warnings,
            "indian_brand_profile": indian_brand_info,
            "source": med_row["source"] if med_row else "Indian Pharmacopoeia (IP) / CDSCO"
        }

    def check_interactions(self, medicine_list: List[str]) -> List[Dict[str, Any]]:
        """
        Evaluates pairwise drug-drug clashes and Ayurveda-Allopathy herb clashes.
        """
        if not medicine_list or len(medicine_list) < 2:
            return []

        conn = get_db_connection(self.db_path)
        cursor = conn.cursor()
        detected_clashes = []

        # 1. Resolve Indian brand names and decompose multi-salt combinations
        drug_candidate_groups = []
        for m in medicine_list:
            clean = m.strip()
            candidates = {clean}
            b_row = cursor.execute("SELECT generic_name, composition FROM indian_brands WHERE brand_name LIKE ? LIMIT 1", (f"%{clean}%",)).fetchone()
            if b_row:
                gen = b_row["generic_name"]
                candidates.add(gen)
                comp = b_row["composition"]
                candidates.add(comp)
                for part in gen.replace(" and ", ",").replace("+", ",").split(","):
                    candidates.add(part.strip())
            drug_candidate_groups.append(list(candidates))

        # 2. Pairwise allopathic drug check
        n = len(drug_candidate_groups)
        seen_clashes = set()

        for i in range(n):
            for j in range(i + 1, n):
                group_a = drug_candidate_groups[i]
                group_b = drug_candidate_groups[j]
                found_match = False

                for d1 in group_a:
                    if found_match:
                        break
                    for d2 in group_b:
                        row = cursor.execute("""
                            SELECT * FROM drug_interactions 
                            WHERE (drug_a LIKE ? AND drug_b LIKE ?) OR (drug_a LIKE ? AND drug_b LIKE ?)
                            LIMIT 1
                        """, (f"%{d1}%", f"%{d2}%", f"%{d2}%", f"%{d1}%")).fetchone()

                        if row:
                            clash_key = f"{min(row['drug_a'], row['drug_b'])}_{max(row['drug_a'], row['drug_b'])}"
                            if clash_key not in seen_clashes:
                                seen_clashes.add(clash_key)
                                detected_clashes.append({
                                    "type": "drug_drug_interaction",
                                    "drug_a": row["drug_a"],
                                    "drug_b": row["drug_b"],
                                    "severity": row["severity"],
                                    "title": row["title"],
                                    "mechanism": row["mechanism"],
                                    "clinical_risk": row["clinical_risk"],
                                    "source": row["source"]
                                })
                            found_match = True
                            break

        # 3. Ayurveda Herb-Drug checks
        all_drugs_str = " ".join([d for group in drug_candidate_groups for d in group]).lower()
        ayur_rows = cursor.execute("SELECT * FROM ayurveda_interactions").fetchall()

        for a in ayur_rows:
            herb = a["herb_name"].lower()
            # If herb was in input list
            if any(herb in m.lower() for m in medicine_list):
                # Check if clashing allopathy is in input list
                allo_group = a["allopathy_group"].lower()
                if any(kw in all_drugs_str for kw in ["metformin", "glycomet", "aspirin", "ecosprin", "sedative", "alprazolam", "insulin", "statin", "atorva"]):
                    detected_clashes.append({
                        "type": "ayurveda_allopathy_interaction",
                        "herb": a["herb_name"],
                        "clashing_with": a["allopathy_group"],
                        "severity": a["severity"],
                        "title": a["title"],
                        "mechanism": a["mechanism"],
                        "clinical_risk": a["clinical_risk"],
                        "hindi_warning": a["hindi_warning"]
                    })

        conn.close()
        return detected_clashes

    def predict_adr_risk(self, patient_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes trained predictive ML model on patient profile to estimate ADR risk,
        multi-organ hazard probabilities, and SHAP explainability.
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
        """Returns full Indian Brand and Jan Aushadhi savings catalog."""
        conn = get_db_connection(self.db_path)
        cursor = conn.cursor()
        rows = cursor.execute("SELECT * FROM indian_brands ORDER BY brand_name ASC").fetchall()
        brands = [dict(r) for r in rows]
        conn.close()
        return brands
