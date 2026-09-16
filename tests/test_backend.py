"""
test_backend.py
---------------
Unit and API integration tests for Smart Patient India's SQLite database,
MedicineService, and FastAPI endpoints.
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
    conn.close()

    assert med_count >= 50
    assert brand_count >= 10

def test_generic_medicine_lookup():
    med = service.get_medicine("Amoxicillin")
    assert med is not None
    assert "Amoxicillin" in med["generic_name"]
    assert len(med["indications"]) > 0
    assert len(med["contraindications"]) > 0

def test_indian_brand_resolution():
    # Test brand name resolution to generic + Jan Aushadhi
    med = service.get_medicine("Dolo 650")
    assert med is not None
    assert "Paracetamol" in med["generic_name"]
    assert med["indian_brand_profile"] is not None
    assert med["indian_brand_profile"]["brand_name"] == "Dolo 650"
    assert "Jan Aushadhi" in med["indian_brand_profile"]["jan_aushadhi_name"] or "Paracetamol" in med["indian_brand_profile"]["jan_aushadhi_name"]
    assert med["indian_brand_profile"]["jan_aushadhi_price_inr"] < med["indian_brand_profile"]["branded_mrp_inr"]

def test_allopathic_interaction_check():
    # Pairwise clash: Ibuprofen + Telmisartan
    clashes = service.check_interactions(["Ibuprofen", "Telmisartan"])
    assert len(clashes) >= 1
    assert clashes[0]["severity"] == "AVOID"
    assert "renal" in clashes[0]["clinical_risk"].lower() or "kidney" in clashes[0]["clinical_risk"].lower()

def test_ayurveda_allopathy_interaction_check():
    # Herb-drug clash: Ashwagandha + Sedative / Antidiabetic
    clashes = service.check_interactions(["Ashwagandha", "Metformin"])
    assert len(clashes) >= 1
    assert any("Ashwagandha" in c.get("herb", "") for c in clashes)

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
    assert data["statistics"]["master_medicines"] >= 50

def test_api_medicine_endpoint():
    res = client.get("/api/medicine/Augmentin 625 Duo")
    assert res.status_code == 200
    data = res.json()
    assert "Amoxicillin" in data["generic_name"]
    assert data["indian_brand_profile"]["savings_percentage"] is not None

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
