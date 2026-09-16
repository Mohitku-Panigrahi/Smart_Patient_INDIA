"""
build_database.py
-----------------
Smart Patient INDIA v3 — Canonical Clinical Database Builder & Snapshot Exporter.
Initializes and populates the local-first SQLite clinical medicine database (medicines.db).
Establishes SQLite as the single authoritative source of truth, incorporating:
  - Clinical allergy classes ontology & cross-reactivity risks
  - Canonical medicine ID pairwise DDI checks (eliminating brittle LIKE queries)
  - Statutory FDA & CDSCO Boxed Warnings
  - Time-sensitive Indian brand pricing & PMBJP Jan Aushadhi provenance
  - Ayurveda-Allopathy interaction matrix with evidence levels
  - Automated frontend snapshot export to data/medicines.json
"""

import json
import os
import sqlite3
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "backend", "data")
DB_PATH = os.path.join(DATA_DIR, "medicines.db")

SCHEMA_DDL = """
-- 1. Master Medicines Table (Standardized Canonical Entities)
CREATE TABLE IF NOT EXISTS medicines (
    id TEXT PRIMARY KEY,
    generic_name TEXT NOT NULL UNIQUE,
    normalized_name TEXT NOT NULL,
    category TEXT,
    dosage_forms TEXT,       -- JSON array: ["Tablet", "Syrup"]
    mechanism_of_action TEXT,
    plain_english_summary TEXT,
    confidence_grade TEXT DEFAULT 'A',
    source TEXT DEFAULT 'FDA / DailyMed / NFI',
    source_url TEXT,
    last_verified TEXT DEFAULT '2026-03-15'
);

-- 2. Indian Trade Brand & Jan Aushadhi Mapping Table
CREATE TABLE IF NOT EXISTS indian_brands (
    id TEXT PRIMARY KEY,
    brand_name TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    canonical_medicine_id TEXT,
    manufacturer TEXT,
    composition TEXT NOT NULL,
    cdsco_schedule TEXT,     -- Schedule H, H1, G, OTC
    branded_mrp_inr REAL,
    jan_aushadhi_name TEXT,
    jan_aushadhi_price_inr REAL,
    savings_percentage TEXT,
    plain_hindi_summary TEXT,
    safety_warning TEXT,
    source TEXT DEFAULT 'PMBJP Jan Aushadhi / NPPA',
    source_url TEXT DEFAULT 'https://janaushadhi.gov.in',
    effective_date TEXT DEFAULT '2026-01-01',
    last_verified TEXT DEFAULT '2026-03-15',
    FOREIGN KEY(generic_name) REFERENCES medicines(generic_name),
    FOREIGN KEY(canonical_medicine_id) REFERENCES medicines(id)
);

-- 3. Allergy Classes Ontology
CREATE TABLE IF NOT EXISTS allergy_classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_class TEXT,
    description TEXT,
    common_manifestations TEXT,
    synonyms TEXT
);

-- 4. Medicine-to-Allergy Class Cross-Reactivity Risk
CREATE TABLE IF NOT EXISTS medicine_allergy_risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id TEXT NOT NULL,
    allergy_class_id TEXT NOT NULL,
    cross_reactivity_level TEXT NOT NULL, -- Direct Compound, High Cross-Reactivity, Moderate Cross-Reactivity
    hypersensitivity_warning TEXT NOT NULL,
    severity TEXT NOT NULL,               -- AVOID, CAUTION
    source TEXT DEFAULT 'AAAAI Practice Parameters / FDA SPL',
    source_url TEXT,
    last_verified TEXT DEFAULT '2026-03-15',
    FOREIGN KEY(medicine_id) REFERENCES medicines(id),
    FOREIGN KEY(allergy_class_id) REFERENCES allergy_classes(id)
);

-- 5. Indications (Therapeutic Uses)
CREATE TABLE IF NOT EXISTS indications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id TEXT NOT NULL,
    indication TEXT NOT NULL,
    source TEXT,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id)
);

-- 6. Adverse Effects & Organ Hazards
CREATE TABLE IF NOT EXISTS adverse_effects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id TEXT NOT NULL,
    reaction TEXT NOT NULL,
    frequency TEXT DEFAULT 'Common',
    organ_system TEXT,
    source TEXT,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id)
);

-- 7. Contraindications & Health Condition Warnings
CREATE TABLE IF NOT EXISTS contraindications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id TEXT NOT NULL,
    condition TEXT NOT NULL,
    severity TEXT NOT NULL,  -- AVOID, CAUTION
    why_avoid TEXT,
    source TEXT,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id)
);

-- 8. Pairwise Drug-Drug Interactions (Canonical ID-based exact matching)
CREATE TABLE IF NOT EXISTS drug_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drug_a_id TEXT NOT NULL,
    drug_b_id TEXT NOT NULL,
    drug_a TEXT NOT NULL,
    drug_b TEXT NOT NULL,
    severity TEXT NOT NULL,  -- AVOID, CAUTION, SAFE
    title TEXT NOT NULL,
    mechanism TEXT,
    clinical_risk TEXT,
    evidence_level TEXT DEFAULT 'Established', -- Established, Moderate Evidence, Theoretical
    source TEXT,
    source_url TEXT,
    last_verified TEXT DEFAULT '2026-03-15',
    FOREIGN KEY(drug_a_id) REFERENCES medicines(id),
    FOREIGN KEY(drug_b_id) REFERENCES medicines(id)
);

-- 9. Ayurveda–Allopathy Herb-Drug Interaction Matrix (AHDI)
CREATE TABLE IF NOT EXISTS ayurveda_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    herb_name TEXT NOT NULL,
    allopathy_group TEXT NOT NULL,
    severity TEXT NOT NULL,  -- AVOID, CAUTION
    title TEXT NOT NULL,
    mechanism TEXT,
    clinical_risk TEXT,
    hindi_warning TEXT,
    evidence_level TEXT DEFAULT 'Moderate Evidence', -- Established, Moderate Evidence, Theoretical
    source TEXT DEFAULT 'Ayush Research Portal / NCCIH',
    last_verified TEXT DEFAULT '2026-03-15'
);

-- 10. Structured Regulatory & Boxed Warnings (FDA / CDSCO)
CREATE TABLE IF NOT EXISTS boxed_warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id TEXT NOT NULL,
    warning_type TEXT NOT NULL,        -- BLACK_BOX, CDSCO_STATUTORY
    severity TEXT NOT NULL,            -- CRITICAL, HIGH
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT NOT NULL,
    source_url TEXT,
    last_verified TEXT DEFAULT '2026-03-15',
    FOREIGN KEY(medicine_id) REFERENCES medicines(id)
);

-- Indices for rapid, deterministic querying
CREATE INDEX IF NOT EXISTS idx_med_generic ON medicines(generic_name);
CREATE INDEX IF NOT EXISTS idx_med_norm ON medicines(normalized_name);
CREATE INDEX IF NOT EXISTS idx_brand_name ON indian_brands(brand_name);
CREATE INDEX IF NOT EXISTS idx_brand_generic ON indian_brands(generic_name);
CREATE INDEX IF NOT EXISTS idx_indications_med ON indications(medicine_id);
CREATE INDEX IF NOT EXISTS idx_adverse_med ON adverse_effects(medicine_id);
CREATE INDEX IF NOT EXISTS idx_contra_med ON contraindications(medicine_id);
CREATE INDEX IF NOT EXISTS idx_ddi_ids ON drug_interactions(drug_a_id, drug_b_id);
CREATE INDEX IF NOT EXISTS idx_ayur_herb ON ayurveda_interactions(herb_name);
CREATE INDEX IF NOT EXISTS idx_boxed_med ON boxed_warnings(medicine_id);
CREATE INDEX IF NOT EXISTS idx_allergy_med ON medicine_allergy_risks(medicine_id);
"""

# Additional master drugs specifically prominent in Indian healthcare
INDIAN_GENERIC_EXTENSIONS = [
    {
        "id": "met-001",
        "genericName": "Metformin",
        "brandNames": ["Glycomet", "Glucophage", "Obimet"],
        "category": "Antidiabetic",
        "plainEnglishSummary": "The gold-standard first-line medicine for Type 2 diabetes. Lowers blood sugar by reducing liver glucose production and improving insulin sensitivity.",
        "commonUses": ["Type 2 Diabetes", "Prediabetes", "PCOS"],
        "calmWarnings": [
            {"level": "avoid", "title": "Severe Kidney Disease", "plainEnglishWhy": "Metformin is eliminated by the kidneys. If kidney function (eGFR < 30) declines, it accumulates and triggers life-threatening lactic acidosis."},
            {"level": "caution", "title": "Take with Meals", "plainEnglishWhy": "Taking it with food substantially reduces nausea, stomach cramps, and diarrhea."}
        ],
        "commonSideEffects": ["Nausea", "Diarrhea", "Stomach upset", "Metallic taste"],
        "confidenceGrade": "A",
        "source": "FDA / CDSCO / National Formulary of India",
        "source_url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=metformin"
    },
    {
        "id": "tel-001",
        "genericName": "Telmisartan",
        "brandNames": ["Telma", "Micardis", "Telpres"],
        "category": "Blood Pressure / Heart",
        "plainEnglishSummary": "An Angiotensin Receptor Blocker (ARB) that relaxes blood vessels, significantly lowering blood pressure and protecting kidney and heart function.",
        "commonUses": ["Hypertension (High Blood Pressure)", "Cardiovascular Risk Reduction", "Diabetic Kidney Disease"],
        "calmWarnings": [
            {"level": "avoid", "title": "Pregnancy (Black Box)", "plainEnglishWhy": "Directly toxic to developing fetal kidneys and lungs. Discontinue immediately upon pregnancy."},
            {"level": "caution", "title": "Potassium Monitoring", "plainEnglishWhy": "Can raise blood potassium levels. Avoid potassium supplements or potassium-rich salt substitutes without medical advice."}
        ],
        "commonSideEffects": ["Dizziness", "Back pain", "Sinus congestion"],
        "confidenceGrade": "A",
        "source": "FDA / CDSCO",
        "source_url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=telmisartan"
    },
    {
        "id": "aml-001",
        "genericName": "Amlodipine",
        "brandNames": ["Amlong", "Norvasc", "Stamlo"],
        "category": "Blood Pressure / Heart",
        "plainEnglishSummary": "A calcium channel blocker that relaxes the smooth muscle walls of arteries, allowing blood to flow more easily.",
        "commonUses": ["Hypertension", "Angina (Chest pain)", "Coronary Artery Disease"],
        "calmWarnings": [
            {"level": "caution", "title": "Ankle Swelling (Pedal Edema)", "plainEnglishWhy": "Can cause harmless fluid buildup in feet and ankles. Elevate feet when resting."}
        ],
        "commonSideEffects": ["Swelling in ankles/feet", "Flushing", "Fatigue", "Dizziness"],
        "confidenceGrade": "A",
        "source": "FDA / CDSCO",
        "source_url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=amlodipine"
    },
    {
        "id": "ato-001",
        "genericName": "Atorvastatin",
        "brandNames": ["Atorva", "Lipitor", "Storvas"],
        "category": "Cholesterol / Heart",
        "plainEnglishSummary": "A statin that blocks the liver enzyme responsible for cholesterol synthesis, dramatically reducing LDL ('bad') cholesterol and stroke risk.",
        "commonUses": ["High Cholesterol", "Heart Attack Prevention", "Stroke Prevention"],
        "calmWarnings": [
            {"level": "avoid", "title": "Active Liver Disease", "plainEnglishWhy": "Contraindicated in acute liver impairment or unexplained transaminase elevations."},
            {"level": "caution", "title": "Muscle Pain Warning", "plainEnglishWhy": "Report unexplained muscle tenderness, weakness, or brown urine immediately."}
        ],
        "commonSideEffects": ["Mild muscle aches", "Joint pain", "Diarrhea", "Headache"],
        "confidenceGrade": "A",
        "source": "FDA / CDSCO",
        "source_url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=atorvastatin"
    },
    {
        "id": "dom-001",
        "genericName": "Domperidone",
        "brandNames": ["Motilium", "Domstal", "Vomidom"],
        "category": "Stomach / GI",
        "plainEnglishSummary": "A peripheral dopamine antagonist that promotes gastric emptying and treats nausea, vomiting, and acid fullness.",
        "commonUses": ["Nausea and Vomiting", "Gastroparesis", "Acid Fullness / Dyspepsia"],
        "calmWarnings": [
            {"level": "avoid", "title": "Cardiac Arrhythmia / QTc Prolongation", "plainEnglishWhy": "Can prolong the cardiac QT interval, especially when combined with macrolides or in patients over 60."}
        ],
        "commonSideEffects": ["Dry mouth", "Headache", "Mild cramps"],
        "confidenceGrade": "B",
        "source": "CDSCO / MHRA Drug Safety Alert",
        "source_url": "https://cdsco.gov.in"
    },
    {
        "id": "mon-001",
        "genericName": "Montelukast",
        "brandNames": ["Singulair", "Montair", "Romilast"],
        "category": "Allergy / Cold",
        "plainEnglishSummary": "A leukotriene receptor antagonist that reduces airway constriction, mucus secretion, and allergy inflammation.",
        "commonUses": ["Asthma Maintenance", "Allergic Rhinitis", "Exercise-Induced Bronchoconstriction"],
        "calmWarnings": [
            {"level": "avoid", "title": "Neuropsychiatric Changes (Black Box)", "plainEnglishWhy": "Can trigger sleep disturbances, vivid dreams, severe depression, or suicidal ideation. Stop if mood changes occur."}
        ],
        "commonSideEffects": ["Headache", "Stomach pain", "Restlessness"],
        "confidenceGrade": "A",
        "source": "FDA Boxed Warning / CDSCO",
        "source_url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=montelukast"
    },
    {
        "id": "lev-002",
        "genericName": "Levocetirizine",
        "brandNames": ["Xyzal", "Vozet", "L-Hist"],
        "category": "Allergy / Cold",
        "plainEnglishSummary": "The active enantiomer of cetirizine. Fast-acting antihistamine for allergic rhinitis, watery eyes, and urticaria.",
        "commonUses": ["Allergic Rhinitis", "Chronic Hives (Urticaria)", "Sneezing and Itching"],
        "calmWarnings": [
            {"level": "caution", "title": "Drowsiness Risk", "plainEnglishWhy": "Less sedating than first-generation antihistamines, but caution advised when driving."}
        ],
        "commonSideEffects": ["Dry mouth", "Mild drowsiness", "Fatigue"],
        "confidenceGrade": "A",
        "source": "FDA / CDSCO",
        "source_url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=levocetirizine"
    },
    {
        "id": "amc-002",
        "genericName": "Amoxicillin and Potassium Clavulanate",
        "brandNames": ["Augmentin 625 Duo", "Clavam 625", "Moxikind-CV"],
        "category": "Antibiotic",
        "plainEnglishSummary": "Broad-spectrum antibacterial combination. Potassium clavulanate inactivates beta-lactamase enzymes, restoring amoxicillin potency against resistant bacteria.",
        "commonUses": ["Bacterial Sinusitis", "Otitis Media", "Community Acquired Pneumonia", "Skin and Soft Tissue Infections"],
        "calmWarnings": [
            {"level": "avoid", "title": "Penicillin Hypersensitivity", "plainEnglishWhy": "Strictly contraindicated in penicillin or beta-lactam allergic patients. Can provoke severe anaphylaxis."},
            {"level": "caution", "title": "GI Distress", "plainEnglishWhy": "Take at the start of a meal to minimize clavulanate-induced diarrhea."}
        ],
        "commonSideEffects": ["Diarrhea", "Nausea", "Vulvovaginal candidiasis"],
        "confidenceGrade": "A",
        "source": "FDA / CDSCO",
        "source_url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=amoxicillin-clavulanate"
    },
    {
        "id": "ibp-001",
        "genericName": "Ibuprofen and Paracetamol",
        "brandNames": ["Combiflam", "Flexon", "Ibugesic Plus"],
        "category": "Pain / Fever",
        "plainEnglishSummary": "Widely prescribed Indian combination tablet pairing peripheral anti-inflammatory ibuprofen with central analgesic paracetamol.",
        "commonUses": ["Acute Dental Pain", "Severe Musculoskeletal Pain", "Post-Traumatic Pain"],
        "calmWarnings": [
            {"level": "avoid", "title": "Gastric Ulcers & Empty Stomach", "plainEnglishWhy": "Never take on an empty stomach. Ibuprofen suppresses protective gastric prostaglandins."},
            {"level": "avoid", "title": "Dengue Fever Contraindication", "plainEnglishWhy": "NSAIDs impair platelet function and severely compound hemorrhagic bleeding risks in suspected dengue."}
        ],
        "commonSideEffects": ["Gastric irritation", "Nausea", "Dizziness"],
        "confidenceGrade": "A",
        "source": "CDSCO / National Formulary of India",
        "source_url": "https://cdsco.gov.in"
    }
]

# Clinical Allergy Classes Ontology
ALLERGY_CLASSES_SEED = [
    ("ALG_PENICILLINS", "Penicillins & Beta-Lactam Antibiotics", "ALG_BETA_LACTAMS", "Penicillins share a beta-lactam core. Cross-reactivity between penicillins is very high (>80%).", "Urticaria, angioedema, bronchospasm, laryngeal edema, anaphylaxis, Stevens-Johnson syndrome.", json.dumps(["penicillin", "penicillins", "amoxicillin", "ampicillin", "beta-lactam", "betalactam", "augmentin", "clavam"])),
    ("ALG_CEPHALOSPORINS", "Cephalosporins", "ALG_BETA_LACTAMS", "Beta-lactam antibiotics. Cross-reactivity with penicillins is ~1-3% with 1st/2nd generation agents.", "Pruritus, maculopapular rash, anaphylactoid reaction.", json.dumps(["cephalosporin", "cephalosporins", "cephalexin", "cefdinir", "ceftriaxone", "cefuroxime"])),
    ("ALG_NSAIDS", "Non-Steroidal Anti-Inflammatory Drugs (NSAIDs) & Salicylates", None, "Non-IgE COX-1 inhibition driven hypersensitivity resulting in cysteinyl leukotriene overproduction.", "Aspirin-exacerbated respiratory disease (AERD), severe bronchospasm, facial angioedema, urticaria.", json.dumps(["nsaid", "nsaids", "aspirin", "salicylate", "salicylates", "ibuprofen", "combiflam", "diclofenac", "naproxen", "brufen"])),
    ("ALG_SULFONAMIDES", "Sulfonamides (Sulfa Antimicrobials)", None, "Arylamine sulfonamides provoke reactive hydroxylamine metabolites and IgE/T-cell mediated SCAR.", "Severe cutaneous adverse reactions (SCAR), toxic epidermal necrolysis (TEN), fever, maculopapular eruptions.", json.dumps(["sulfa", "sulfonamide", "sulfonamides", "bactrim", "septra", "sulfamethoxazole", "celebrex", "celecoxib"])),
    ("ALG_FLUOROQUINOLONES", "Fluoroquinolones", None, "Direct mast cell degranulation via MRGPRX2 receptor or IgE-mediated immediate hypersensitivity.", "Flushing, immediate urticaria, laryngeal edema, anaphylaxis.", json.dumps(["fluoroquinolone", "fluoroquinolones", "quinolone", "cipro", "ciprofloxacin", "levofloxacin", "ciplox"])),
    ("ALG_STATINS", "HMG-CoA Reductase Inhibitors (Statins)", None, "Immune-mediated necrotizing myopathy (IMNM) driven by anti-HMGCR autoantibodies, or drug rash.", "Persistent severe proximal muscle weakness, markedly elevated CK, rash.", json.dumps(["statin", "statins", "atorvastatin", "rosuvastatin", "simvastatin", "atorva", "lipitor"])),
    ("ALG_ACE_INHIBITORS", "ACE Inhibitors & Angiotensin Receptor Blockers", None, "Impaired degradation of bradykinin and substance P leading to localized tissue extravasation.", "Bradykinin-mediated angioedema of face, lips, tongue, or larynx; intestinal angioedema.", json.dumps(["ace inhibitor", "ace inhibitors", "arb", "arbs", "ramipril", "enalapril", "lisinopril", "losartan", "telmisartan", "telma"]))
]

# Medicine-to-Allergy Class Cross-Reactivity Risk
MEDICINE_ALLERGY_RISKS_SEED = [
    ("amo-001", "ALG_PENICILLINS", "Direct Compound", "Contains amoxicillin. Contraindicated in penicillin-allergic patients due to fatal anaphylaxis risk.", "AVOID", "AAAAI Practice Parameters", "https://www.aaaai.org"),
    ("amc-001", "ALG_PENICILLINS", "Direct Compound", "Contains amoxicillin. Absolute contraindication in patients with history of penicillin hypersensitivity or anaphylaxis.", "AVOID", "FDA SPL Label", "https://dailymed.nlm.nih.gov"),
    ("amc-002", "ALG_PENICILLINS", "Direct Compound", "Contains amoxicillin. Absolute contraindication in patients with documented penicillin allergy, hypersensitivity, or anaphylaxis.", "AVOID", "CDSCO Safety Circular", "https://cdsco.gov.in"),
    ("cep-001", "ALG_PENICILLINS", "Moderate Cross-Reactivity", "First-generation cephalosporin. ~2-5% cross-reactivity in patients with severe penicillin anaphylaxis.", "CAUTION", "AAAAI Beta-Lactam Consensus", "https://www.aaaai.org"),
    ("ibu-001", "ALG_NSAIDS", "Direct Compound", "Non-selective COX inhibitor. Strictly avoid in aspirin-sensitive asthmatics or NSAID urticaria.", "AVOID", "FDA SPL Label", "https://dailymed.nlm.nih.gov"),
    ("ibp-001", "ALG_NSAIDS", "Direct Compound", "Combiflam contains ibuprofen 400mg. Life-threatening bronchospasm risk in NSAID-sensitive patients.", "AVOID", "CDSCO Safety Notice", "https://cdsco.gov.in"),
    ("asp-001", "ALG_NSAIDS", "Direct Compound", "Classic trigger for Samter's Triad (asthma, nasal polyposis, aspirin sensitivity).", "AVOID", "FDA SPL Label", "https://dailymed.nlm.nih.gov"),
    ("dic-001", "ALG_NSAIDS", "Direct Compound", "Potent COX inhibitor. Contraindicated in patients experiencing asthma, hives, or allergy from NSAIDs.", "AVOID", "FDA SPL Label", "https://dailymed.nlm.nih.gov"),
    ("nap-001", "ALG_NSAIDS", "Direct Compound", "Cross-reactive with all traditional NSAIDs. Avoid in aspirin-allergic patients.", "AVOID", "FDA SPL Label", "https://dailymed.nlm.nih.gov"),
    ("cel-001", "ALG_SULFONAMIDES", "Direct Compound", "Celecoxib contains a sulfonamide moiety. Contraindicated in patients with documented sulfa allergy.", "AVOID", "FDA SPL Label", "https://dailymed.nlm.nih.gov"),
    ("tri-001", "ALG_SULFONAMIDES", "Direct Compound", "Sulfamethoxazole is an arylamine sulfa. High risk of severe cutaneous adverse reactions (SCAR/TEN).", "AVOID", "FDA SPL Label", "https://dailymed.nlm.nih.gov"),
    ("cip-001", "ALG_FLUOROQUINOLONES", "Direct Compound", "Contraindicated in patients with history of fluoroquinolone hypersensitivity.", "AVOID", "FDA SPL Label", "https://dailymed.nlm.nih.gov"),
    ("ato-001", "ALG_STATINS", "Direct Compound", "Contraindicated in patients with statin-associated autoimmune necrotizing myopathy.", "AVOID", "FDA SPL Label", "https://dailymed.nlm.nih.gov"),
    ("tel-001", "ALG_ACE_INHIBITORS", "Moderate Cross-Reactivity", "Patients with prior history of ACE-inhibitor angioedema should use ARBs with extreme caution.", "CAUTION", "ACC/AHA Guidelines", "https://www.ahajournals.org")
]

# Statutory FDA & CDSCO Boxed Warnings
BOXED_WARNINGS_SEED = [
    ("met-001", "BLACK_BOX", "CRITICAL", "Lactic Acidosis (Fatal Metabolic Emergency)", "Metformin-associated lactic acidosis (MALA) is a rare but fatal metabolic complication. Risk factors include renal dysfunction (eGFR < 30 mL/min), iodinated contrast administration, hypoxic states, age >= 65, and excessive acute or chronic alcohol intake. If suspected, discontinue metformin immediately and initiate emergency hemodialysis.", "FDA SPL / CDSCO Boxed Warning", "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=metformin"),
    ("cip-001", "BLACK_BOX", "CRITICAL", "Disabling Tendinitis, Tendon Rupture, Peripheral Neuropathy & CNS Toxicities", "Fluoroquinolones are associated with disabling and potentially irreversible serious adverse reactions occurring together in the same patient, including tendinitis and tendon rupture (most commonly Achilles), peripheral neuropathy, and CNS toxicities. Discontinue immediately at first sign of tendon pain or neuropathic numbness.", "FDA SPL Boxed Warning", "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ciprofloxacin"),
    ("alp-001", "BLACK_BOX", "CRITICAL", "Concomitant Use With Opioids Resulting in Profound Sedation, Respiratory Depression, Coma, and Death", "Concomitant use of benzodiazepines and opioids may result in profound sedation, respiratory depression, coma, and death. Reserve concomitant prescribing for patients for whom alternative treatment options are inadequate. Limit dosages and durations to the minimum required.", "FDA SPL Boxed Warning", "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=alprazolam"),
    ("ibu-001", "BLACK_BOX", "CRITICAL", "Cardiovascular Thrombotic Events & Severe GI Bleeding / Ulceration", "NSAIDs cause an increased risk of serious cardiovascular thrombotic events, including myocardial infarction and stroke, which can be fatal. NSAIDs also cause an increased risk of serious gastrointestinal bleeding, ulceration, and perforation of stomach or intestines, which can occur at any time without warning.", "FDA SPL / CDSCO Boxed Warning", "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ibuprofen"),
    ("dic-001", "BLACK_BOX", "CRITICAL", "Cardiovascular Thrombotic Events & GI Bleeding", "Diclofenac carries the highest cardiovascular risk among traditional non-selective NSAIDs. Contraindicated in the setting of CABG surgery. High risk of fatal gastrointestinal mucosal ulceration and perforation in elderly patients.", "FDA SPL Boxed Warning", "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=diclofenac"),
    ("ibp-001", "BLACK_BOX", "CRITICAL", "Cardiovascular Thrombotic & Gastrointestinal Ulceration Risk", "Ibuprofen component carries statutory black-box warnings for gastrointestinal bleeding, ulceration, perforation, and cardiovascular thrombotic events. Avoid in coronary artery disease and active peptic ulceration.", "CDSCO Statutory Warning", "https://cdsco.gov.in"),
    ("tel-001", "BLACK_BOX", "CRITICAL", "Fetal Toxicity in Pregnancy (CDSCO & FDA Black Box)", "When pregnancy is detected, discontinue Telmisartan as soon as possible. Drugs that act directly on the renin-angiotensin system can cause severe injury and death to the developing fetus, including oligohydramnios, neonatal skull hypoplasia, renal failure, and death.", "FDA SPL / CDSCO Statutory Warning", "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=telmisartan"),
    ("mon-001", "BLACK_BOX", "HIGH", "Serious Neuropsychiatric Events", "Montelukast carries a boxed warning regarding serious neuropsychiatric events including agitation, aggression, depression, sleep disturbances, and suicidal thoughts or behaviors. Healthcare providers should consider benefits and risks before prescribing.", "FDA Drug Safety Communication / CDSCO Notice", "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=montelukast")
]

# Seed dataset for Indian Brands and Jan Aushadhi generics
INDIAN_BRANDS_SEED = [
    ("in-para-dolo", "Dolo 650", "Paracetamol", "para-001", "Micro Labs Ltd.", "Paracetamol 650 mg", "Schedule H", 34.0, "Paracetamol Tablets IP 650mg", 4.5, "83%", "बुखार और बदन दर्द के लिए सबसे ज्यादा ली जाने वाली दवा।", "Excess use causes fatal hepatic necrosis. Verify other cold preparations.", "PMBJP Jan Aushadhi Portal", "https://janaushadhi.gov.in", "2026-01-01", "2026-03-15"),
    ("in-para-calpol", "Calpol 650", "Paracetamol", "para-001", "GlaxoSmithKline Pharmaceuticals", "Paracetamol 650 mg", "Schedule H", 33.5, "Paracetamol Tablets IP 650mg", 4.5, "83%", "पैरासिटामोल 650mg — बुखार और हल्के दर्द के लिए।", "Do not mix with alcohol or other paracetamol preparations.", "PMBJP Jan Aushadhi Portal", "https://janaushadhi.gov.in", "2026-01-01", "2026-03-15"),
    ("in-amox-aug", "Augmentin 625 Duo", "Amoxicillin and Potassium Clavulanate", "amc-002", "GlaxoSmithKline Pharmaceuticals", "Amoxicillin 500 mg + Clavulanic Acid 125 mg", "Schedule H1", 205.0, "Amoxycillin & Potassium Clavulanate Tablets IP (500mg+125mg)", 55.0, "73%", "बैक्टीरियल इन्फेक्शन (कान, गला, छाती, यूरिन) के लिए एंटीबायोटिक।", "Must be taken with food. Strictly complete entire course to avoid AMR.", "NPPA / PMBJP", "https://nppaindia.nic.in", "2026-01-01", "2026-03-15"),
    ("in-amox-clavam", "Clavam 625", "Amoxicillin and Potassium Clavulanate", "amc-002", "Alkem Laboratories Ltd.", "Amoxicillin 500 mg + Clavulanic Acid 125 mg", "Schedule H1", 198.0, "Amoxycillin & Potassium Clavulanate Tablets IP (500mg+125mg)", 55.0, "72%", "एंटीबायोटिक दवा — पेनिसिलिन एलर्जी होने पर न लें।", "Take with meal to reduce gastrointestinal distress and diarrhea.", "NPPA / PMBJP", "https://nppaindia.nic.in", "2026-01-01", "2026-03-15"),
    ("in-met-glycomet", "Glycomet 500", "Metformin", "met-001", "USV Private Limited", "Metformin Hydrochloride 500 mg", "Schedule H", 45.0, "Metformin Sustained Release Tablets IP 500mg", 9.0, "80%", "टाइप 2 डायबिटीज में ब्लड शुगर नियंत्रित करने की मुख्य दवा।", "Risk of lactic acidosis in kidney dysfunction. Monitor eGFR regularly.", "PMBJP Jan Aushadhi Portal", "https://janaushadhi.gov.in", "2026-01-01", "2026-03-15"),
    ("in-ppi-pand", "Pan-D", "Pantoprazole and Domperidone", "pan-001", "Alkem Laboratories Ltd.", "Pantoprazole 40 mg + Domperidone 30 mg", "Schedule H", 195.0, "Pantoprazole & Domperidone SR Capsules IP", 32.0, "83%", "गैस, एसिडिटी और उल्टी/उबकाई रोकने के लिए।", "WARNING: Domperidone carries cardiac arrhythmia (QTc prolongation) risk.", "NPPA / PMBJP", "https://nppaindia.nic.in", "2026-01-01", "2026-03-15"),
    ("in-ppi-pantocid", "Pantocid 40", "Pantoprazole", "pan-001", "Sun Pharmaceutical Industries", "Pantoprazole 40 mg", "Schedule H", 165.0, "Pantoprazole Gastro-resistant Tablets IP 40mg", 18.0, "89%", "पेट में अत्यधिक एसिड बनना रोकता है।", "Prolonged use (>1 year) increases fracture risk and reduces Vitamin B12.", "PMBJP Jan Aushadhi Portal", "https://janaushadhi.gov.in", "2026-01-01", "2026-03-15"),
    ("in-nsaid-combiflam", "Combiflam", "Ibuprofen and Paracetamol", "ibp-001", "Sanofi India Ltd.", "Ibuprofen 400 mg + Paracetamol 325 mg", "Schedule H", 52.0, "Ibuprofen & Paracetamol Tablets IP (400mg+325mg)", 12.0, "77%", "तेज सिरदर्द, दांत दर्द या बदन दर्द में राहत देती है।", "STRICT WARNING: Do NOT take on empty stomach. Avoid in gastric ulcers or dengue.", "NPPA / PMBJP", "https://nppaindia.nic.in", "2026-01-01", "2026-03-15"),
    ("in-arb-telma", "Telma 40", "Telmisartan", "tel-001", "Glenmark Pharmaceuticals Ltd.", "Telmisartan 40 mg", "Schedule H", 220.0, "Telmisartan Tablets IP 40mg", 28.0, "87%", "हाई ब्लड प्रेशर (उच्च रक्तचाप) को नियंत्रित करने की दवा।", "Contraindicated in pregnancy (fetotoxic). Risk of hyperkalemia with potassium.", "PMBJP Jan Aushadhi Portal", "https://janaushadhi.gov.in", "2026-01-01", "2026-03-15"),
    ("in-ccb-amlong", "Amlong 5", "Amlodipine", "aml-001", "Micro Labs Ltd.", "Amlodipine Besylate 5 mg", "Schedule H", 85.0, "Amlodipine Tablets IP 5mg", 6.0, "93%", "रक्त वाहिकाओं को शिथिल कर ब्लड प्रेशर सामान्य करती है।", "Common side effect: Pedal edema (swelling of ankles).", "PMBJP Jan Aushadhi Portal", "https://janaushadhi.gov.in", "2026-01-01", "2026-03-15"),
    ("in-statin-atorva", "Atorva 10", "Atorvastatin", "ato-001", "Zydus Lifesciences", "Atorvastatin Calcium 10 mg", "Schedule H", 175.0, "Atorvastatin Tablets IP 10mg", 15.0, "91%", "कोलेस्ट्रॉल घटाने और दिल के दौरे से बचाव की दवा।", "Promptly report unexplained muscle pain or tenderness (rhabdomyolysis risk).", "PMBJP Jan Aushadhi Portal", "https://janaushadhi.gov.in", "2026-01-01", "2026-03-15"),
    ("in-anti-montair", "Montair-LC", "Montelukast and Levocetirizine", "mon-001", "Cipla Ltd.", "Montelukast 10 mg + Levocetirizine 5 mg", "Schedule H", 320.0, "Montelukast & Levocetirizine Tablets IP", 35.0, "89%", "एलर्जी, छींक, बहती नाक और दमे की सांस फूलने में उपयोगी।", "BOXED WARNING: Montelukast may induce neuropsychiatric changes.", "NPPA / PMBJP", "https://nppaindia.nic.in", "2026-01-01", "2026-03-15"),
    ("in-anti-azithral", "Azithral 500", "Azithromycin", "azi-001", "Alembic Pharmaceuticals Ltd.", "Azithromycin Dihydrate 500 mg", "Schedule H1", 130.0, "Azithromycin Tablets IP 500mg", 38.0, "71%", "गले और फेफड़ों के इन्फेक्शन का 3 से 5 दिन का एंटीबायोटिक।", "Caution in patients with preexisting cardiac arrhythmias (QT prolongation).", "PMBJP Jan Aushadhi Portal", "https://janaushadhi.gov.in", "2026-01-01", "2026-03-15"),
    ("in-antiplatelet-ecosprin", "Ecosprin 75", "Aspirin", "asp-001", "USV Private Limited", "Aspirin 75 mg (Enteric Coated)", "Schedule G", 12.0, "Aspirin Gastro-resistant Tablets IP 75mg", 3.5, "70%", "खून को पतला कर दिल के दौरे और स्ट्रोक से बचाती है।", "Bleeding risk. Avoid combining with NSAIDs without gastroprotection.", "NPPA / PMBJP", "https://nppaindia.nic.in", "2026-01-01", "2026-03-15"),
    ("in-calcium-shelcal", "Shelcal 500", "Calcium and Vitamin D3", "cal-001", "Torrent Pharmaceuticals Ltd.", "Calcium 500 mg + Vitamin D3 250 IU", "OTC", 140.0, "Calcium with Vitamin D3 Tablets IP", 22.0, "84%", "हड्डियों की मजबूती और ऑस्टियोपोरोसिस से बचाव।", "Avoid excessive doses in patients with a history of renal calculi.", "PMBJP Jan Aushadhi Portal", "https://janaushadhi.gov.in", "2026-01-01", "2026-03-15")
]

# Seed dataset for Ayurveda-Allopathy Herb-Drug Interactions
AYURVEDA_INTERACTIONS_SEED = [
    ("Ashwagandha", "Sedatives / Benzodiazepines / Hypnotics", "AVOID", "Excessive Central Nervous System Depression", "Ashwagandha exerts GABA-mimetic central nervous system calming activity. Potentiates sedative effects.", "Severe drowsiness, profound motor impairment, respiratory depression.", "अश्वगंधा और नींद/डिप्रेशन की दवाओं (Alprazolam, Clonazepam) को एक साथ न लें।", "Established", "Ayush Research Portal / NIH NCCIH", "2026-03-15"),
    ("Ashwagandha", "Antidiabetic Agents", "CAUTION", "Compounded Hypoglycemia Risk", "Enhances cellular insulin sensitivity and glucose uptake.", "Tremors, cold sweats, dizzy spells, or acute hypoglycemic shock.", "डायबिटीज की दवाओं के साथ अश्वगंधा लेने से शुगर बहुत कम हो सकती है।", "Moderate Evidence", "Ayush Research Portal", "2026-03-15"),
    ("Ashwagandha", "Thyroid Hormone Replacement", "CAUTION", "Thyroid Overstimulation", "Stimulates endogenous T3 and T4 synthesis.", "Palpitations, tremors, anxiety, insomnia.", "थायराइड की दवा (Thyronorm) के साथ अश्वगंधा लेने पर हार्मोन स्तर चेक कराएं।", "Moderate Evidence", "Journal of Ayurveda & Integrative Medicine", "2026-03-15"),
    ("Giloy / Guduchi", "Oral Antidiabetics / Insulin", "CAUTION", "Additive Hypoglycemic Effect", "Potent insulinomimetic and gluconeogenesis-inhibiting actions.", "Precipitous drops in capillary blood glucose.", "गिलोय का काढ़ा डायबिटीज की दवाओं के असर को खतरनाक रूप से बढ़ा सकता है।", "Moderate Evidence", "Ayush Research Portal", "2026-03-15"),
    ("Giloy / Guduchi", "Immunosuppressive Drugs", "AVOID", "Neutralization of Therapeutic Immunosuppression", "Strong immunostimulatory activation of macrophages opposes therapeutic immunosuppression.", "Autoimmune flare-ups or transplant graft compromise.", "गिलोय स्टेरॉयड और ऑटोइम्यून दवाओं के प्रभाव को समाप्त कर सकता है।", "Established", "Pharmacognosy Reviews", "2026-03-15"),
    ("Guggulu", "Anticoagulants / Antiplatelets", "AVOID", "Synergistic Systemic Bleeding Risk", "Guggulsterones inhibit platelet aggregation, compounding blood thinner activity.", "Unexplained bruising, hematuria, GI bleeding.", "खून पतला करने वाली दवाओं (Ecosprin, Warfarin) के साथ गुग्गुल लेने से ब्लीडिंग का खतरा रहता है।", "Established", "Natural Medicines Comprehensive Database", "2026-03-15"),
    ("Guggulu", "Statins / Lipid Lowering Drugs", "CAUTION", "CYP3A4 Induction & Clearance Alteration", "Modulates hepatic clearance enzymes.", "Altered efficacy or elevated liver transaminases.", "स्टेटिन दवाओं के साथ गुग्गुल लेने पर लिवर एंजाइम्स (LFT) की जांच कराएं।", "Moderate Evidence", "Ayush Research Portal", "2026-03-15"),
    ("Mulethi / Licorice", "Antihypertensives / Diuretics", "AVOID", "Pseudo-Hyperaldosteronism & Potassium Loss", "Inhibits 11-beta-HSD2, triggering cortisol-mediated mineralocorticoid activation.", "Severe hypokalemia, arrhythmia, rebound hypertension.", "हाई ब्लड प्रेशर की दवाओं के साथ मुलेठी न लें; यह पोटैशियम घटाती है।", "Established", "NIH NCCIH", "2026-03-15"),
    ("Karela / Bitter Melon Extract", "Oral Antidiabetics / Insulin", "CAUTION", "Severe Synergistic Hypoglycemia", "Charantin and peptide-P stimulate peripheral glucose disposal.", "Nocturnal hypoglycemia, diaphoresis, weakness.", "करेला-जामुन जूस और एलोपैथिक शुगर की गोलियों से शुगर अचानक गिर सकती है।", "Moderate Evidence", "Phytomedicine Journal", "2026-03-15"),
    ("Shankhpushpi", "Antiepileptic / Anticonvulsant Drugs", "AVOID", "Reduction of Phenytoin Bioavailability", "Significantly decreases plasma concentrations and AUC of phenytoin.", "Breakthrough epileptic seizures.", "मिर्गी की दवाओं (Eptoin, Phenytoin) के साथ शंखपुष्पी कभी न लें।", "Established", "Epilepsia Research", "2026-03-15"),
    ("Triphala", "Oral Iron Supplements", "CAUTION", "Tannin Chelation & Impaired Iron Absorption", "Polyphenols and tannins form insoluble precipitates with iron ions in gut.", "Treatment failure of iron-deficiency anemia.", "त्रिफला और खून/आयरन की गोलियों के बीच 3-4 घंटे का अंतर रखें।", "Moderate Evidence", "Ayush Research Portal", "2026-03-15"),
    ("Haldi / Curcumin", "NSAIDs / Blood Thinners", "CAUTION", "Enhanced Antiplatelet Effect", "Mild thromboxane A2 inhibition and anti-inflammatory synergy.", "Increased bleeding tendency and gastric mucosal irritation.", "दर्द निवारक और खून पतला करने वाली दवाओं के साथ अत्यधिक हल्दी सप्लीमेंट न लें।", "Theoretical / In Vitro", "NIH NCCIH", "2026-03-15")
]

# Canonical Pairwise Drug-Drug Interactions with Exact IDs
CANONICAL_DDI_SEED = [
    ("ibu-001", "tel-001", "Ibuprofen", "Telmisartan", "AVOID", "NSAID + ARB Hemodynamic Collapse", "Ibuprofen constricts afferent renal arterioles while Telmisartan dilates efferent arterioles, collapsing glomerular filtration pressure.", "Acute Kidney Injury (AKI) and dangerous hyperkalemia.", "Established", "FDA / Beers Criteria / CDSCO", "https://dailymed.nlm.nih.gov", "2026-03-15"),
    ("ibu-001", "asp-001", "Ibuprofen", "Aspirin", "AVOID", "Competitive COX-1 Binding & Mucosal Ulceration", "Ibuprofen competitively displaces aspirin from the platelet COX-1 binding pocket, abolishing cardioprotection while doubling ulcer risk.", "Loss of cardioprotection and severe upper gastrointestinal bleeding.", "Established", "FDA DailyMed", "https://dailymed.nlm.nih.gov", "2026-03-15"),
    ("ibp-001", "tel-001", "Combiflam (Ibuprofen + Paracetamol)", "Telmisartan", "AVOID", "NSAID + ARB Severe Renal Synergism", "The ibuprofen component collapses renal perfusion pressure in hypertensive patients on renin-angiotensin blockade.", "Acute renal failure, oliguria, and life-threatening hyperkalemia.", "Established", "PvPI / CDSCO Safety Circular", "https://cdsco.gov.in", "2026-03-15"),
    ("met-001", "cip-001", "Metformin", "Ciprofloxacin", "CAUTION", "Compounded Hypoglycemia & Renal Clearance Alteration", "Ciprofloxacin alters renal tubular transport of metformin and exerts independent pancreatic beta-cell stimulation.", "Severe hypoglycemia or elevated metformin systemic exposure.", "Moderate Evidence", "FDA DailyMed", "https://dailymed.nlm.nih.gov", "2026-03-15"),
    ("ato-001", "clar-001", "Atorvastatin", "Clarithromycin", "AVOID", "CYP3A4 Inhibition Driven Statin Toxicity", "Macrolide strongly inhibits CYP3A4, provoking a 4-fold surge in serum atorvastatin concentrations.", "Severe rhabdomyolysis, myoglobinuria, and acute tubular necrosis.", "Established", "FDA DailyMed", "https://dailymed.nlm.nih.gov", "2026-03-15"),
    ("cip-001", "cal-001", "Ciprofloxacin", "Calcium Carbonate", "CAUTION", "Chelation and Bioavailability Collapse", "Polyvalent calcium cations form insoluble coordination complexes with fluoroquinolones in the gastrointestinal tract.", "Over 60% collapse in antibiotic absorption, causing clinical failure.", "Established", "FDA DailyMed", "https://dailymed.nlm.nih.gov", "2026-03-15"),
    ("azi-001", "dom-001", "Azithromycin", "Domperidone", "AVOID", "Additive QTc Interval Prolongation", "Both agents delay cardiac ventricular repolarization via hERG potassium channel blockade.", "Torsades de pointes and fatal ventricular arrhythmias.", "Established", "CDSCO Safety Notice / MHRA", "https://cdsco.gov.in", "2026-03-15"),
    ("asp-001", "dic-001", "Aspirin", "Diclofenac", "AVOID", "Dual NSAID / Antiplatelet Toxicity", "Compounded gastrointestinal cyclooxygenase inhibition and platelet impairment.", "Major gastrointestinal hemorrhage, gastric perforation, and blunted cardioprotection.", "Established", "FDA DailyMed", "https://dailymed.nlm.nih.gov", "2026-03-15")
]

def init_database(db_path=DB_PATH):
    """Creates database schema and runs initial migrations."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.executescript(SCHEMA_DDL)
    conn.commit()
    conn.close()
    print(f"Database schema initialized at: {db_path}")

def populate_database(db_path=DB_PATH):
    """Populates medicines.db with clinical drugs, Indian brands, allergies, and interactions."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Ingest Master Medicines from data/medicines.json
    json_path = os.path.join(BASE_DIR, "data", "medicines.json")
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            med_list = json.load(f)

        for med in med_list:
            m_id = med.get("id")
            generic_name = med.get("genericName", "").strip()
            if not generic_name:
                continue

            normalized_name = generic_name.lower().replace("/", " ").replace("-", " ")
            category = med.get("category", "General")
            dosage_forms = json.dumps(med.get("dosageForms", ["Tablet"]))
            summary = med.get("plainEnglishSummary", "")
            grade = med.get("confidenceGrade", "A")
            source = med.get("source", "FDA / DailyMed")

            cursor.execute("""
                INSERT OR REPLACE INTO medicines (id, generic_name, normalized_name, category, dosage_forms, plain_english_summary, confidence_grade, source, last_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, '2026-03-15')
            """, (m_id, generic_name, normalized_name, category, dosage_forms, summary, grade, source))

            # Indications
            for use in med.get("commonUses", []):
                cursor.execute("""
                    INSERT INTO indications (medicine_id, indication, source)
                    VALUES (?, ?, ?)
                """, (m_id, use, source))

            # Adverse effects
            for se in med.get("commonSideEffects", []):
                cursor.execute("""
                    INSERT INTO adverse_effects (medicine_id, reaction, frequency, source)
                    VALUES (?, ?, ?, ?)
                """, (m_id, se, "Common", source))

            # Contraindications / Calm warnings
            for w in med.get("calmWarnings", []):
                lvl = "AVOID" if w.get("level") == "avoid" else "CAUTION"
                title = w.get("title", "")
                why = w.get("plainEnglishWhy", "")
                cursor.execute("""
                    INSERT INTO contraindications (medicine_id, condition, severity, why_avoid, source)
                    VALUES (?, ?, ?, ?, ?)
                """, (m_id, title, lvl, why, source))

    # 2. Insert Indian Generic Extensions (Metformin, Telmisartan, Amlodipine, etc.)
    for ext in INDIAN_GENERIC_EXTENSIONS:
        m_id = ext["id"]
        generic_name = ext["genericName"]
        normalized_name = generic_name.lower().replace("/", " ").replace("-", " ")
        category = ext["category"]
        dosage_forms = json.dumps(["Tablet"])
        summary = ext["plainEnglishSummary"]
        grade = ext.get("confidenceGrade", "A")
        source = ext.get("source", "FDA / CDSCO")
        source_url = ext.get("source_url")

        cursor.execute("""
            INSERT OR REPLACE INTO medicines (id, generic_name, normalized_name, category, dosage_forms, plain_english_summary, confidence_grade, source, source_url, last_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '2026-03-15')
        """, (m_id, generic_name, normalized_name, category, dosage_forms, summary, grade, source, source_url))

        for use in ext.get("commonUses", []):
            cursor.execute("INSERT INTO indications (medicine_id, indication, source) VALUES (?, ?, ?)", (m_id, use, source))

        for se in ext.get("commonSideEffects", []):
            cursor.execute("INSERT INTO adverse_effects (medicine_id, reaction, frequency, source) VALUES (?, ?, 'Common', ?)", (m_id, se, source))

        for w in ext.get("calmWarnings", []):
            lvl = "AVOID" if w.get("level") == "avoid" else "CAUTION"
            cursor.execute("INSERT INTO contraindications (medicine_id, condition, severity, why_avoid, source) VALUES (?, ?, ?, ?, ?)",
                           (m_id, w["title"], lvl, w["plainEnglishWhy"], source))

    # 3. Ingest Allergy Classes Ontology
    for ac in ALLERGY_CLASSES_SEED:
        cursor.execute("""
            INSERT OR REPLACE INTO allergy_classes (id, name, parent_class, description, common_manifestations, synonyms)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ac)

    # 4. Ingest Medicine-to-Allergy Class Cross-Reactivity Risks
    for mar in MEDICINE_ALLERGY_RISKS_SEED:
        cursor.execute("""
            INSERT INTO medicine_allergy_risks (medicine_id, allergy_class_id, cross_reactivity_level, hypersensitivity_warning, severity, source, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, mar)

    # 5. Ingest Structured Statutory & Boxed Warnings
    for bw in BOXED_WARNINGS_SEED:
        cursor.execute("""
            INSERT INTO boxed_warnings (medicine_id, warning_type, severity, title, description, source, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, bw)

    # 6. Ingest Indian Brands & Jan Aushadhi Mapping (with Canonical ID & Provenance)
    for brand in INDIAN_BRANDS_SEED:
        cursor.execute("""
            INSERT OR REPLACE INTO indian_brands 
            (id, brand_name, generic_name, canonical_medicine_id, manufacturer, composition, cdsco_schedule, branded_mrp_inr, jan_aushadhi_name, jan_aushadhi_price_inr, savings_percentage, plain_hindi_summary, safety_warning, source, source_url, effective_date, last_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, brand)

    # 7. Ingest Ayurveda Interactions with Evidence Levels
    for ayur in AYURVEDA_INTERACTIONS_SEED:
        cursor.execute("""
            INSERT INTO ayurveda_interactions (herb_name, allopathy_group, severity, title, mechanism, clinical_risk, hindi_warning, evidence_level, source, last_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ayur)

    # 8. Ingest Canonical Drug-Drug Interactions with Exact IDs
    for ddi in CANONICAL_DDI_SEED:
        cursor.execute("""
            INSERT INTO drug_interactions (drug_a_id, drug_b_id, drug_a, drug_b, severity, title, mechanism, clinical_risk, evidence_level, source, source_url, last_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ddi)

    conn.commit()

    # Query counts for verification
    counts = {
        "medicines": cursor.execute("SELECT COUNT(*) FROM medicines").fetchone()[0],
        "indian_brands": cursor.execute("SELECT COUNT(*) FROM indian_brands").fetchone()[0],
        "allergy_classes": cursor.execute("SELECT COUNT(*) FROM allergy_classes").fetchone()[0],
        "allergy_risks": cursor.execute("SELECT COUNT(*) FROM medicine_allergy_risks").fetchone()[0],
        "boxed_warnings": cursor.execute("SELECT COUNT(*) FROM boxed_warnings").fetchone()[0],
        "indications": cursor.execute("SELECT COUNT(*) FROM indications").fetchone()[0],
        "adverse_effects": cursor.execute("SELECT COUNT(*) FROM adverse_effects").fetchone()[0],
        "contraindications": cursor.execute("SELECT COUNT(*) FROM contraindications").fetchone()[0],
        "drug_interactions": cursor.execute("SELECT COUNT(*) FROM drug_interactions").fetchone()[0],
        "ayurveda_interactions": cursor.execute("SELECT COUNT(*) FROM ayurveda_interactions").fetchone()[0]
    }

    conn.close()
    print("\n--- medicines.db Build Summary ---")
    for table, count in counts.items():
        print(f"  • {table.ljust(22)}: {count} records")

    return counts

def export_frontend_snapshot(db_path=DB_PATH, output_json=None):
    """
    Exports a structured JSON snapshot from medicines.db directly to data/medicines.json.
    Guarantees SQLite is the single authoritative source of truth while keeping the frontend 100% offline.
    """
    if output_json is None:
        output_json = os.path.join(BASE_DIR, "data", "medicines.json")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    med_rows = cursor.execute("SELECT * FROM medicines ORDER BY generic_name ASC").fetchall()
    export_list = []

    for m in med_rows:
        m_id = m["id"]
        # Indications
        uses = [r["indication"] for r in cursor.execute("SELECT indication FROM indications WHERE medicine_id = ?", (m_id,)).fetchall()]
        # Side effects
        side_effects = [r["reaction"] for r in cursor.execute("SELECT reaction FROM adverse_effects WHERE medicine_id = ?", (m_id,)).fetchall()]
        # Warnings
        calm_warnings = []
        for r in cursor.execute("SELECT condition, severity, why_avoid FROM contraindications WHERE medicine_id = ?", (m_id,)).fetchall():
            calm_warnings.append({
                "level": r["severity"].lower(),
                "title": r["condition"],
                "plainEnglishWhy": r["why_avoid"]
            })
        # Boxed warnings
        bw_rows = cursor.execute("SELECT warning_type, severity, title, description, source FROM boxed_warnings WHERE medicine_id = ?", (m_id,)).fetchall()
        boxed_list = [{"type": r["warning_type"], "severity": r["severity"], "title": r["title"], "description": r["description"], "source": r["source"]} for r in bw_rows]

        # Indian Brands matching this medicine
        brands = [r["brand_name"] for r in cursor.execute("SELECT brand_name FROM indian_brands WHERE canonical_medicine_id = ? OR generic_name = ?", (m_id, m["generic_name"])).fetchall()]

        # Allergy risks
        allergy_rows = cursor.execute("""
            SELECT ac.name as class_name, mar.cross_reactivity_level, mar.hypersensitivity_warning, mar.severity
            FROM medicine_allergy_risks mar
            JOIN allergy_classes ac ON mar.allergy_class_id = ac.id
            WHERE mar.medicine_id = ?
        """, (m_id,)).fetchall()
        allergies = [r["class_name"] for r in allergy_rows]

        entry = {
            "id": m_id,
            "genericName": m["generic_name"],
            "brandNames": brands if brands else [m["generic_name"]],
            "category": m["category"],
            "plainEnglishSummary": m["plain_english_summary"],
            "commonUses": uses,
            "calmWarnings": calm_warnings,
            "commonSideEffects": side_effects,
            "confidenceGrade": m["confidence_grade"],
            "source": m["source"],
            "sourceUrl": m["source_url"],
            "lastVerified": m["last_verified"],
            "boxedWarnings": boxed_list,
            "allergyClasses": allergies
        }
        export_list.append(entry)

    conn.close()

    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(export_list, f, indent=2, ensure_ascii=False)

    print(f"Exported authoritative snapshot ({len(export_list)} medicines) to: {output_json}")

if __name__ == "__main__":
    init_database()
    populate_database()
    export_frontend_snapshot()
