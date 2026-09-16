# Smart Patient India 🇮🇳 (SMASP India v2.2)

> **AI-Powered Drug Safety, Jan Aushadhi Generic Intelligence & Adverse Reaction Prediction for India's Pharmaceutical Landscape.**

[![Jest Test Suite](https://img.shields.io/badge/tests-76%20passed-brightgreen.svg)](tests/)
[![Coverage](https://img.shields.io/badge/coverage->93%25-success.svg)](jest.config.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PvPI Calibrated](https://img.shields.io/badge/Model-PvPI%20%2F%20FAERS%20Trained-purple.svg)](scripts/train_adr_model.py)

---

## 🎯 Why India Needs This

Western drug safety checkers (DrugBank, Medscape, UpToDate) were engineered for North American and European healthcare systems. They completely fail Indian patients:

1. **Branded Generic Jungle**: Over 80% of drugs in India are prescribed by brand names (**Dolo 650**, **Augmentin 625 Duo**, **Glycomet**, **Pan-D**, **Combiflam**, **Telma 40**) rather than International Nonproprietary Names (INN). Patients cannot navigate active compounds without clinical guidance.
2. **Economic Disparity & Jan Aushadhi Gap**: Millions of Indian families face catastrophic health expenditures while equivalent Pradhan Mantri Jan Aushadhi generics sell for **70% to 90% less**.
3. **Unmonitored Ayurveda–Allopathy Polypharmacy**: Over 65% of Indian households concurrently consume traditional Ayurvedic remedies (**Ashwagandha, Giloy, Guggulu, Triphala, Tulsi**) alongside modern allopathic medications. These combos cause unnoticed severe hepatic, renal, and hypoglycemic emergencies.
4. **Offline-First Connectivity**: Millions of users in Tier-2/3 cities and rural India face intermittent internet connectivity; safety engines must execute **100% client-side with zero latency**.

---

## 🧠 What's Unique & Defensible

### 1. 🇮🇳 Indian Formulary & Jan Aushadhi Mapping
- Maps top Indian brand prescriptions to verified active salts, CDSCO schedules (Schedule H, H1, G, OTC), and manufacturers.
- Directly cross-references **Pradhan Mantri Bharatiya Janaushadhi Pariyojana (PMBJP)** equivalents, showing live price differentials and savings percentages.

### 2. 🌿 Ayurveda–Allopathy Herb-Drug Interaction Matrix (AHDI)
- Clinically referenced interaction matrix between popular classical Ayurvedic herbs and major allopathic drug classes:
  - **Ashwagandha + Benzodiazepines/Sedatives**: Compound GABAergic central nervous system depression $\rightarrow$ profound sedation & fall risk (**🛑 AVOID**).
  - **Giloy / Guduchi + Metformin / Sulfonylureas**: Compounded severe hypoglycemia risk (**⚠️ CAUTION**).
  - **Guggulu + Blood Thinners (Ecosprin, Warfarin)**: Antiplatelet synergy $\rightarrow$ systemic hemorrhage risk (**🛑 AVOID**).
  - **Mulethi (Licorice) + Antihypertensives**: Pseudo-hyperaldosteronism & potassium depletion (**🛑 AVOID**).
  - **Shankhpushpi + Antiepileptics (Phenytoin)**: Bioavailability collapse $\rightarrow$ breakthrough seizures (**🛑 AVOID**).
- Dual-language clinical advice with native **हिन्दी (Hindi)** warnings.

### 3. ⚡ Predictive Adverse Drug Reaction (ADR) ML Model
- Rather than static textbook rules, employs a multi-output probabilistic predictive engine calibrated on **Indian Pharmacovigilance Program (PvPI)** and **FDA FAERS** epidemiological odds ratios.
- **Input**: Age, Sex, Renal impairment (eGFR), Hepatic function, Comorbidities (Hypertension, Diabetes, CKD, Ulcers, CVD), Multi-drug regimen, and Ayurvedic formulations.
- **Output**:
  - Probability Score: $P(\text{ADR} \mid X) \in [0.00, 1.00]$ (e.g. `86% HIGH HAZARD`).
  - Organ-System Hazards: Acute Kidney Injury (AKI), Hepatotoxicity, GI Bleeding, Cardiac Arrhythmia (QTc), Severe Hypoglycemia.
  - **SHAP Local Interpretability**: Deconstructs exact positive and negative drivers (e.g. `+1.65: NSAID + ACE/ARB synergism`, `+1.85: Metformin in renal impairment`).
  - Actionable clinical substitutions.

---

## 🏗️ Architecture & Technology Stack

```
Smart_Patient-main/
├── backend/
│   ├── api/
│   │   └── main.py              # FastAPI REST endpoints & Swagger documentation
│   ├── data/
│   │   └── medicines.db         # Local-first relational SQLite clinical database
│   └── services/
│       └── medicine_service.py  # Brand resolver, interaction checker & ML ADR service
├── data_pipeline/
│   ├── build_database.py        # CLI pipeline populating medicines.db
│   ├── normalize_drugs.py       # Clinical entity resolver & brand synonym matcher
│   ├── rxnorm_client.py         # NLM RxNav REST client for RxCUI standardization
│   └── openfda_client.py        # openFDA structured label parser
├── data/
│   ├── adr_model_weights.json   # Exported ML model weights & interaction splines
│   └── medicines.json           # 76+ clinical drug profiles
├── js/
│   ├── data/
│   │   ├── indianPharma.js      # Indian brand to Jan Aushadhi mapping
│   │   ├── ayurvedaAllopathy.js # Herb-Drug interaction matrix (AHDI)
│   │   ├── conditions.js        # Health conditions & allergen definitions
│   │   └── i18n.js              # Multilingual dictionary (EN, HI)
│   ├── engine/
│   │   ├── adrPredictor.js      # Predictive ADR ML Engine with SHAP explainer
│   │   ├── riskEngine.js        # Deterministic contraindication engine
│   │   ├── smaspEngine.js       # O(1) indexed polypharmacy matrix
│   │   └── logger.js            # Production telemetry & error buffering
│   └── app.js                   # Application lifecycle controller
├── scripts/
│   └── train_adr_model.py       # Python training pipeline for ADR model
├── tests/
│   ├── test_backend.py          # Pytest suite for SQLite, Service & FastAPI endpoints
│   └── unit/
│       ├── adrPredictor.test.js
│       ├── ayurvedaAllopathy.test.js
│       ├── indianPharma.test.js
│       ├── riskEngine.test.js
│       ├── smaspEngine.test.js
│       └── logger.test.js
├── index.html                   # Neo-Lux futuristic UI with Tailwind CSS
├── jest.config.js               # Test runner configuration
└── package.json
```

- **Database**: SQLite3 (`medicines.db`) with relational tables for medicines, Indian brands, indications, adverse effects, contraindications, and herb-drug interactions.
- **Backend**: FastAPI with Pydantic validation, providing sub-millisecond local-first responses.
- **Frontend**: Vanilla Modern JavaScript (zero runtime bundle overhead, 100% offline-capable, PWA).
- **Styling**: Tailwind CSS with Neo-Lux futuristic dark mode and glassmorphic elevation.
- **ML / Predictive Modeling**: Python (PvPI / FAERS model calibration & weights export) + zero-dependency client-side tensor/logistic inference runtime.
- **Testing**: Jest (JavaScript frontend) + Pytest (Python backend).

---

## ⚡ FastAPI Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status & database record statistics |
| `GET` | `/api/medicine/{query}` | Query by Indian brand or generic (returns indications, warnings, Jan Aushadhi alternatives) |
| `POST` | `/api/check-interaction` | Evaluate pairwise interactions across allopathic medicines and Ayurvedic herbs |
| `POST` | `/api/predict-adr` | Multi-factorial probabilistic adverse drug reaction risk score with SHAP drivers |
| `GET` | `/api/indian-brands` | Search Indian brand catalog, active salts, and PMBJP cost savings |
| `GET` | `/api/ayurveda/{herb}` | Herb-drug interaction matrix for specific Ayurvedic formulation |

---

## 🧪 Testing & Verification

### 1. Backend Pytest Suite
```bash
python -m pytest tests/test_backend.py -v
```
*(11 tests passing in ~0.35s verifying SQLite queries, brand resolution, DDI rules, and API endpoints)*

### 2. Frontend Jest Suite
```bash
npm test
```
*(6 test suites, 76/76 tests passing)*

### 3. Generate Coverage Report
```bash
npm run test:coverage
```

### Coverage Baseline
- **Statements**: >93%
- **Branches**: >77%
- **Functions**: >96%
- **Lines**: >95%

---

## 🚀 Running Locally

### 1. Start the FastAPI Backend
```bash
uvicorn backend.api.main:app --reload --port 8000
```
Interactive Swagger API documentation available at: `http://localhost:8000/docs`

### 2. Re-run or Seed the Clinical Database
```bash
python data_pipeline/build_database.py
```

### 3. Launch Frontend Web App
```bash
python -m http.server 3000
```
Open `http://localhost:3000` in your browser.

---

## ⚖️ Clinical Disclaimer

*Smart Patient India is an educational health literacy and pharmacological awareness tool. It does not provide medical diagnosis, treatment recommendations, or prescriptions. Always consult a registered medical practitioner before altering any drug regimen.*

