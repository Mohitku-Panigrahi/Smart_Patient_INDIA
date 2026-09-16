/**
 * @file indianPharma.js
 * @description Indian Pharmaceutical Formulary, Brand-to-Generic Mapping & Pradhan Mantri Bharatiya Janaushadhi Pariyojana (PMBJP) Price Intelligence.
 * @namespace SMASP.data.indianPharma
 */

(function (root) {
  'use strict';

  /**
   * Top Indian Pharmaceutical Brand Catalog with Jan Aushadhi generic equivalents,
   * price differential analytics, and CDSCO regulatory status.
   */
  const INDIAN_PHARMA_CATALOG = [
    {
      id: "in-para-dolo",
      brandName: "Dolo 650",
      genericName: "Paracetamol",
      saltComposition: "Paracetamol (Acetaminophen) 650 mg",
      manufacturer: "Micro Labs Ltd.",
      category: "Antipyretic / Analgesic",
      cdscoSchedule: "Schedule H",
      approxBrandedPriceInr: 34.0, // per strip of 15
      janAushadhiEquivalent: "Paracetamol Tablets IP 650mg",
      approxJanAushadhiPriceInr: 4.5, // per strip of 10
      savingsPercentage: "83%",
      plainHindiSummary: "बुखार और बदन दर्द के लिए सबसे ज्यादा ली जाने वाली दवा। 24 घंटे में 4 ग्राम (6 गोली) से अधिक न लें।",
      safetyWarning: "Excess use causes fatal hepatic necrosis. Verify other cold preparations (cold & flu combos) to avoid paracetamol overdose.",
      tags: ["fever", "pain", "headache", "covid", "otc-common"]
    },
    {
      id: "in-para-calpol",
      brandName: "Calpol 650",
      genericName: "Paracetamol",
      saltComposition: "Paracetamol 650 mg",
      manufacturer: "GlaxoSmithKline Pharmaceuticals",
      category: "Antipyretic / Analgesic",
      cdscoSchedule: "Schedule H",
      approxBrandedPriceInr: 33.5,
      janAushadhiEquivalent: "Paracetamol Tablets IP 650mg",
      approxJanAushadhiPriceInr: 4.5,
      savingsPercentage: "83%",
      plainHindiSummary: "पैरासिटामोल 650mg — बुखार और हल्के दर्द के लिए।",
      safetyWarning: "Do not mix with alcohol or other paracetamol preparations.",
      tags: ["fever", "pain"]
    },
    {
      id: "in-amox-aug",
      brandName: "Augmentin 625 Duo",
      genericName: "Amoxicillin and Potassium Clavulanate",
      saltComposition: "Amoxicillin 500 mg + Clavulanic Acid 125 mg",
      manufacturer: "GlaxoSmithKline Pharmaceuticals",
      category: "Broad-Spectrum Antibiotic",
      cdscoSchedule: "Schedule H1",
      approxBrandedPriceInr: 205.0, // per strip of 10
      janAushadhiEquivalent: "Amoxycillin & Potassium Clavulanate Tablets IP (500mg+125mg)",
      approxJanAushadhiPriceInr: 55.0,
      savingsPercentage: "73%",
      plainHindiSummary: "बैक्टीरियल इन्फेक्शन (कान, गला, छाती, यूरिन) के लिए एंटीबायोटिक। कोर्स पूरा करना अनिवार्य है।",
      safetyWarning: "Must be taken with food. Strictly complete entire course to avoid antimicrobial resistance (AMR). Contraindicated in penicillin allergy.",
      tags: ["antibiotic", "infection", "bacterial"]
    },
    {
      id: "in-amox-clavam",
      brandName: "Clavam 625",
      genericName: "Amoxicillin and Potassium Clavulanate",
      saltComposition: "Amoxicillin 500 mg + Clavulanic Acid 125 mg",
      manufacturer: "Alkem Laboratories Ltd.",
      category: "Broad-Spectrum Antibiotic",
      cdscoSchedule: "Schedule H1",
      approxBrandedPriceInr: 198.0,
      janAushadhiEquivalent: "Amoxycillin & Potassium Clavulanate Tablets IP (500mg+125mg)",
      approxJanAushadhiPriceInr: 55.0,
      savingsPercentage: "72%",
      plainHindiSummary: "एंटीबायोटिक दवा — पेनिसिलिन एलर्जी होने पर न लें।",
      safetyWarning: "Take with meal to reduce gastrointestinal distress and diarrhea.",
      tags: ["antibiotic", "infection"]
    },
    {
      id: "in-met-glycomet",
      brandName: "Glycomet 500 / 1000 SR",
      genericName: "Metformin",
      saltComposition: "Metformin Hydrochloride (Sustained Release) 500 mg",
      manufacturer: "USV Private Limited",
      category: "Antidiabetic (Biguanide)",
      cdscoSchedule: "Schedule H",
      approxBrandedPriceInr: 45.0, // per strip of 20
      janAushadhiEquivalent: "Metformin Sustained Release Tablets IP 500mg",
      approxJanAushadhiPriceInr: 9.0,
      savingsPercentage: "80%",
      plainHindiSummary: "टाइप 2 डायबिटीज में ब्लड शुगर नियंत्रित करने की मुख्य दवा। भोजन के साथ लें।",
      safetyWarning: "Risk of lactic acidosis in kidney dysfunction. Monitor eGFR regularly. Stop before iodinated radiocontrast procedures.",
      tags: ["diabetes", "blood-sugar", "chronic"]
    },
    {
      id: "in-ppi-pand",
      brandName: "Pan-D",
      genericName: "Pantoprazole and Domperidone",
      saltComposition: "Pantoprazole 40 mg (EC) + Domperidone 30 mg (SR)",
      manufacturer: "Alkem Laboratories Ltd.",
      category: "Gastrointestinal (PPI + Prokinetic)",
      cdscoSchedule: "Schedule H",
      approxBrandedPriceInr: 195.0, // per strip of 15
      janAushadhiEquivalent: "Pantoprazole & Domperidone SR Capsules IP",
      approxJanAushadhiPriceInr: 32.0,
      savingsPercentage: "83%",
      plainHindiSummary: "गैस, एसिडिटी और उल्टी/उबकाई रोकने के लिए। सुबह खाली पेट (नाश्ते से 30-45 मिनट पहले) लें।",
      safetyWarning: "WARNING: Domperidone carries cardiac arrhythmia (QTc prolongation) risk. Do not use chronically without medical evaluation.",
      tags: ["acidity", "gerd", "gas", "reflux"]
    },
    {
      id: "in-ppi-pantocid",
      brandName: "Pantocid 40",
      genericName: "Pantoprazole",
      saltComposition: "Pantoprazole 40 mg",
      manufacturer: "Sun Pharmaceutical Industries",
      category: "Gastrointestinal (PPI)",
      cdscoSchedule: "Schedule H",
      approxBrandedPriceInr: 165.0, // per strip of 15
      janAushadhiEquivalent: "Pantoprazole Gastro-resistant Tablets IP 40mg",
      approxJanAushadhiPriceInr: 18.0,
      savingsPercentage: "89%",
      plainHindiSummary: "पेट में अत्यधिक एसिड बनना रोकता है। अल्सर और सीने की जलन में उपयोगी।",
      safetyWarning: "Prolonged use (>1 year) increases fracture risk and reduces Vitamin B12 and Magnesium absorption.",
      tags: ["acidity", "ulcer", "heartburn"]
    },
    {
      id: "in-nsaid-combiflam",
      brandName: "Combiflam",
      genericName: "Ibuprofen and Paracetamol",
      saltComposition: "Ibuprofen 400 mg + Paracetamol 325 mg",
      manufacturer: "Sanofi India Ltd.",
      category: "NSAID + Analgesic Combination",
      cdscoSchedule: "Schedule H",
      approxBrandedPriceInr: 52.0, // per strip of 20
      janAushadhiEquivalent: "Ibuprofen & Paracetamol Tablets IP (400mg+325mg)",
      approxJanAushadhiPriceInr: 12.0,
      savingsPercentage: "77%",
      plainHindiSummary: "तेज सिरदर्द, दांत दर्द या बदन दर्द में राहत देती है। खाली पेट कभी न लें।",
      safetyWarning: "STRICT WARNING: Do NOT take on empty stomach. Avoid if having gastric ulcers, kidney disease, or suspected Dengue fever (bleeding risk).",
      tags: ["pain", "inflammation", "fever", "dental"]
    },
    {
      id: "in-arb-telma",
      brandName: "Telma 40",
      genericName: "Telmisartan",
      saltComposition: "Telmisartan 40 mg",
      manufacturer: "Glenmark Pharmaceuticals Ltd.",
      category: "Antihypertensive (ARB)",
      cdscoSchedule: "Schedule H",
      approxBrandedPriceInr: 220.0, // per strip of 30
      janAushadhiEquivalent: "Telmisartan Tablets IP 40mg",
      approxJanAushadhiPriceInr: 28.0,
      savingsPercentage: "87%",
      plainHindiSummary: "हाई ब्लड प्रेशर (उच्च रक्तचाप) को नियंत्रित करने की दवा। रोजाना एक ही समय पर लें।",
      safetyWarning: "Contraindicated in pregnancy (fetotoxic). Risk of hyperkalemia when combined with potassium supplements or spironolactone.",
      tags: ["hypertension", "bp", "heart", "chronic"]
    },
    {
      id: "in-ccb-amlong",
      brandName: "Amlong 5",
      genericName: "Amlodipine",
      saltComposition: "Amlodipine Besylate 5 mg",
      manufacturer: "Micro Labs Ltd.",
      category: "Antihypertensive (Calcium Channel Blocker)",
      cdscoSchedule: "Schedule H",
      approxBrandedPriceInr: 85.0, // per strip of 15
      janAushadhiEquivalent: "Amlodipine Tablets IP 5mg",
      approxJanAushadhiPriceInr: 6.0,
      savingsPercentage: "93%",
      plainHindiSummary: "रक्त वाहिकाओं को शिथिल कर ब्लड प्रेशर सामान्य करती है। पैरों में हल्की सूजन हो सकती है।",
      safetyWarning: "Common side effect: Pedal edema (swelling of ankles). Report sudden dizziness or chest tightness.",
      tags: ["hypertension", "bp", "cardiac"]
    },
    {
      id: "in-statin-atorva",
      brandName: "Atorva 10 / 20",
      genericName: "Atorvastatin",
      saltComposition: "Atorvastatin Calcium 10 mg / 20 mg",
      manufacturer: "Zydus Lifesciences",
      category: "Lipid-Lowering Agent (Statin)",
      cdscoSchedule: "Schedule H",
      approxBrandedPriceInr: 175.0, // per strip of 15
      janAushadhiEquivalent: "Atorvastatin Tablets IP 10mg",
      approxJanAushadhiPriceInr: 15.0,
      savingsPercentage: "91%",
      plainHindiSummary: "कोलेस्ट्रॉल घटाने और दिल के दौरे से बचाव की दवा। रात में सोने से पहले लें।",
      safetyWarning: "Promptly report unexplained muscle pain, tenderness, or weakness (risk of rhabdomyolysis). Avoid grapefruit juice.",
      tags: ["cholesterol", "heart", "statin"]
    },
    {
      id: "in-anti-montair",
      brandName: "Montair-LC",
      genericName: "Montelukast and Levocetirizine",
      saltComposition: "Montelukast Sodium 10 mg + Levocetirizine Dihydrochloride 5 mg",
      manufacturer: "Cipla Ltd.",
      category: "Antiallergic / Antiasthmatic",
      cdscoSchedule: "Schedule H",
      approxBrandedPriceInr: 320.0, // per strip of 15
      janAushadhiEquivalent: "Montelukast & Levocetirizine Tablets IP",
      approxJanAushadhiPriceInr: 35.0,
      savingsPercentage: "89%",
      plainHindiSummary: "एलर्जी, छींक, बहती नाक और दमे की सांस फूलने में उपयोगी। रात को लेना बेहतर होता है।",
      safetyWarning: "BOXED WARNING: Montelukast may induce neuropsychiatric changes (vivid nightmares, agitation, depressive thoughts). Discontinue if mood changes occur.",
      tags: ["allergy", "asthma", "cough", "respiratory"]
    },
    {
      id: "in-anti-azithral",
      brandName: "Azithral 500",
      genericName: "Azithromycin",
      saltComposition: "Azithromycin Dihydrate 500 mg",
      manufacturer: "Alembic Pharmaceuticals Ltd.",
      category: "Macrolide Antibiotic",
      cdscoSchedule: "Schedule H1",
      approxBrandedPriceInr: 130.0, // per strip of 5
      janAushadhiEquivalent: "Azithromycin Tablets IP 500mg",
      approxJanAushadhiPriceInr: 38.0,
      savingsPercentage: "71%",
      plainHindiSummary: "गले और फेफड़ों के इन्फेक्शन का 3 से 5 दिन का एंटीबायोटिक। बिना डॉक्टर की सलाह वायरल जुकाम में न लें।",
      safetyWarning: "Inappropriate overuse drives superbug resistance. Caution in patients with preexisting cardiac arrhythmias (QT prolongation).",
      tags: ["antibiotic", "throat", "chest", "macrolide"]
    },
    {
      id: "in-antiplatelet-ecosprin",
      brandName: "Ecosprin 75 / 150",
      genericName: "Aspirin (Enteric Coated)",
      saltComposition: "Acetylsalicylic Acid 75 mg / 150 mg",
      manufacturer: "USV Private Limited",
      category: "Antiplatelet / Blood Thinner",
      cdscoSchedule: "Schedule G",
      approxBrandedPriceInr: 12.0, // per strip of 14
      janAushadhiEquivalent: "Aspirin Gastro-resistant Tablets IP 75mg",
      approxJanAushadhiPriceInr: 3.5,
      savingsPercentage: "70%",
      plainHindiSummary: "खून को पतला कर दिल के दौरे और स्ट्रोक से बचाती है। चोट लगने पर खून देर से जमता है।",
      safetyWarning: "Bleeding risk. Strictly avoid combining with NSAIDs (Ibuprofen, Diclofenac) without gastroprotection. Contraindicated in active GI ulcers.",
      tags: ["blood-thinner", "heart", "stroke"]
    },
    {
      id: "in-calcium-shelcal",
      brandName: "Shelcal 500",
      genericName: "Calcium and Vitamin D3",
      saltComposition: "Calcium Carbonate 1250 mg (Eq. to Elemental Calcium 500 mg) + Vitamin D3 250 IU",
      manufacturer: "Torrent Pharmaceuticals Ltd.",
      category: "Nutritional Supplement (Bone Health)",
      cdscoSchedule: "OTC",
      approxBrandedPriceInr: 140.0, // per strip of 15
      janAushadhiEquivalent: "Calcium with Vitamin D3 Tablets IP",
      approxJanAushadhiPriceInr: 22.0,
      savingsPercentage: "84%",
      plainHindiSummary: "हड्डियों की मजबूती और ऑस्टियोपोरोसिस से बचाव के लिए कैल्शियम और विटामिन डी3।",
      safetyWarning: "Avoid excessive doses in patients with a history of renal calculi (kidney stones). Drink adequate fluids.",
      tags: ["calcium", "bones", "vitamin-d", "otc"]
    }
  ];

  /**
   * Search Indian Brand or Generic database.
   * @param {string} query - Brand or generic text query
   * @returns {Array<Object>} Matching pharma records
   */
  function searchIndianPharma(query) {
    if (!query || typeof query !== 'string') return [];
    const q = query.trim().toLowerCase();

    return INDIAN_PHARMA_CATALOG.filter(item => {
      return item.brandName.toLowerCase().includes(q) ||
             item.genericName.toLowerCase().includes(q) ||
             item.saltComposition.toLowerCase().includes(q) ||
             item.manufacturer.toLowerCase().includes(q) ||
             item.tags.some(t => t.toLowerCase().includes(q));
    });
  }

  /**
   * Find direct Jan Aushadhi generic alternative for a branded medicine.
   * @param {string} brandOrGeneric - Branded drug name or generic compound
   * @returns {Object|null} Matching record with price savings
   */
  function getJanAushadhiAlternative(brandOrGeneric) {
    if (!brandOrGeneric) return null;
    const match = INDIAN_PHARMA_CATALOG.find(item =>
      item.brandName.toLowerCase() === brandOrGeneric.toLowerCase() ||
      item.genericName.toLowerCase() === brandOrGeneric.toLowerCase()
    );
    return match || null;
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.data = root.SMASP.data || {};
  root.SMASP.data.indianPharma = {
    catalog: INDIAN_PHARMA_CATALOG,
    searchIndianPharma,
    getJanAushadhiAlternative
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      INDIAN_PHARMA_CATALOG,
      searchIndianPharma,
      getJanAushadhiAlternative
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
