"""
main.py
-------
FastAPI REST API Service for Smart Patient India.
Serves clinical medicine profiles, Jan Aushadhi generic mapping,
pairwise DDI checks, and ML Adverse Drug Reaction (ADR) predictions.
"""

from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.services.medicine_service import MedicineService, get_db_connection

app = FastAPI(
    title="Smart Patient India API",
    description="Evidence-Based Clinical Medicine Intelligence, Jan Aushadhi Generic Savings & ML ADR Prediction",
    version="2.2.0"
)

# Enable CORS for local dev and web client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = MedicineService()

# ── Pydantic Request / Response Models ───────────────────────────────────────

class InteractionCheckRequest(BaseModel):
    medicines: List[str] = Field(..., min_length=2, json_schema_extra={"example": ["Combiflam", "Telma 40", "Ashwagandha"]})

class ADRPredictionRequest(BaseModel):
    age: int = Field(65, ge=1, le=110, json_schema_extra={"example": 68})
    gender: str = Field("male", json_schema_extra={"example": "male"})
    renal_impairment: int = Field(0, ge=0, le=2, description="0: normal, 1: mild/mod, 2: severe eGFR < 30")
    hepatic_impairment: int = Field(0, ge=0, le=2, description="0: normal, 1: mild, 2: severe")
    conditions: List[str] = Field(default_factory=list, json_schema_extra={"example": ["Hypertension", "Type 2 Diabetes"]})
    medicines: List[str] = Field(default_factory=list, json_schema_extra={"example": ["Combiflam", "Telma 40", "Glycomet"]})
    ayurveda_herbs: List[str] = Field(default_factory=list, json_schema_extra={"example": ["Ashwagandha"]})

# ── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "Smart Patient India API",
        "version": "2.2.0",
        "status": "operational",
        "docs": "/docs",
        "endpoints": [
            "GET  /api/health",
            "GET  /api/medicine/{query}",
            "POST /api/check-interaction",
            "POST /api/predict-adr",
            "GET  /api/indian-brands"
        ]
    }

@app.get("/api/health")
def health_check():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        med_count = cursor.execute("SELECT COUNT(*) FROM medicines").fetchone()[0]
        brand_count = cursor.execute("SELECT COUNT(*) FROM indian_brands").fetchone()[0]
        ddi_count = cursor.execute("SELECT COUNT(*) FROM drug_interactions").fetchone()[0]
        ayur_count = cursor.execute("SELECT COUNT(*) FROM ayurveda_interactions").fetchone()[0]
        conn.close()

        return {
            "status": "healthy",
            "database": "connected",
            "statistics": {
                "master_medicines": med_count,
                "indian_brands": brand_count,
                "drug_interactions": ddi_count,
                "ayurveda_interactions": ayur_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connectivity failure: {str(e)}")

@app.get("/api/medicine/{query}")
def get_medicine_profile(query: str):
    """
    Looks up a drug by generic compound name or Indian trade brand.
    Automatically resolves Indian brands (e.g. Dolo 650, Augmentin, Pan-D, Combiflam)
    and attaches Jan Aushadhi generic alternatives and price comparisons.
    """
    result = service.get_medicine(query)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Medicine '{query}' not found in database. Check spelling or try active generic name."
        )
    return result

@app.post("/api/check-interaction")
def check_interactions(req: InteractionCheckRequest):
    """
    Evaluates multi-drug prescriptions and Ayurvedic herbal combinations for clinical clashes.
    """
    interactions = service.check_interactions(req.medicines)
    return {
        "input_medicines": req.medicines,
        "clash_detected": len(interactions) > 0,
        "clashes_count": len(interactions),
        "interactions": interactions
    }

@app.post("/api/predict-adr")
def predict_adverse_drug_reaction(req: ADRPredictionRequest):
    """
    Runs trained probabilistic ML model to predict ADR risk score,
    multi-organ hazard projections, and SHAP explainability.
    """
    profile = {
        "age": req.age,
        "gender": req.gender,
        "renal_impairment": req.renal_impairment,
        "hepatic_impairment": req.hepatic_impairment,
        "conditions": req.conditions,
        "medicines": req.medicines,
        "ayurveda_herbs": req.ayurveda_herbs
    }
    prediction = service.predict_adr_risk(profile)
    return {
        "patient_profile": profile,
        "risk_assessment": prediction
    }

@app.get("/api/indian-brands")
def list_indian_brands(q: Optional[str] = None):
    """
    Retrieves Indian Brand Formulary with Jan Aushadhi generic alternatives and savings %.
    """
    all_brands = service.get_all_indian_brands()
    if q:
        query_str = q.strip().lower()
        all_brands = [
            b for b in all_brands
            if query_str in b["brand_name"].lower()
            or query_str in b["generic_name"].lower()
            or query_str in b["composition"].lower()
            or query_str in b["manufacturer"].lower()
        ]
    return {
        "count": len(all_brands),
        "brands": all_brands
    }
