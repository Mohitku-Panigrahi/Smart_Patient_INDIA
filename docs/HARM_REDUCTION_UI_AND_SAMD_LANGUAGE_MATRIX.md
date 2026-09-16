# Harm-Reduction UI Language Guide & CDSCO SaMD Output Decision Matrix
**Standard Operating Procedure: Safe Clinical Communication & Regulatory Demarcation**  
*Document Version: 1.0.0 • Applicable Framework: CDSCO MDR 2017 / ISO 14971 / DPDP Act 2023*

---

## 1. Executive Summary & Clinical Philosophy

Software that evaluates multi-drug polypharmacy and biological cascades exists in a critical clinical tension:
1. **Under-warning** causes preventable adverse drug reactions (ADRs) such as Acute Kidney Injury (AKI) or Rhabdomyolysis.
2. **Over-warning or diagnostic overconfidence** induces **Alert Fatigue** (ignored by clinicians) or **Patient-Initiated Drug Cessation** (a hypertensive patient stops Telmisartan upon reading an AKI alert, triggering fatal hemorrhagic stroke or rebound hypertensive crisis).
3. **Prescriptive diagnostic language** crosses software from **Exempt Health Literacy / Clinical Reference** into **CDSCO Medical Device Rules (MDR) 2017 Class B Software as a Medical Device (SaMD)**.

This document establishes the **Universal Output-Language Decision Matrix** and **Harm-Reduction Phrasing Rules** enforced across Smart Patient India.

---

## 2. Core Harm-Reduction Principles

```
                 ┌────────────────────────────────────────────────┐
                 │          PATIENT SAFETY FIRST DIRECTIVE        │
                 ├────────────────────────────────────────────────┤
                 │ 1. Differentiate Symptomatic vs. Vital Drugs    │
                 │ 2. Prohibit Unilateral Cessation of Vital Rx   │
                 │ 3. Replace False Precision with Categorical Tiers│
                 │ 4. Frame Guidance as Physician Consultation CTA│
                 └────────────────────────────────────────────────┘
```

### Principle 1: The "Dispensable vs. Vital" Target Rule
- **Dispensable / Symptomatic Agents**: NSAIDs (Ibuprofen, Combiflam, Diclofenac), sedating antihistamines, OTC antacids. These may be safely paused, tapered, or replaced with non-harming alternatives (e.g., Paracetamol, topical gels) while awaiting medical review.
- **Vital Chronic Pharmacotherapy**: Renin-angiotensin inhibitors (ACEi/ARBs), diuretics in heart failure, oral antidiabetics, insulin, antiepileptics, antiplatelets, beta-blockers, psychiatric medications. **Never instruct the patient to pause or stop these.** Abrupt cessation carries acute rebound mortality.

### Principle 2: Elimination of Diagnostic Point Estimates
- **Forbidden**: Outputting synthetic precision values such as `"Projected 520ms QTc"`, `"86% AKI probability"`, or `"Definitive Rhabdomyolysis Diagnosis"`.
- **Enforced**: Outputting peer-reviewed risk strata (`LOW / MONITOR`, `MODERATE / CAUTION`, `HIGH / AVOID`) paired with physiological rationale and diagnostic monitoring directives (e.g., *"Baseline 12-lead ECG and serum electrolyte panel recommended"*).

### Principle 3: Universal Harm-Reduction Anchor
Every high-hazard alert banner must display the unmissable harm-reduction guardrail:
> **⚠️ MANDATORY HARM-REDUCTION DIRECTIVE**: Do NOT stop or alter any prescribed chronic medicine (blood pressure, diabetes, heart, epilepsy, or psychiatric) on your own. Abrupt cessation carries severe rebound risk. Discuss all alerts with your prescribing physician.

---

## 3. Exempt vs. SaMD Output-Language Decision Matrix

| Clinical Scenario | ❌ Dangerous / SaMD Class B Phrasing (Do Not Use) | ✅ CDSCO Exempt Health Literacy Phrasing (Enforced in Code) | Harm Reduction & Clinical Rationale |
|---|---|---|---|
| **The "Triple Whammy" (NSAID + ARB/ACEi + Diuretic)** | *"Emergency: Renal collapse in progress (88% AKI risk). Stop Telma and Lasix immediately."* | **"🚨 Triple Whammy Hemodynamic Risk: Glomerular filtration pressure collapses under this triad.<br><br>Clinical Harm-Reduction Advisory: Discuss with your doctor immediately whether the NSAID (painkiller) can be paused or replaced with Paracetamol. DO NOT stop blood pressure medications (Telma) or diuretics (Lasix) on your own; abrupt stoppage can trigger severe hypertensive crisis or pulmonary edema."** | Directs pause strictly to the dispensable analgesic. Protects the patient from cardiovascular rebound collapse. |
| **Hepatic CYP3A4 Blockade (Clarithromycin + Atorvastatin)** | *"Diagnosis: Toxic Atorvastatin surge. Stop statin now. Switch to Rosuvastatin 10mg."* | **"⚠️ Metabolic Clearance Blockade (CYP3A4 Inhibition): Clarithromycin blocks the liver breakdown of Atorvastatin, multiplying systemic statin exposure 4x–8x.<br><br>Clinical Actionability: When prescribing antibiotics, discuss with your doctor whether to temporarily hold Atorvastatin for the 7-day course or discuss a non-CYP3A4 alternative (such as Rosuvastatin). Report unexplained muscle aches or tea-colored urine."** | Avoids unauthorized prescription of specific dosages; presents evidence-based pathways for the physician to evaluate. |
| **Additive Cardiac Repolarization (Domperidone + Azithromycin)** | *"Cardiac Emergency: Projected QTc interval 515ms. High risk of fatal Torsades de Pointes."* | **"⚡ Additive Cardiac Repolarization Delay & Arrhythmia Hazard: Concurrent hERG channel blockade delay ventricular repolarization.<br><br>Clinical Advisory: Baseline 12-lead ECG is recommended prior to co-administration. Correct serum potassium and magnesium deficits. Inquire with your physician regarding non-QTc prolonging antiemetics or antibiotics."** | Replaces fabricated milliseconds with recommended clinical electrophysiology monitoring (12-lead ECG). |
| **Compounded Bleeding Index (Warfarin + Aspirin + Combiflam)** | *"Bleed Score 92%: Severe internal hemorrhage imminent. Discontinue blood thinners."* | **"🩸 Compounded Systemic & Gastrointestinal Hemorrhage Hazard (Bleed Score: 5+ [Critical]): Coagulation factor inhibition combined with platelet COX-1 blockade and gastric mucosal injury.<br><br>Clinical Advisory: Do NOT stop prescribed anticoagulants without cardiologist oversight. Inquire whether NSAIDs can be eliminated and whether gastroprotection (PPI like Pantoprazole) is indicated."** | Prevents rebound thromboembolism / prosthetic valve thrombosis while curbing ulcerogenic NSAID misuse. |
| **Ayurvedic Bio-Enhancer Surge (Trikatu / Piperine + Metformin)** | *"Hypoglycemic crash imminent. Reduce Metformin dose by 50% immediately."* | **"🌿 Bio-Enhancer Surge (Piperine + Metformin): Piperine in Trikatu suppresses intestinal P-gp efflux, potentially doubling systemic Metformin absorption.<br><br>Clinical Advisory: Standardized extracts have far greater potency than culinary pepper. Separate ingestion by at least 4 hours. Monitor blood glucose closely and report dizzy spells or diaphoresis to your diabetologist."** | Distinguishes food spices from therapeutic extracts; prevents unmonitored insulin/metformin dose tinkering. |
| **Cumulative ACB Scale (Geriatric Delirium & Fall Risk)** | *"Patient has severe Anticholinergic Delirium. Stop Cetirizine and Alprazolam."* | **"🚨 Critical Geriatric Anticholinergic Burden (ACB ≥ 3): High cumulative central muscarinic blockade in older adults predisposing to confusion, memory lapses, and falls.<br><br>Clinical Advisory: Review total anticholinergic load with a geriatrician for potential deprescribing or switching to non-anticholinergic alternatives. Maintain hydration."** | Frames deprescribing as a deliberate geriatric review rather than abrupt patient-initiated withdrawal. |

---

## 4. UI/UX Typography & Color Grammar

To ensure visual contrast without anxiety-inducing panic:

1. **Color Codes**:
   - `CRITICAL / AVOID`: Crimson border with subtle rose tint (`#fef2f2` / border `#fca5a5`), dark text (`#991b1b`). Never flashing strobe lights.
   - `CAUTION / ELEVATED`: Amber border (`#fef3c7` / border `#fcd34d`), text (`#92400e`).
   - `SAFE / MONITOR`: Mint/emerald background (`#f0fdf4` / border `#86efac`), text (`#166534`).

2. **Typography Hierarchy**:
   - Alert Title: Bold, 14–16px, icon prefixed (`🚨`, `⚠️`, `🌿`).
   - Mechanism: 12px monospace or crisp sans-serif, high signal (`🔬 Mechanism:`).
   - Clinical Actionability: 12px semi-bold, clearly separated into **"What to discuss with your doctor"** and **"What NOT to stop on your own"**.
   - Provenance Footer: 10px muted monospace displaying Authority Source (`CDSCO`, `FDA DailyMed`, `API AYUSH`, `CredibleMeds`) and Verification Date.

---

## 5. Rural & Telemedicine ASHA / Community Health Worker Guidelines

When utilized by frontline healthcare workers (ASHAs, ANMs, pharmacists) via offline PWA:
- **Triage Decision**:
  - `AVOID / CRITICAL`: Refer patient to Primary Health Centre (PHC) Medical Officer within 24 hours. Instruct patient to take all medicine strips and bottles with them.
  - `CAUTION`: Monitor blood pressure, capillary glucose, or fluid intake; follow up at next routine visit.
  - `HERB-DRUG CLASH`: Counsel patient to disclose all traditional preparations (Churna, Vati, Kadha) to the PHC doctor.
