"""
test_backend.py
---------------
Comprehensive Unit and API integration tests for Smart Patient India v3:
  - SQLite database integrity & schema counts
  - Canonical drug ID exact matching (zero false positive substring matches)
  - Clinical allergy classes & cross-reactivity evaluations
  - Statutory FDA & CDSCO Boxed Warnings
  - Provenance metadata & timestamps
  - Indian brand to Jan Aushadhi generic mapping
  - ML-assisted ADR risk assessment with SHAP explainability
  - FastAPI endpoints (including POST /api/check-allergy)
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.services.medicine_service import MedicineService, get_db_connection
from backend.api.main import app

client = TestClient(app)
service = MedicineService()

def test_database_connection_and_counts():
    conn = get_db_connection()
    cursor = conn.cursor()
    med_count = cursor.execute("SELECT COUNT(*) FROM medicines").fetchone()[0]
    brand_count = cursor.execute("SELECT COUNT(*) FROM indian_brands").fetchone()[0]
    allergy_count = cursor.execute("SELECT COUNT(*) FROM allergy_classes").fetchone()[0]
    boxed_count = cursor.execute("SELECT COUNT(*) FROM boxed_warnings").fetchone()[0]
    conn.close()

    assert med_count >= 75
    assert brand_count >= 15
    assert allergy_count >= 7
    assert boxed_count >= 6, "boxed_warnings must be populated with verified alerts"

def test_generic_medicine_lookup():
    med = service.get_medicine("Amoxicillin")
    assert med is not None
    assert "Amoxicillin" in med["generic_name"]
    assert len(med["indications"]) > 0
    assert len(med["contraindications"]) > 0
    assert med["last_verified"] is not None

def test_indian_brand_resolution():
    # Test brand name resolution to generic + Jan Aushadhi
    med = service.get_medicine("Dolo 650")
    assert med is not None
    assert "Paracetamol" in med["generic_name"]
    assert med["indian_brand_profile"] is not None
    assert med["indian_brand_profile"]["brand_name"] == "Dolo 650"
    assert "Jan Aushadhi" in med["indian_brand_profile"]["jan_aushadhi_name"] or "Paracetamol" in med["indian_brand_profile"]["jan_aushadhi_name"]
    assert med["indian_brand_profile"]["jan_aushadhi_price_inr"] < med["indian_brand_profile"]["branded_mrp_inr"]
    assert med["indian_brand_profile"]["effective_date"] is not None
    assert med["indian_brand_profile"]["last_verified"] is not None

def test_canonical_id_exact_matching_ddi():
    # Canonical ID exact match: Ibuprofen (ibu-001) + Telmisartan (tel-001)
    clashes = service.check_interactions(["Ibuprofen", "Telmisartan"])
    assert len(clashes) >= 1
    assert clashes[0]["severity"] == "AVOID"
    assert clashes[0]["evidence_level"] == "Established"
    assert clashes[0]["drug_a_id"] in ["ibu-001", "tel-001"]
    assert clashes[0]["drug_b_id"] in ["ibu-001", "tel-001"]

def test_combination_brand_canonical_decomposition_ddi():
    # Combiflam (ibp-001 -> ibu-001 + para-001) + Telma 40 (tel-001)
    clashes = service.check_interactions(["Combiflam", "Telma 40"])
    assert len(clashes) >= 1
    assert any(c["severity"] == "AVOID" for c in clashes)
    assert any("renal" in c["clinical_risk"].lower() or "kidney" in c["clinical_risk"].lower() for c in clashes)

def test_allergy_direct_hypersensitivity():
    # Patient with Penicillin allergy taking Augmentin 625 Duo
    alerts = service.check_allergies(["Penicillin"], ["Augmentin 625 Duo"])
    assert len(alerts) >= 1
    alert = alerts[0]
    assert alert["severity"] == "AVOID"
    assert alert["cross_reactivity_level"] == "Direct Compound"
    assert "anaphylaxis" in alert["hypersensitivity_warning"].lower() or "hypersensitivity" in alert["hypersensitivity_warning"].lower()

def test_allergy_cross_reactivity_warning():
    # Patient with Penicillin allergy taking Cephalexin (Cephalosporin cross-reactivity)
    alerts = service.check_allergies(["Penicillin"], ["Cephalexin"])
    assert len(alerts) >= 1
    alert = alerts[0]
    assert alert["severity"] == "CAUTION"
    assert alert["cross_reactivity_level"] == "Moderate Cross-Reactivity"

def test_allergy_nsaid_class_warning():
    # Patient with Aspirin / NSAID allergy taking Combiflam
    alerts = service.check_allergies(["Aspirin"], ["Combiflam"])
    assert len(alerts) >= 1
    assert any("NSAID" in a["allergy_class"] for a in alerts)
    assert any(a["severity"] == "AVOID" for a in alerts)

def test_boxed_warnings_retrieval():
    # Metformin must have Lactic Acidosis Black Box
    med = service.get_medicine("Metformin")
    assert med is not None
    assert len(med["boxed_warnings"]) >= 1
    bw = med["boxed_warnings"][0]
    assert bw["warning_type"] == "BLACK_BOX"
    assert bw["severity"] == "CRITICAL"
    assert "Lactic Acidosis" in bw["title"]
    assert bw["source_url"] is not None

    # Telmisartan must have pregnancy black box
    tel = service.get_medicine("Telmisartan")
    assert tel is not None
    assert len(tel["boxed_warnings"]) >= 1
    assert any("pregnancy" in w["title"].lower() or "fetal" in w["title"].lower() for w in tel["boxed_warnings"])

def test_ayurveda_allopathy_interaction_check():
    # Herb-drug clash: Ashwagandha + Metformin
    clashes = service.check_interactions(["Ashwagandha", "Metformin"])
    assert len(clashes) >= 1
    assert any("Ashwagandha" in c.get("herb", "") for c in clashes)
    assert clashes[0]["evidence_level"] in ["Established", "Moderate Evidence"]

def test_adr_ml_prediction_service():
    profile_high_risk = {
        "age": 70,
        "gender": "male",
        "renal_impairment": 1,
        "conditions": ["Hypertension", "Diabetes"],
        "medicines": ["Combiflam", "Telma 40", "Glycomet"],
        "ayurveda_herbs": []
    }
    result = service.predict_adr_risk(profile_high_risk)
    assert result["risk_probability"] > 0.65
    assert result["risk_category"] == "HIGH"
    assert len(result["shap_explanations"]) > 0
    assert len(result["clinical_recommendations"]) > 0

# ── API Endpoint Tests ───────────────────────────────────────────────────────

def test_api_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["statistics"]["master_medicines"] >= 75
    assert data["statistics"]["allergy_classes"] >= 7
    assert data["statistics"]["boxed_warnings"] >= 6

def test_api_medicine_endpoint():
    res = client.get("/api/medicine/Augmentin 625 Duo")
    assert res.status_code == 200
    data = res.json()
    assert "Amoxicillin" in data["generic_name"]
    assert data["indian_brand_profile"]["savings_percentage"] is not None
    assert len(data["allergy_risks"]) >= 1

def test_api_check_allergy_endpoint():
    payload = {
        "allergies": ["Penicillin"],
        "medicines": ["Augmentin 625 Duo"]
    }
    res = client.post("/api/check-allergy", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["allergy_clash_detected"] is True
    assert len(data["alerts"]) >= 1
    assert data["alerts"][0]["severity"] == "AVOID"

def test_api_check_interaction_endpoint():
    payload = {"medicines": ["Combiflam", "Telma 40"]}
    res = client.post("/api/check-interaction", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["clash_detected"] is True
    assert len(data["interactions"]) >= 1

def test_api_predict_adr_endpoint():
    payload = {
        "age": 68,
        "gender": "male",
        "renal_impairment": 1,
        "conditions": ["Hypertension"],
        "medicines": ["Combiflam", "Telma 40"]
    }
    res = client.post("/api/predict-adr", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "risk_assessment" in data
    assert data["risk_assessment"]["risk_score_percentage"] > 50

def test_api_indian_brands_endpoint():
    res = client.get("/api/indian-brands?q=dolo")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    assert data["brands"][0]["brand_name"] == "Dolo 650"
    assert data["brands"][0]["effective_date"] is not None

def test_multi_ingredient_brand_canonical_decomposition_and_ddi():
    service = MedicineService()
    # 1. Pan-D (Pantoprazole + Domperidone) combined with Azithral 500 (Azithromycin)
    interactions = service.check_interactions(["Pan-D", "Azithral 500"])
    assert len(interactions) >= 1
    clash = interactions[0]
    assert clash["drug_a_id"] == "azi-001"
    assert clash["drug_b_id"] == "dom-001"
    assert "QTc Interval" in clash["title"]
    assert clash["evidence_level"] == "Established"
    assert clash["last_verified"] == "2026-03-15"

    # 2. Combiflam (Ibuprofen + Paracetamol) combined with Telma 40 (Telmisartan)
    combiflam_clash = service.check_interactions(["Combiflam", "Telma 40"])
    assert len(combiflam_clash) >= 1
    assert any(c["drug_b_id"] == "tel-001" for c in combiflam_clash)

def test_allergy_false_positive_immunity():
    service = MedicineService()
    # Ensure NSAID allergy strictly flags NSAIDs, and NEVER falsely flags non-NSAIDs whose descriptions mention NSAIDs
    non_nsaids = ["Metformin", "Pan-D", "Pantoprazole", "Amlodipine", "Telmisartan", "Paracetamol", "Amoxicillin"]
    alerts = service.check_allergies(["NSAID", "Aspirin"], non_nsaids)
    assert len(alerts) == 0, f"False positive allergy detection triggered: {alerts}"

    # Ensure Penicillin allergy strictly flags Penicillins, and NEVER falsely flags non-penicillins
    non_penicillins = ["Ibuprofen", "Combiflam", "Metformin", "Atorvastatin", "Telmisartan"]
    pen_alerts = service.check_allergies(["Penicillin"], non_penicillins)
    assert len(pen_alerts) == 0, f"False positive allergy detection triggered: {pen_alerts}"

def test_provenance_and_explainability_contract():
    service = MedicineService()
    interactions = service.check_interactions(["Ibuprofen", "Telmisartan"])
    assert len(interactions) >= 1
    rule = interactions[0]
    # Verify provenance explainability contract
    assert "mechanism" in rule and len(rule["mechanism"]) > 10
    assert rule["evidence_level"] in ["Established", "Moderate Evidence", "Theoretical"]
    assert rule["source"] is not None
    assert rule["source_url"] is not None
    assert rule["last_verified"] == "2026-03-15"

