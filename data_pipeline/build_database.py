"""
build_database.py
-----------------
Initializes and populates the local-first SQLite clinical medicine database (medicines.db).
Merges clinical pharmacology, openFDA labels, Jan Aushadhi price intelligence,
and the Ayurveda-Allopathy interaction matrix into structured relational tables.
"""

import json
import os
import sqlite3
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "backend", "data")
DB_PATH = os.path.join(DATA_DIR, "medicines.db")

SCHEMA_DDL = """
-- 1. Master Medicines Table
CREATE TABLE IF NOT EXISTS medicines (
    id TEXT PRIMARY KEY,
    generic_name TEXT NOT NULL UNIQUE,
    normalized_name TEXT NOT NULL,
    category TEXT,
    dosage_forms TEXT,
    mechanism_of_action TEXT,
    plain_english_summary TEXT,
    source TEXT DEFAULT 'FDA / DailyMed / NFI'
);

-- 2. Indian Trade Brand & Jan Aushadhi Mapping Table
CREATE TABLE IF NOT EXISTS indian_brands (
    id TEXT PRIMARY KEY,
    brand_name TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    manufacturer TEXT,
    composition TEXT NOT NULL,
    cdsco_schedule TEXT,
    branded_mrp_inr REAL,
    jan_aushadhi_name TEXT,
    jan_aushadhi_price_inr REAL,
    savings_percentage TEXT,
    plain_hindi_summary TEXT,
    safety_warning TEXT,
    FOREIGN KEY(generic_name) REFERENCES medicines(generic_name)
);

-- 3. Indications (Therapeutic Uses)
CREATE TABLE IF NOT EXISTS indications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id TEXT NOT NULL,
    indication TEXT NOT NULL,
    source TEXT,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id)
);

-- 4. Adverse Effects & Organ Hazards
CREATE TABLE IF NOT EXISTS adverse_effects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id TEXT NOT NULL,
    reaction TEXT NOT NULL,
    frequency TEXT DEFAULT 'Common',
    organ_system TEXT,
    source TEXT,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id)
);

-- 5. Contraindications & Health Condition Warnings
CREATE TABLE IF NOT EXISTS contraindications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id TEXT NOT NULL,
    condition TEXT NOT NULL,
    severity TEXT NOT NULL,  -- AVOID, CAUTION
    why_avoid TEXT,
    source TEXT,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id)
);

-- 6. Pairwise Drug-Drug Interactions (DDI)
CREATE TABLE IF NOT EXISTS drug_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drug_a TEXT NOT NULL,
    drug_b TEXT NOT NULL,
    severity TEXT NOT NULL,  -- AVOID, CAUTION, SAFE
    title TEXT NOT NULL,
    mechanism TEXT,
    clinical_risk TEXT,
    source TEXT
);

-- 7. Ayurveda–Allopathy Herb-Drug Interaction Matrix (AHDI)
CREATE TABLE IF NOT EXISTS ayurveda_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    herb_name TEXT NOT NULL,
    allopathy_group TEXT NOT NULL,
    severity TEXT NOT NULL,  -- AVOID, CAUTION
    title TEXT NOT NULL,
    mechanism TEXT,
    clinical_risk TEXT,
    hindi_warning TEXT
);

-- 8. Black Box & Regulatory Warnings
CREATE TABLE IF NOT EXISTS boxed_warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id TEXT NOT NULL,
    warning_title TEXT NOT NULL,
    warning_text TEXT NOT NULL,
    source TEXT,
    FOREIGN KEY(medicine_id) REFERENCES medicines(id)
);

-- Indices for rapid O(1) & sub-millisecond querying
CREATE INDEX IF NOT EXISTS idx_med_generic ON medicines(generic_name);
CREATE INDEX IF NOT EXISTS idx_med_norm ON medicines(normalized_name);
CREATE INDEX IF NOT EXISTS idx_brand_name ON indian_brands(brand_name);
CREATE INDEX IF NOT EXISTS idx_brand_generic ON indian_brands(generic_name);
CREATE INDEX IF NOT EXISTS idx_indications_med ON indications(medicine_id);
CREATE INDEX IF NOT EXISTS idx_adverse_med ON adverse_effects(medicine_id);
CREATE INDEX IF NOT EXISTS idx_contra_med ON contraindications(medicine_id);
CREATE INDEX IF NOT EXISTS idx_ddi_drugs ON drug_interactions(drug_a, drug_b);
CREATE INDEX IF NOT EXISTS idx_ayur_herb ON ayurveda_interactions(herb_name);
"""

# Seed dataset for Indian Brands and Jan Aushadhi generics
INDIAN_BRANDS_SEED = [
    ("in-para-dolo", "Dolo 650", "Paracetamol", "Micro Labs Ltd.", "Paracetamol 650 mg", "Schedule H", 34.0, "Paracetamol Tablets IP 650mg", 4.5, "83%", "बुखार और बदन दर्द के लिए सबसे ज्यादा ली जाने वाली दवा।", "Excess use causes fatal hepatic necrosis. Verify other cold preparations."),
    ("in-para-calpol", "Calpol 650", "Paracetamol", "GlaxoSmithKline Pharmaceuticals", "Paracetamol 650 mg", "Schedule H", 33.5, "Paracetamol Tablets IP 650mg", 4.5, "83%", "पैरासिटामोल 650mg — बुखार और हल्के दर्द के लिए।", "Do not mix with alcohol or other paracetamol preparations."),
    ("in-amox-aug", "Augmentin 625 Duo", "Amoxicillin and Potassium Clavulanate", "GlaxoSmithKline Pharmaceuticals", "Amoxicillin 500 mg + Clavulanic Acid 125 mg", "Schedule H1", 205.0, "Amoxycillin & Potassium Clavulanate Tablets IP (500mg+125mg)", 55.0, "73%", "बैक्टीरियल इन्फेक्शन (कान, गला, छाती, यूरिन) के लिए एंटीबायोटिक।", "Must be taken with food. Strictly complete entire course to avoid AMR."),
    ("in-amox-clavam", "Clavam 625", "Amoxicillin and Potassium Clavulanate", "Alkem Laboratories Ltd.", "Amoxicillin 500 mg + Clavulanic Acid 125 mg", "Schedule H1", 198.0, "Amoxycillin & Potassium Clavulanate Tablets IP (500mg+125mg)", 55.0, "72%", "एंटीबायोटिक दवा — पेनिसिलिन एलर्जी होने पर न लें।", "Take with meal to reduce gastrointestinal distress and diarrhea."),
    ("in-met-glycomet", "Glycomet 500", "Metformin", "USV Private Limited", "Metformin Hydrochloride 500 mg", "Schedule H", 45.0, "Metformin Sustained Release Tablets IP 500mg", 9.0, "80%", "टाइप 2 डायबिटीज में ब्लड शुगर नियंत्रित करने की मुख्य दवा।", "Risk of lactic acidosis in kidney dysfunction. Monitor eGFR regularly."),
    ("in-ppi-pand", "Pan-D", "Pantoprazole and Domperidone", "Alkem Laboratories Ltd.", "Pantoprazole 40 mg + Domperidone 30 mg", "Schedule H", 195.0, "Pantoprazole & Domperidone SR Capsules IP", 32.0, "83%", "गैस, एसिडिटी और उल्टी/उबकाई रोकने के लिए।", "WARNING: Domperidone carries cardiac arrhythmia (QTc prolongation) risk."),
    ("in-ppi-pantocid", "Pantocid 40", "Pantoprazole", "Sun Pharmaceutical Industries", "Pantoprazole 40 mg", "Schedule H", 165.0, "Pantoprazole Gastro-resistant Tablets IP 40mg", 18.0, "89%", "पेट में अत्यधिक एसिड बनना रोकता है।", "Prolonged use (>1 year) increases fracture risk and reduces Vitamin B12."),
    ("in-nsaid-combiflam", "Combiflam", "Ibuprofen and Paracetamol", "Sanofi India Ltd.", "Ibuprofen 400 mg + Paracetamol 325 mg", "Schedule H", 52.0, "Ibuprofen & Paracetamol Tablets IP (400mg+325mg)", 12.0, "77%", "तेज सिरदर्द, दांत दर्द या बदन दर्द में राहत देती है।", "STRICT WARNING: Do NOT take on empty stomach. Avoid in gastric ulcers or dengue."),
    ("in-arb-telma", "Telma 40", "Telmisartan", "Glenmark Pharmaceuticals Ltd.", "Telmisartan 40 mg", "Schedule H", 220.0, "Telmisartan Tablets IP 40mg", 28.0, "87%", "हाई ब्लड प्रेशर (उच्च रक्तचाप) को नियंत्रित करने की दवा।", "Contraindicated in pregnancy (fetotoxic). Risk of hyperkalemia with potassium."),
    ("in-ccb-amlong", "Amlong 5", "Amlodipine", "Micro Labs Ltd.", "Amlodipine Besylate 5 mg", "Schedule H", 85.0, "Amlodipine Tablets IP 5mg", 6.0, "93%", "रक्त वाहिकाओं को शिथिल कर ब्लड प्रेशर सामान्य करती है।", "Common side effect: Pedal edema (swelling of ankles)."),
    ("in-statin-atorva", "Atorva 10", "Atorvastatin", "Zydus Lifesciences", "Atorvastatin Calcium 10 mg", "Schedule H", 175.0, "Atorvastatin Tablets IP 10mg", 15.0, "91%", "कोलेस्ट्रॉल घटाने और दिल के दौरे से बचाव की दवा।", "Promptly report unexplained muscle pain or tenderness (rhabdomyolysis risk)."),
    ("in-anti-montair", "Montair-LC", "Montelukast and Levocetirizine", "Cipla Ltd.", "Montelukast 10 mg + Levocetirizine 5 mg", "Schedule H", 320.0, "Montelukast & Levocetirizine Tablets IP", 35.0, "89%", "एलर्जी, छींक, बहती नाक और दमे की सांस फूलने में उपयोगी।", "BOXED WARNING: Montelukast may induce neuropsychiatric changes."),
    ("in-anti-azithral", "Azithral 500", "Azithromycin", "Alembic Pharmaceuticals Ltd.", "Azithromycin Dihydrate 500 mg", "Schedule H1", 130.0, "Azithromycin Tablets IP 500mg", 38.0, "71%", "गले और फेफड़ों के इन्फेक्शन का 3 से 5 दिन का एंटीबायोटिक।", "Caution in patients with preexisting cardiac arrhythmias (QT prolongation)."),
    ("in-antiplatelet-ecosprin", "Ecosprin 75", "Aspirin", "USV Private Limited", "Aspirin 75 mg (Enteric Coated)", "Schedule G", 12.0, "Aspirin Gastro-resistant Tablets IP 75mg", 3.5, "70%", "खून को पतला कर दिल के दौरे और स्ट्रोक से बचाती है।", "Bleeding risk. Avoid combining with NSAIDs without gastroprotection."),
    ("in-calcium-shelcal", "Shelcal 500", "Calcium and Vitamin D3", "Torrent Pharmaceuticals Ltd.", "Calcium 500 mg + Vitamin D3 250 IU", "OTC", 140.0, "Calcium with Vitamin D3 Tablets IP", 22.0, "84%", "हड्डियों की मजबूती और ऑस्टियोपोरोसिस से बचाव।", "Avoid excessive doses in patients with a history of renal calculi.")
]

# Seed dataset for Ayurveda-Allopathy Herb-Drug Interactions
AYURVEDA_INTERACTIONS_SEED = [
    ("Ashwagandha", "Sedatives / Benzodiazepines / Hypnotics", "AVOID", "Excessive Central Nervous System Depression", "Ashwagandha exerts GABA-mimetic central nervous system calming activity. Potentiates sedative effects.", "Severe drowsiness, profound motor impairment, respiratory depression.", "अश्वगंधा और नींद/डिप्रेशन की दवाओं (Alprazolam, Clonazepam) को एक साथ न लें।"),
    ("Ashwagandha", "Antidiabetic Agents", "CAUTION", "Compounded Hypoglycemia Risk", "Enhances cellular insulin sensitivity and glucose uptake.", "Tremors, cold sweats, dizzy spells, or acute hypoglycemic shock.", "डायबिटीज की दवाओं के साथ अश्वगंधा लेने से शुगर बहुत कम हो सकती है।"),
    ("Ashwagandha", "Thyroid Hormone Replacement", "CAUTION", "Thyroid Overstimulation", "Stimulates endogenous T3 and T4 synthesis.", "Palpitations, tremors, anxiety, insomnia.", "थायराइड की दवा (Thyronorm) के साथ अश्वगंधा लेने पर हार्मोन स्तर चेक कराएं।"),
    ("Giloy / Guduchi", "Oral Antidiabetics / Insulin", "CAUTION", "Additive Hypoglycemic Effect", "Potent insulinomimetic and gluconeogenesis-inhibiting actions.", "Precipitous drops in capillary blood glucose.", "गिलोय का काढ़ा डायबिटीज की दवाओं के असर को खतरनाक रूप से बढ़ा सकता है।"),
    ("Giloy / Guduchi", "Immunosuppressive Drugs", "AVOID", "Neutralization of Therapeutic Immunosuppression", "Strong immunostimulatory activation of macrophages opposes therapeutic immunosuppression.", "Autoimmune flare-ups or transplant graft compromise.", "गिलोय स्टेरॉयड और ऑटोइम्यून दवाओं के प्रभाव को समाप्त कर सकता है।"),
    ("Guggulu", "Anticoagulants / Antiplatelets", "AVOID", "Synergistic Systemic Bleeding Risk", "Guggulsterones inhibit platelet aggregation, compounding blood thinner activity.", "Unexplained bruising, hematuria, GI bleeding.", "खून पतला करने वाली दवाओं (Ecosprin, Warfarin) के साथ गुग्गुल लेने से ब्लीडिंग का खतरा रहता है।"),
    ("Guggulu", "Statins / Lipid Lowering Drugs", "CAUTION", "CYP3A4 Induction & Clearance Alteration", "Modulates hepatic clearance enzymes.", "Altered efficacy or elevated liver transaminases.", "स्टेटिन दवाओं के साथ गुग्गुल लेने पर लिवर एंजाइम्स (LFT) की जांच कराएं।"),
    ("Mulethi / Licorice", "Antihypertensives / Diuretics", "AVOID", "Pseudo-Hyperaldosteronism & Potassium Loss", "Inhibits 11-beta-HSD2, triggering cortisol-mediated mineralocorticoid activation.", "Severe hypokalemia, arrhythmia, rebound hypertension.", "हाई ब्लड प्रेशर की दवाओं के साथ मुलेठी न लें; यह पोटैशियम घटाती है।"),
    ("Karela / Bitter Melon Extract", "Oral Antidiabetics / Insulin", "CAUTION", "Severe Synergistic Hypoglycemia", "Charantin and peptide-P stimulate peripheral glucose disposal.", "Nocturnal hypoglycemia, diaphoresis, weakness.", "करेला-जामुन जूस और एलोपैथिक शुगर की गोलियों से शुगर अचानक गिर सकती है।"),
    ("Shankhpushpi", "Antiepileptic / Anticonvulsant Drugs", "AVOID", "Reduction of Phenytoin Bioavailability", "Significantly decreases plasma concentrations and AUC of phenytoin.", "Breakthrough epileptic seizures.", "मिर्गी की दवाओं (Eptoin, Phenytoin) के साथ शंखपुष्पी कभी न लें।"),
    ("Triphala", "Oral Iron Supplements", "CAUTION", "Tannin Chelation & Impaired Iron Absorption", "Polyphenols and tannins form insoluble precipitates with iron ions in gut.", "Treatment failure of iron-deficiency anemia.", "त्रिफला और खून/आयरन की गोलियों के बीच 3-4 घंटे का अंतर रखें।"),
    ("Haldi / Curcumin", "NSAIDs / Blood Thinners", "CAUTION", "Enhanced Antiplatelet Effect", "Mild thromboxane A2 inhibition and anti-inflammatory synergy.", "Increased bleeding tendency and gastric mucosal irritation.", "दर्द निवारक और खून पतला करने वाली दवाओं के साथ अत्यधिक हल्दी सप्लीमेंट न लें।")
]

# Common Pairwise Drug-Drug Interactions
DRUG_INTERACTIONS_SEED = [
    ("Ibuprofen", "Telmisartan", "AVOID", "NSAID + ARB Hemodynamic Clash", "Ibuprofen constricts afferent arterioles while Telmisartan dilates efferent arterioles, collapsing glomerular filtration pressure.", "Acute Kidney Injury (AKI) and hyperkalemia risk.", "FDA / Beers Criteria"),
    ("Ibuprofen", "Aspirin", "AVOID", "Competitive COX-1 Binding & Mucosal Ulceration", "Ibuprofen blocks aspirin's irreversible platelet cardioprotection and compounds ulcer risk.", "Severe gastrointestinal bleeding and loss of cardioprotection.", "FDA DailyMed"),
    ("Combiflam", "Telma 40", "AVOID", "NSAID + ARB Severe Renal Synergism", "Ibuprofen component collapses renal perfusion pressure in hypertensive patients.", "Acute renal failure and dangerous potassium accumulation.", "PvPI / CDSCO"),
    ("Metformin", "Iodinated Contrast", "AVOID", "Risk of Fatal Lactic Acidosis", "Contrast-induced acute renal impairment blocks metformin excretion.", "Metformin accumulation leading to lactic acidosis.", "FDA Boxed Warning"),
    ("Alprazolam", "Tramadol", "AVOID", "Compounded Central Nervous System & Respiratory Depression", "Combined GABAergic and mu-opioid receptor stimulation.", "Profound sedation, respiratory arrest, coma, death.", "FDA Boxed Warning"),
    ("Atorvastatin", "Clarithromycin", "AVOID", "CYP3A4 Inhibition Driven Statin Toxicity", "Macrolide inhibits CYP3A4, causing 4-fold increase in serum statin concentrations.", "Severe rhabdomyolysis, myoglobinuria, and acute renal failure.", "FDA DailyMed"),
    ("Ciprofloxacin", "Calcium Carbonate", "CAUTION", "Chelation and Bioavailability Collapse", "Divalent calcium ions bind fluoroquinolones in the gut lumen.", "Decreased antibiotic absorption by over 60%, resulting in treatment failure.", "FDA DailyMed"),
    ("Azithromycin", "Domperidone", "AVOID", "Additive QTc Interval Prolongation", "Both agents delay cardiac ventricular repolarization.", "Torsades de pointes and fatal ventricular arrhythmias.", "CDSCO Safety Notice")
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
    """Populates medicines.db with clinical drugs, Indian brands, and interactions."""
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
            source = med.get("source", "FDA / DailyMed")

            cursor.execute("""
                INSERT OR REPLACE INTO medicines (id, generic_name, normalized_name, category, dosage_forms, plain_english_summary, source)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (m_id, generic_name, normalized_name, category, dosage_forms, summary, source))

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

        print(f"Inserted master medicines and clinical safety profiles.")

    # 2. Ingest Indian Brands & Jan Aushadhi Mapping
    for brand in INDIAN_BRANDS_SEED:
        cursor.execute("""
            INSERT OR REPLACE INTO indian_brands 
            (id, brand_name, generic_name, manufacturer, composition, cdsco_schedule, branded_mrp_inr, jan_aushadhi_name, jan_aushadhi_price_inr, savings_percentage, plain_hindi_summary, safety_warning)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, brand)

    # 3. Ingest Ayurveda Interactions
    for ayur in AYURVEDA_INTERACTIONS_SEED:
        cursor.execute("""
            INSERT INTO ayurveda_interactions (herb_name, allopathy_group, severity, title, mechanism, clinical_risk, hindi_warning)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ayur)

    # 4. Ingest Drug-Drug Interactions
    for ddi in DRUG_INTERACTIONS_SEED:
        cursor.execute("""
            INSERT INTO drug_interactions (drug_a, drug_b, severity, title, mechanism, clinical_risk, source)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ddi)

    conn.commit()

    # Query counts for verification
    counts = {
        "medicines": cursor.execute("SELECT COUNT(*) FROM medicines").fetchone()[0],
        "indian_brands": cursor.execute("SELECT COUNT(*) FROM indian_brands").fetchone()[0],
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

if __name__ == "__main__":
    init_database()
    populate_database()
