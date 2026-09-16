# Clinical Validation Protocol: Smart Patient INDIA (SPI-CVP-2026)
## Empirical Validation of an AI-Assisted Clinical Decision Support & Drug Safety Platform in Indian Healthcare Settings

**Protocol ID:** SPI-VAL-2026-V1  
**Version:** 1.0 (Effective March 2026)  
**Regulatory Framework:** CDSCO Medical Device Rules (MDR 2017), ICMR National Ethical Guidelines for Biomedical & Health Research, GCP (Good Clinical Practice)  
**Target Sites:** Tertiary Healthcare Institutions (AIIMS, CMC Vellore, Manipal Academy of Higher Education)

---

## 1. Study Rationale & Clinical Need
Indian pharmacotherapy faces unique systemic challenges:
1. **The Branded Generic Jungle**: Over 80,000 trade brand formulations sharing overlapping generic salts, leading to accidental duplicate dosing and cross-reactivity.
2. **Unmonitored Polypharmacy with AYUSH Formulations**: Over 65% of chronic disease patients in India concurrently consume Ayurvedic/herbal preparations alongside allopathic prescriptions without disclosing them to physicians.
3. **Pharmacovigilance Reporting Gap**: The Pharmacovigilance Programme of India (PvPI) captures $<1\%$ of adverse drug events (ADEs) occurring in inpatient and outpatient settings due to high clinical workloads.

Smart Patient INDIA (v4) integrates canonical drug-to-salt resolution, physiological bio-cascade modeling (CYP450 competition, Triple Whammy, QTc vector sum, ACB score), and Jan Aushadhi generic mapping. This protocol establishes the methodology to validate its diagnostic sensitivity, specificity, and real-world clinical safety impact.

---

## 2. Study Objectives & Endpoints

### 2.1 Primary Objectives
1. **Diagnostic Sensitivity & Specificity**: Determine the sensitivity and specificity of SPI v4 in detecting clinically significant drug-drug interactions (DDIs), herb-drug interactions (HDIs), and boxed warnings against an expert panel of MD Clinical Pharmacologists as the reference standard.
2. **Harm-Reduction & Duplicate Therapy Detection**: Quantify SPI's accuracy in identifying hidden salt duplication across Indian trade brand substitutions (e.g. Dolo 650 + Combiflam containing duplicate paracetamol).

### 2.2 Secondary Objectives
1. **Alert Fatigue Index (AFI)**: Measure the percentage of clinically actionable alerts versus low-grade non-actionable nuisance alerts.
2. **Economic Benefit Realization**: Compute actual patient out-of-pocket savings through Pradhan Mantri Jan Aushadhi Pariyojana (PMBJP) generic substitution.

### 2.3 Key Performance Metrics
| Metric | Acceptance Criterion | Reference Benchmark |
|---|---|---|
| **DDI Detection Sensitivity** | $\ge 96.0\%$ | UpToDate / Lexicomp consensus |
| **DDI Detection Specificity** | $\ge 92.0\%$ | Clinical Pharmacology Expert Panel |
| **Allergy Cross-Reactivity Sensitivity** | $\ge 98.0\%$ | British National Formulary (BNF) |
| **Allergy False-Positive Rate** | $\le 2.5\%$ | Target: Zero spurious description matches |
| **Triple Whammy Detection Rate** | $100\%$ | Mandatory automated safety trigger |
| **Alert Actionability Ratio** | $\ge 85.0\%$ | Alerts resulting in physician regimen review |

---

## 3. Study Design & Methodology

### Phase I: Multi-Center Retrospective Electronic Health Record (EHR) In Silico Audit
- **Sample Size**: $N = 10,000$ consecutive inpatient discharge summaries and outpatient prescriptions across Cardiology, Nephrology, Internal Medicine, and Oncology departments.
- **Inclusion Criteria**:
  - Prescriptions containing $\ge 2$ allopathic drugs.
  - Patients aged $\ge 18$ years with complete clinical biochemistry (Serum Creatinine/eGFR, Serum Electrolytes, LFTs).
- **Blinded Adjudication Panel**:
  - Three independent MD Pharmacologists and Consultant Physicians blindly review each prescription.
  - Inter-rater agreement evaluated via Cohen's Kappa ($\kappa \ge 0.85$ required).
- **Algorithm Evaluation**:
  - Run SPI v4 Bio-Cascade Engine on historical regimens.
  - Calculate True Positives (TP), False Positives (FP), True Negatives (TN), and False Negatives (FN).

### Phase II: Prospective Observational OPD Safety Shadowing
- **Duration**: 6 Months across 3 tertiary hospital outpatient clinics.
- **Workflow**:
  - Attending physicians enter proposed prescription regimens into SPI v4 in parallel to routine care.
  - The system provides instant bio-cascade analysis, Jan Aushadhi alternative cost delta, and Hindi patient instructions.
  - Physician records:
    1. Agreement with detected interaction/cascade.
    2. Any alteration made to prescription as a result of the alert.
    3. Reason for overriding any alert (to calibrate alert thresholds).

---

## 4. Ethical Considerations & Patient Safety
1. **Non-Interventional In Silico Phase**: Phase I requires Institutional Ethics Committee (IEC) waiver of informed consent per ICMR guidelines for anonymized retrospective data.
2. **Prospective Phase**: Physician retains 100% prescribing autonomy; SPI operates strictly as an assistive second check.
3. **No Direct Unsupervised Discontinuation**: In consumer-facing modes, all `AVOID` alerts enforce the mandatory clinical directive: *"Never abruptly discontinue prescribed medication without physician confirmation."*

---

## 5. Statistical Analysis Plan (SAP)
- Receiver Operating Characteristic (ROC) curve analysis computing Area Under the Curve (AUC) for ADR probability prediction.
- 95% Confidence Intervals (Wilson score interval) for sensitivity, specificity, PPV, and NPV.
- Subgroup stratification by Age ($<65$ vs. $\ge 65$), Renal Function (eGFR $\ge 60$, $30\text{--}59$, $<30$), and AYUSH Polypharmacy status.
