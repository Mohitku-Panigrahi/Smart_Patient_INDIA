"""
main.py
-------
FastAPI REST API Service for Smart Patient India v3.
Serves canonical clinical medicine profiles, Jan Aushadhi generic mapping,
allergy ontology cross-reactivity checks, exact-match pairwise DDI evaluations,
and ML-assisted Adverse Drug Reaction (ADR) risk assessments.
"""

from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.services.medicine_service import MedicineService, get_db_connection

app = FastAPI(
    title="Smart Patient India API",
    description="Evidence-Based Clinical Medicine Intelligence, Jan Aushadhi Generic Savings & ML-Assisted ADR Assessment",
    version="3.0.0"
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

class AllergyCheckRequest(BaseModel):
    allergies: List[str] = Field(..., min_length=1, json_schema_extra={"example": ["Penicillin", "NSAIDs"]})
    medicines: List[str] = Field(..., min_length=1, json_schema_extra={"example": ["Augmentin 625 Duo", "Combiflam"]})

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
        "version": "3.0.0",
        "status": "operational",
        "docs": "/docs",
        "endpoints": [
            "GET  /api/health",
            "GET  /api/medicine/{query}",
            "POST /api/check-interaction",
            "POST /api/check-allergy",
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
        allergy_count = cursor.execute("SELECT COUNT(*) FROM allergy_classes").fetchone()[0]
        boxed_count = cursor.execute("SELECT COUNT(*) FROM boxed_warnings").fetchone()[0]
        ddi_count = cursor.execute("SELECT COUNT(*) FROM drug_interactions").fetchone()[0]
        ayur_count = cursor.execute("SELECT COUNT(*) FROM ayurveda_interactions").fetchone()[0]
        conn.close()

        return {
            "status": "healthy",
            "database": "connected",
            "version": "3.0.0",
            "statistics": {
                "master_medicines": med_count,
                "indian_brands": brand_count,
                "allergy_classes": allergy_count,
                "boxed_warnings": boxed_count,
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
    and attaches Jan Aushadhi generic alternatives, allergy risks, statutory boxed warnings,
    and verified source provenance metadata.
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
    Evaluates multi-drug prescriptions and Ayurvedic herbal combinations for clinical clashes
    using exact canonical drug ID matching and evidence-referenced herb-drug interactions.
    """
    interactions = service.check_interactions(req.medicines)
    return {
        "input_medicines": req.medicines,
        "clash_detected": len(interactions) > 0,
        "clashes_count": len(interactions),
        "interactions": interactions
    }

@app.post("/api/check-allergy")
def check_allergy(req: AllergyCheckRequest):
    """
    Clinical allergy evaluation distinguishing IgE-mediated hypersensitivity from adverse effects.
    Cross-checks patient reported allergies against drug classes and active chemical salts.
    """
    alerts = service.check_allergies(req.allergies, req.medicines)
    return {
        "reported_allergies": req.allergies,
        "input_medicines": req.medicines,
        "allergy_clash_detected": len(alerts) > 0,
        "allergy_clashes_count": len(alerts),
        "alerts": alerts
    }

@app.post("/api/predict-adr")
def predict_adverse_drug_reaction(req: ADRPredictionRequest):
    """
    Runs trained probabilistic ML model to provide an ML-assisted ADR risk assessment,
    multi-organ hazard projections, and SHAP explainability.
    Positioned strictly as supporting clinical decision support signal.
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
    Retrieves Indian Brand Formulary with Jan Aushadhi generic alternatives,
    effective date, and price comparison data.
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
