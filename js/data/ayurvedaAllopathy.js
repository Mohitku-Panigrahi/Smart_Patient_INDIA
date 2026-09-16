/**
 * @file ayurvedaAllopathy.js
 * @description Clinically referenced Ayurveda–Allopathy Herb-Drug Interaction Matrix (AHDI).
 * Bridges traditional Indian medicine (AYUSH) with modern pharmacotherapy to prevent dangerous polypharmacy clashes.
 * @namespace SMASP.data.ayurvedaAllopathy
 */

(function (root) {
  'use strict';

  /**
   * Catalog of widely used Ayurvedic medicinal herbs & classical formulations.
   */
  const AYURVEDA_HERB_CATALOG = [
    {
      id: "ayur-ashwa",
      commonName: "Ashwagandha",
      sanskritName: "Withania somnifera",
      traditionalUse: "Adaptogen, vitality (Rasayana), stress, insomnia, joint stiffness",
      activeConstituents: "Withanolides, withaferin A, alkaloids",
      primaryOrganImpact: "Central Nervous System, Endocrine, Immune",
      hindiName: "अश्वगंधा"
    },
    {
      id: "ayur-giloy",
      commonName: "Giloy / Guduchi",
      sanskritName: "Tinospora cordifolia",
      traditionalUse: "Immune booster, chronic fevers, anti-inflammatory, liver tonic",
      activeConstituents: "Tinosporine, cordifolioside, berberine",
      primaryOrganImpact: "Immune System, Hepatic, Glycemic control",
      hindiName: "गिलोय / गुडूची"
    },
    {
      id: "ayur-guggul",
      commonName: "Guggulu",
      sanskritName: "Commiphora mukul",
      traditionalUse: "Hyperlipidemia, arthritis (Amavata), weight management",
      activeConstituents: "Guggulsterones E and Z",
      primaryOrganImpact: "Hepatic CYP enzymes, Coagulation cascade",
      hindiName: "गुग्गुलु"
    },
    {
      id: "ayur-triphala",
      commonName: "Triphala",
      sanskritName: "Emblica officinalis + Terminalia bellirica + Terminalia chebula",
      traditionalUse: "Digestive cleansing, constipation, eye health",
      activeConstituents: "Tannins, gallic acid, ellagic acid, chebulinic acid",
      primaryOrganImpact: "GI absorption, Iron chelation",
      hindiName: "त्रिफला"
    },
    {
      id: "ayur-tulsi",
      commonName: "Tulsi / Holy Basil",
      sanskritName: "Ocimum sanctum",
      traditionalUse: "Respiratory infections, cough, asthma, viral fever",
      activeConstituents: "Eugenol, rosmarinic acid, ursolic acid",
      primaryOrganImpact: "Platelet aggregation, Blood glucose",
      hindiName: "तुलसी"
    },
    {
      id: "ayur-karela",
      commonName: "Karela / Bitter Melon Extract",
      sanskritName: "Momordica charantia",
      traditionalUse: "Blood glucose reduction in diabetes (Madhumeha)",
      activeConstituents: "Charantin, polypeptide-p, vicine",
      primaryOrganImpact: "Pancreatic beta-cells, Glycemic regulation",
      hindiName: "करेला जामुन अर्क"
    },
    {
      id: "ayur-mulethi",
      commonName: "Mulethi / Yashtimadhu (Licorice)",
      sanskritName: "Glycyrrhiza glabra",
      traditionalUse: "Sore throat, acid reflux, peptic ulcers",
      activeConstituents: "Glycyrrhizin, glycyrrhetinic acid",
      primaryOrganImpact: "Renal mineralocorticoid receptors, Potassium balance",
      hindiName: "मुलेठी"
    },
    {
      id: "ayur-shankh",
      commonName: "Shankhpushpi",
      sanskritName: "Convolvulus pluricaulis",
      traditionalUse: "Memory enhancer (Medhya Rasayana), anxiety, insomnia",
      activeConstituents: "Convolvine, convolamine",
      primaryOrganImpact: "Central Nervous System, Anticonvulsant pathways",
      hindiName: "शंखपुष्पी"
    },
    {
      id: "ayur-curcumin",
      commonName: "Haldi / Curcumin",
      sanskritName: "Curcuma longa",
      traditionalUse: "Anti-inflammatory, wound healing, arthritis, immunity",
      activeConstituents: "Curcuminoids, turmerone",
      primaryOrganImpact: "Platelet function, Hepatic metabolism (CYP3A4)",
      hindiName: "हल्दी अर्क"
    },
    {
      id: "ayur-trikatu",
      commonName: "Trikatu (Piperine Complex)",
      sanskritName: "Piper nigrum + Piper longum + Zingiber officinale",
      traditionalUse: "Bio-enhancer (Yogavahi), digestive stimulant (Deepana/Pachana)",
      activeConstituents: "Piperine, 6-gingerol, piperlongumine",
      primaryOrganImpact: "Intestinal P-gp efflux pump, Hepatic CYP3A4 & CYP2C9",
      hindiName: "त्रिकटु"
    }
  ];

  /**
   * Classical Ayurvedic Polyherbal Formulations with Full Botanical & Phytochemical Decomposition.
   * Enables ingredient-level pharmacology and interaction mapping for classical multi-herb recipes.
   */
  const CLASSICAL_POLYHERBAL_CATALOG = [
    {
      id: "poly-triphala",
      name: "Triphala",
      classicalText: "Charaka Samhita / Ashtanga Hridaya",
      botanicalConstituents: [
        { commonName: "Haritaki", scientificName: "Terminalia chebula", part: "Fruit rind", phytochemicals: ["Chebulinic acid", "Tannins", "Gallic acid"] },
        { commonName: "Bibhitaki", scientificName: "Terminalia bellirica", part: "Fruit rind", phytochemicals: ["Gallic acid", "Ellagic acid", "Tannins"] },
        { commonName: "Amalaki", scientificName: "Emblica officinalis", part: "Pericarp", phytochemicals: ["Ascorbic acid", "Emblicanin", "Polyphenols"] }
      ],
      activeDrivers: ["Tannins", "Gallic acid"],
      mappedSingleHerbs: ["Triphala", "Amalaki", "Haritaki"],
      pharmacologicalInteractions: ["Iron chelation (reduces oral ferrous sulfate/ascorbate absorption by >60%)", "Mild peristalsis acceleration"],
      hindiName: "त्रिफला चूर्ण / वटी"
    },
    {
      id: "poly-trikatu",
      name: "Trikatu",
      classicalText: "Bhavaprakasha / Charaka Samhita",
      botanicalConstituents: [
        { commonName: "Maricha (Black Pepper)", scientificName: "Piper nigrum", part: "Fruit", phytochemicals: ["Piperine", "Chavicine"] },
        { commonName: "Pippali (Long Pepper)", scientificName: "Piper longum", part: "Fruit spike", phytochemicals: ["Piperine", "Piperlongumine"] },
        { commonName: "Shunthi (Dry Ginger)", scientificName: "Zingiber officinale", part: "Rhizome", phytochemicals: ["6-Gingerol", "6-Shogaol"] }
      ],
      activeDrivers: ["Piperine", "Gingerols"],
      mappedSingleHerbs: ["Trikatu", "Piperine", "Pippali", "Maricha"],
      pharmacologicalInteractions: ["Potent P-glycoprotein efflux pump inhibition", "Hepatic CYP3A4 & CYP2C9 metabolic suppression (2x-3x surge in Metformin, Phenytoin, Rifampicin AUC)"],
      hindiName: "त्रिकटु चूर्ण"
    },
    {
      id: "poly-dashamoola",
      name: "Dashamoola",
      classicalText: "Sushruta Samhita / Sharangadhara",
      botanicalConstituents: [
        { commonName: "Bilva", scientificName: "Aegle marmelos", part: "Root bark", phytochemicals: ["Marmelosin"] },
        { commonName: "Agnimantha", scientificName: "Premna integrifolia", part: "Root bark", phytochemicals: ["Premnine"] },
        { commonName: "Shyonaka", scientificName: "Oroxylum indicum", part: "Root bark", phytochemicals: ["Baicalein"] },
        { commonName: "Patala", scientificName: "Stereospermum suaveolens", part: "Root bark", phytochemicals: ["Lapachol"] },
        { commonName: "Gambhari", scientificName: "Gmelina arborea", part: "Root bark", phytochemicals: ["Luteolin"] },
        { commonName: "Brihati", scientificName: "Solanum indicum", part: "Whole plant", phytochemicals: ["Solanine"] },
        { commonName: "Kantakari", scientificName: "Solanum surattense", part: "Whole plant", phytochemicals: ["Solasodine"] },
        { commonName: "Gokshura", scientificName: "Tribulus terrestris", part: "Fruit/Root", phytochemicals: ["Protodioscin", "Saponins"] },
        { commonName: "Shalaparni", scientificName: "Desmodium gangeticum", part: "Root", phytochemicals: ["Gangetin"] },
        { commonName: "Prishniparni", scientificName: "Uraria picta", part: "Root", phytochemicals: ["Flavonoids"] }
      ],
      activeDrivers: ["Gokshura Saponins", "Flavonoids"],
      mappedSingleHerbs: ["Dashamoola", "Gokshura"],
      pharmacologicalInteractions: ["Diuretic synergy (potentiates loop/thiazide diuretics)", "Mild potassium excretion modulation"],
      hindiName: "दशमूल क्वाथ / अरिष्ट"
    },
    {
      id: "poly-chyawanprash",
      name: "Chyawanprash",
      classicalText: "Charaka Samhita Chikitsa Sthana",
      botanicalConstituents: [
        { commonName: "Amalaki (Amla base)", scientificName: "Emblica officinalis", part: "Fresh fruit pulp (>60%)", phytochemicals: ["Vitamin C", "Tannoids"] },
        { commonName: "Pippali", scientificName: "Piper longum", part: "Fruit", phytochemicals: ["Piperine"] },
        { commonName: "Guduchi (Giloy)", scientificName: "Tinospora cordifolia", part: "Stem", phytochemicals: ["Tinosporide", "Berberine"] },
        { commonName: "Ashwagandha", scientificName: "Withania somnifera", part: "Root", phytochemicals: ["Withanolides"] },
        { commonName: "Dashamoola Complex", scientificName: "Ten Roots", part: "Decoction", phytochemicals: ["Flavonoid glycosides"] },
        { commonName: "Elaichi (Cardamom)", scientificName: "Elettaria cardamomum", part: "Seed", phytochemicals: ["1,8-Cineole"] }
      ],
      activeDrivers: ["Piperine", "Guduchi", "Ashwagandha", "Sugar/Honey Base"],
      mappedSingleHerbs: ["Chyawanprash", "Amalaki", "Giloy / Guduchi", "Ashwagandha", "Pippali", "Trikatu"],
      pharmacologicalInteractions: ["Piperine-mediated pharmacokinetic bio-enhancement", "High jaggery/sugar matrix in diabetic regimens", "Immunostimulatory offset of immunosuppressants"],
      hindiName: "च्यवनप्राश अवलेह"
    },
    {
      id: "poly-chandraprabha",
      name: "Chandraprabha Vati",
      classicalText: "Sharangadhara Samhita",
      botanicalConstituents: [
        { commonName: "Guggulu (Purified)", scientificName: "Commiphora mukul", part: "Exudate", phytochemicals: ["Guggulsterones E & Z"] },
        { commonName: "Shilajit (Purified)", scientificName: "Asphaltum punjabianum", part: "Exudate", phytochemicals: ["Fulvic acid", "Humic acid"] },
        { commonName: "Haridra (Curcumin)", scientificName: "Curcuma longa", part: "Rhizome", phytochemicals: ["Curcuminoids"] },
        { commonName: "Daruharidra", scientificName: "Berberis aristata", part: "Stem", phytochemicals: ["Berberine"] },
        { commonName: "Trikatu (Piperine + Ginger)", scientificName: "Piper nigrum + P. longum + Zingiber", part: "Fruit/Rhizome", phytochemicals: ["Piperine", "Gingerols"] },
        { commonName: "Trivrit", scientificName: "Operculina turpethum", part: "Root", phytochemicals: ["Turpethin"] },
        { commonName: "Loha Bhasma", scientificName: "Incinerated Iron", part: "Calcined ash", phytochemicals: ["Micro-particulate Fe3O4"] }
      ],
      activeDrivers: ["Guggulsterones", "Piperine", "Fulvic Acid", "Curcuminoids"],
      mappedSingleHerbs: ["Chandraprabha Vati", "Guggulu", "Haldi / Curcumin", "Trikatu"],
      pharmacologicalInteractions: ["Synergistic antiplatelet bleeding with Ecosprin/Warfarin", "CYP3A4/P-gp bio-enhancement", "Additive hypoglycemia with oral antidiabetics"],
      hindiName: "चन्द्रप्रभा वटी"
    },
    {
      id: "poly-kanchnar",
      name: "Kanchnar Guggulu",
      classicalText: "Bhavaprakasha",
      botanicalConstituents: [
        { commonName: "Kanchnar Bark", scientificName: "Bauhinia variegata", part: "Stem bark", phytochemicals: ["Flavonoids", "Tannins"] },
        { commonName: "Guggulu", scientificName: "Commiphora mukul", part: "Purified gum", phytochemicals: ["Guggulsterones"] },
        { commonName: "Triphala", scientificName: "Three Myrobalans", part: "Fruits", phytochemicals: ["Gallic acid"] },
        { commonName: "Trikatu", scientificName: "Three Pungents", part: "Fruits/Rhizome", phytochemicals: ["Piperine"] },
        { commonName: "Varuna", scientificName: "Crataeva nurvala", part: "Stem bark", phytochemicals: ["Lupeol"] }
      ],
      activeDrivers: ["Guggulsterones", "Piperine", "Lupeol"],
      mappedSingleHerbs: ["Kanchnar Guggulu", "Guggulu", "Triphala", "Trikatu"],
      pharmacologicalInteractions: ["Antiplatelet and anticoagulant bleeding augmentation", "Thyroid hormone interaction", "CYP3A4 modulation"],
      hindiName: "कांचनार गुग्गुलु"
    },
    {
      id: "poly-arogyavardhini",
      name: "Arogyavardhini Vati",
      classicalText: "Rasaratnasamucchaya",
      botanicalConstituents: [
        { commonName: "Kutki", scientificName: "Picrorhiza kurroa", part: "Rhizome", phytochemicals: ["Picroside I & II", "Kutkoside"] },
        { commonName: "Triphala", scientificName: "Terminalia chebula, bellirica, Emblica", part: "Fruits", phytochemicals: ["Tannins"] },
        { commonName: "Shilajit", scientificName: "Purified asphaltum", part: "Mineral resin", phytochemicals: ["Fulvic acid"] },
        { commonName: "Guggulu", scientificName: "Commiphora mukul", part: "Purified resin", phytochemicals: ["Guggulsterones"] },
        { commonName: "Chitrak", scientificName: "Plumbago zeylanica", part: "Root", phytochemicals: ["Plumbagin"] }
      ],
      activeDrivers: ["Picrosides", "Guggulsterones", "Plumbagin"],
      mappedSingleHerbs: ["Arogyavardhini Vati", "Guggulu", "Triphala"],
      pharmacologicalInteractions: ["Hepatic cytochrome modulation", "Additive antidiabetic and lipid-lowering synergy", "Bleeding hazard with antiplatelets"],
      hindiName: "आरोग्यवर्धिनी वटी"
    }
  ];

  /**
   * Detailed Herb-Drug Interaction Matrix.
   */
  const AYURVEDA_ALLOPATHY_INTERACTIONS = [
    {
      id: "aahi-001",
      herb: "Ashwagandha",
      allopathyGroup: "Sedatives / Benzodiazepines / Hypnotics",
      allopathyExamples: ["Alprazolam", "Clonazepam", "Diazepam", "Zolpidem", "Tramadol"],
      severity: "AVOID",
      title: "Excessive Central Nervous System Depression",
      mechanism: "Ashwagandha exerts intrinsic GABA-mimetic central nervous system calming activity. Co-administration potentiates sedative and hypnotic effects.",
      clinicalRisk: "Severe drowsiness, profound motor impairment, respiratory depression, and fall risk.",
      recommendation: "Avoid concurrent ingestion. Do not operate machinery or drive if both have been consumed.",
      hindiWarning: "अश्वगंधा और नींद/डिप्रेशन की दवाओं (जैसे अल्प्रैजोलम, क्लोनाजेपाम) को एक साथ न लें। इससे अत्यधिक बेहोशी और सांस लेने में कठिनाई हो सकती है।",
      evidenceLevel: "Established",
      source: "Ayush Research Portal / NIH NCCIH"
    },
    {
      id: "aahi-002",
      herb: "Ashwagandha",
      allopathyGroup: "Antidiabetic Agents",
      allopathyExamples: ["Metformin", "Glimepiride", "Gliclazide", "Insulin", "Glycomet"],
      severity: "CAUTION",
      title: "Compounded Hypoglycemia Risk",
      mechanism: "Ashwagandha enhances cellular insulin sensitivity and glucose uptake. Combined with prescription antidiabetics, synergistic blood sugar drop can occur.",
      clinicalRisk: "Tremors, cold sweats, confusion, dizzy spells, or acute hypoglycemic shock.",
      recommendation: "Monitor blood glucose levels frequently. Report hypoglycemic episodes to your endocrinologist.",
      hindiWarning: "डायबिटीज की दवाओं के साथ अश्वगंधा लेने से शुगर का स्तर खतरनाक रूप से गिर सकता है (हाइपोग्लाइसीमिया)। नियमित शुगर चेक करें।",
      evidenceLevel: "Moderate Evidence",
      source: "Ayush Research Portal"
    },
    {
      id: "aahi-003",
      herb: "Ashwagandha",
      allopathyGroup: "Thyroid Hormone Replacement",
      allopathyExamples: ["Levothyroxine", "Thyronorm", "Eltroxin"],
      severity: "CAUTION",
      title: "Thyroid Overstimulation / Hyperthyroidism Shift",
      mechanism: "Ashwagandha stimulates endogenous T3 and T4 hormone synthesis. May unbalance controlled hypothyroid patients on replacement therapy.",
      clinicalRisk: "Palpitations, tremors, anxiety, heat intolerance, and insomnia.",
      recommendation: "Monitor serum TSH, free T3, and free T4 every 4-6 weeks if taking both.",
      hindiWarning: "थायराइड की दवा (Thyronorm/Eltroxin) के साथ अश्वगंधा लेने से थायराइड हार्मोन बढ़ सकता है और घबराहट हो सकती है।",
      evidenceLevel: "Moderate Evidence",
      source: "Journal of Ayurveda & Integrative Medicine"
    },
    {
      id: "aahi-004",
      herb: "Giloy / Guduchi",
      allopathyGroup: "Oral Antidiabetics / Insulin",
      allopathyExamples: ["Metformin", "Glimepiride", "Glycomet", "Vildagliptin", "Insulin"],
      severity: "CAUTION",
      title: "Additive Hypoglycemic Effect",
      mechanism: "Giloy exhibits potent insulinomimetic and gluconeogenesis-inhibiting actions.",
      clinicalRisk: "Precipitous drops in capillary blood glucose, particularly in elderly diabetic patients.",
      recommendation: "Avoid concentrated decoctions (Kadha) alongside peak-acting sulfonylureas without medical advice.",
      hindiWarning: "गिलोय का काढ़ा डायबिटीज की दवाओं के असर को बहुत तेज कर सकता है जिससे अचानक चक्कर व कमजोरी आ सकती है।",
      evidenceLevel: "Moderate Evidence",
      source: "Ayush Research Portal"
    },
    {
      id: "aahi-005",
      herb: "Giloy / Guduchi",
      allopathyGroup: "Immunosuppressive Drugs",
      allopathyExamples: ["Prednisolone", "Dexamethasone", "Methotrexate", "Tacrolimus", "Azathioprine"],
      severity: "AVOID",
      title: "Immunostimulatory Neutralization of Immunosuppression",
      mechanism: "Giloy is a strong immunomodulator stimulating macrophage activity and lymphocyte proliferation, directly opposing drug-induced therapeutic immunosuppression.",
      clinicalRisk: "Flare-ups of autoimmune disease (e.g. Rheumatoid Arthritis, Lupus) or graft compromise.",
      recommendation: "Contraindicated in transplant recipients and patients receiving active immunosuppressive therapies.",
      hindiWarning: "गिलोय रोग प्रतिरोधक क्षमता को अत्यधिक सक्रिय करता है, जिससे स्टेरॉयड और ऑटोइम्यून दवाओं का असर समाप्त हो सकता है।",
      evidenceLevel: "Established",
      source: "Pharmacognosy Reviews"
    },
    {
      id: "aahi-006",
      herb: "Guggulu",
      allopathyGroup: "Anticoagulants / Antiplatelets",
      allopathyExamples: ["Aspirin", "Ecosprin", "Warfarin", "Clopidogrel", "Dabigatran"],
      severity: "AVOID",
      title: "Synergistic Systemic Bleeding Risk",
      mechanism: "Guggulsterones inhibit platelet aggregation. Combined with allopathic blood thinners, clotting time is significantly extended.",
      clinicalRisk: "Unexplained bruising, epistaxis (nosebleeds), gastrointestinal bleeding, hematuria.",
      recommendation: "Avoid concurrent use. Discontinue Guggulu at least 14 days prior to any planned surgery or dental procedure.",
      hindiWarning: "खून पतला करने वाली दवाओं (Ecosprin, Warfarin) के साथ गुग्गुल लेने से रक्तस्राव (ब्लीडिंग) का खतरा बहुत बढ़ जाता है।",
      evidenceLevel: "Established",
      source: "Natural Medicines Comprehensive Database"
    },
    {
      id: "aahi-007",
      herb: "Guggulu",
      allopathyGroup: "Statins / Lipid Lowering Drugs",
      allopathyExamples: ["Atorvastatin", "Rosuvastatin", "Simvastatin", "Atorva"],
      severity: "CAUTION",
      title: "CYP3A4 Induction & Hepatic Clearance Competition",
      mechanism: "Guggulu can modulate CYP3A4 enzymes and hepatic transporters, altering bioavailability and clearance of statins.",
      clinicalRisk: "Altered statin efficacy or increased hepatic transaminase elevations and myopathy risk.",
      recommendation: "Routine liver function tests (LFT) and creatine kinase monitoring recommended.",
      hindiWarning: "कोलेस्ट्रॉल कम करने वाली स्टेटिन दवाओं के साथ गुग्गुल लेने पर लिवर एंजाइम्स की नियमित जांच कराएं।",
      evidenceLevel: "Moderate Evidence",
      source: "Ayush Research Portal"
    },
    {
      id: "aahi-008",
      herb: "Mulethi / Licorice",
      allopathyGroup: "Antihypertensives / Diuretics",
      allopathyExamples: ["Telmisartan", "Amlodipine", "Furosemide", "Hydrochlorothiazide", "Lasix"],
      severity: "AVOID",
      title: "Pseudo-Hyperaldosteronism, Hypokalemia & BP Elevation",
      mechanism: "Glycyrrhizin inhibits 11-beta-hydroxysteroid dehydrogenase type 2, resulting in cortisol-induced mineralocorticoid receptor activation.",
      clinicalRisk: "Sodium retention, severe hypokalemia (dangerously low potassium), cardiac arrhythmia, and rebound hypertension.",
      recommendation: "Hypertensive and cardiac patients must avoid regular or large doses of Mulethi.",
      hindiWarning: "हाई ब्लड प्रेशर और पेशाब बढ़ाने वाली दवाओं के साथ मुलेठी न लें। यह ब्लड प्रेशर बढ़ा सकती है और शरीर में पोटैशियम कम कर सकती है।",
      evidenceLevel: "Established",
      source: "NIH NCCIH"
    },
    {
      id: "aahi-009",
      herb: "Karela / Bitter Melon Extract",
      allopathyGroup: "Oral Antidiabetics / Insulin",
      allopathyExamples: ["Metformin", "Glimepiride", "Insulin", "Teneligliptin"],
      severity: "CAUTION",
      title: "Severe Synergistic Hypoglycemia",
      mechanism: "Charantin and peptide-P stimulate peripheral glucose disposal and pancreatic insulin secretion.",
      clinicalRisk: "Nocturnal hypoglycemia, diaphoresis, acute neuroglycopenia.",
      recommendation: "Dose adjustments of prescription antidiabetics may be required under endocrinologist supervision.",
      hindiWarning: "करेला-जामुन जूस और एलोपैथिक शुगर की गोलियां एक साथ लेने पर शुगर अचानक बहुत कम हो सकती है।",
      evidenceLevel: "Moderate Evidence",
      source: "Phytomedicine Journal"
    },
    {
      id: "aahi-010",
      herb: "Shankhpushpi",
      allopathyGroup: "Antiepileptic / Anticonvulsant Drugs",
      allopathyExamples: ["Phenytoin", "Eptoin", "Carbamazepine"],
      severity: "AVOID",
      title: "Reduction of Phenytoin Bioavailability & Seizure Recurrence",
      mechanism: "Co-administration significantly decreases plasma concentrations and steady-state AUC of phenytoin.",
      clinicalRisk: "Breakthrough epileptic seizures due to sub-therapeutic antiepileptic drug levels.",
      recommendation: "Strictly avoid Shankhpushpi preparations in patients on therapeutic antiepileptic regimens.",
      hindiWarning: "मिर्गी / दौरे की दवाओं (Eptoin, Phenytoin) के साथ शंखपुष्पी कभी न लें। इससे दौरे दोबारा शुरू हो सकते हैं।",
      evidenceLevel: "Established",
      source: "Epilepsia Research"
    },
    {
      id: "aahi-011",
      herb: "Triphala",
      allopathyGroup: "Oral Iron Supplements / Multivitamins",
      allopathyExamples: ["Ferrous Ascorbate", "Ferrous Sulfate", "Autrin", "Dexorange"],
      severity: "CAUTION",
      title: "Tannin Chelation & Impaired Iron Absorption",
      mechanism: "Polyphenols and high tannin content in Haritaki/Amalaki form insoluble complexes with ferric and ferrous ions in the gut lumen.",
      clinicalRisk: "Therapeutic failure of iron deficiency anemia treatment.",
      recommendation: "Separate administration by at least 3 to 4 hours.",
      hindiWarning: "त्रिफला और आयरन/खून की गोलियों को एक साथ न लें। दोनों के बीच कम से कम 3 से 4 घंटे का अंतर रखें।",
      evidenceLevel: "Moderate Evidence",
      source: "Ayush Research Portal"
    },
    {
      id: "aahi-012",
      herb: "Haldi / Curcumin",
      allopathyGroup: "NSAIDs / Antiplatelets / Anticoagulants",
      allopathyExamples: ["Aspirin", "Ibuprofen", "Combiflam", "Warfarin", "Ecosprin"],
      severity: "CAUTION",
      title: "Enhanced Antiplatelet Effect & Gastric Mucosal Sensitivity",
      mechanism: "Curcumin possesses mild thromboxane A2 inhibition and anti-inflammatory synergy.",
      clinicalRisk: "Increased tendency for bruising and gastrointestinal irritation when taken with high-dose NSAIDs.",
      recommendation: "Avoid high-dose curcumin extract capsules alongside prescription blood thinners without clinical oversight.",
      hindiWarning: "दर्द निवारक दवाओं और खून पतला करने वाली गोलियों के साथ अत्यधिक हल्दी सप्लीमेंट्स लेने से पेट में जलन व ब्लीडिंग का जोखिम हो सकता है।",
      evidenceLevel: "Theoretical / In Vitro",
      source: "NIH NCCIH"
    },
    {
      id: "aahi-013",
      herb: "Trikatu",
      allopathyGroup: "Oral Antidiabetics / Metformin",
      allopathyExamples: ["Metformin", "Glycomet", "Glimepiride"],
      severity: "AVOID",
      title: "Piperine Bio-Enhancer Surge: Precipitous Hypoglycemic Shock",
      mechanism: "Piperine in Trikatu suppresses intestinal P-glycoprotein efflux transporters and hepatic CYP3A4, doubling systemic absorption and AUC of Metformin.",
      clinicalRisk: "Rapid unexpected drop in capillary glucose, diaphoresis, neuroglycopenia, and acute hypoglycemic collapse.",
      recommendation: "Avoid concurrent ingestion of standardized Trikatu capsules with antidiabetics. Separate by at least 4 hours if advised by an Ayurvedic physician.",
      hindiWarning: "त्रिकटु (काली मिर्च, सोंठ, पिप्पली) मेटफॉर्मिन के अवशोषण को 2 गुना बढ़ा देता है, जिससे शुगर खतरनाक रूप से गिर सकती है।",
      evidenceLevel: "Established",
      source: "Clinical Pharmacokinetics / Ayurvedic Pharmacopoeia of India"
    },
    {
      id: "aahi-014",
      herb: "Trikatu",
      allopathyGroup: "Antiepileptics / Phenytoin",
      allopathyExamples: ["Phenytoin", "Eptoin", "Dilantin"],
      severity: "AVOID",
      title: "Piperine Induced Phenytoin Neurotoxicity Surge",
      mechanism: "Piperine inhibits first-pass metabolism and hepatic CYP2C9 clearance of phenytoin, producing a toxic surge in plasma drug levels.",
      clinicalRisk: "Phenytoin toxicity symptoms: severe ataxia, nystagmus, diplopia, slurred speech, and mental confusion.",
      recommendation: "Strictly avoid high-dose Trikatu preparations in patients maintained on phenytoin.",
      hindiWarning: "मिर्गी की दवा (Phenytoin) के साथ त्रिकटु लेने से दवा का स्तर शरीर में बहुत बढ़ सकता है और नसों में कमजोरी व चक्कर आ सकते हैं।",
      evidenceLevel: "Established",
      source: "Epilepsy Research / Phytomedicine"
    },
    {
      id: "aahi-015",
      herb: "Chandraprabha Vati",
      allopathyGroup: "Anticoagulants / Antiplatelets",
      allopathyExamples: ["Aspirin", "Ecosprin", "Warfarin", "Clopidogrel"],
      severity: "AVOID",
      title: "Guggulu-Platelet Synergy: Critical Bleeding Hazard",
      mechanism: "Chandraprabha Vati contains purified Guggulu and Haridra which exert additive antiplatelet actions alongside prescription blood thinners.",
      clinicalRisk: "Severe gastrointestinal bleeding, spontaneous subcutaneous hematomas, and prolonged bleeding times.",
      recommendation: "Avoid concurrent administration. Discontinue Chandraprabha Vati 10-14 days prior to any elective surgery.",
      hindiWarning: "चन्द्रप्रभा वटी में गुग्गुल होता है। इसे खून पतला करने वाली दवाओं (Ecosprin, Warfarin) के साथ लेने से गंभीर ब्लीडिंग का खतरा होता है।",
      evidenceLevel: "Established",
      source: "Ayush Research Portal / Natural Medicines Database"
    },
    {
      id: "aahi-016",
      herb: "Dashamoola",
      allopathyGroup: "Diuretics",
      allopathyExamples: ["Furosemide", "Lasix", "Hydrochlorothiazide", "Spironolactone"],
      severity: "CAUTION",
      title: "Additive Aquaretic/Diuretic Synergy & Electrolyte Flux",
      mechanism: "Dashamoola includes Gokshura (Tribulus terrestris), which exerts mild natural aquaretic diuretic effects, potentiating loop and thiazide diuretics.",
      clinicalRisk: "Potential volume depletion, orthostatic hypotension, and electrolyte shifts.",
      recommendation: "Monitor blood pressure and serum electrolytes if combining regular Dashamoola decoctions with prescription diuretics.",
      hindiWarning: "दशमूल में गोक्षुर होने के कारण यह पेशाब बढ़ाने वाली दवाओं (Lasix) के असर को तेज कर सकता है। चक्कर आने पर डॉक्टर से संपर्क करें।",
      evidenceLevel: "Moderate Evidence",
      source: "Journal of Ethnopharmacology"
    }
  ];

  /**
   * Decomposes a classical polyherbal formulation into its constituent single herbs and active drivers.
   * @param {string} query - Polyherbal or herb name
   * @returns {Object|null} Decomposed botanical breakdown or null
   */
  function decomposePolyherbal(query) {
    if (!query || typeof query !== 'string') return null;
    const q = query.toLowerCase().trim();
    return CLASSICAL_POLYHERBAL_CATALOG.find(poly => 
      poly.name.toLowerCase().includes(q) || 
      q.includes(poly.name.toLowerCase()) ||
      poly.hindiName.includes(q)
    ) || null;
  }

  /**
   * Cross-checks an Ayurvedic medicine/herb against a concurrent allopathic prescription.
   * Automatically performs recursive polyherbal decomposition to uncover hidden botanical-drug clashes.
   *
   * @param {string} ayurvedaQuery - Herb or Ayurvedic medicine name
   * @param {string} allopathyQuery - Allopathic drug or generic name
   * @returns {Array<Object>} List of identified clinical interactions
   */
  function evaluateHerbDrugInteraction(ayurvedaQuery, allopathyQuery) {
    if (!ayurvedaQuery || !allopathyQuery) return [];

    const ayur = ayurvedaQuery.toLowerCase().trim();
    const allo = allopathyQuery.toLowerCase().trim();

    // Check if the query is a classical polyherbal formulation
    const polyMatch = decomposePolyherbal(ayur);
    const searchHerbs = polyMatch ? [ayur, ...polyMatch.mappedSingleHerbs] : [ayur];

    const matchedInteractions = [];
    const seenIds = new Set();

    searchHerbs.forEach(herbToken => {
      const hLower = herbToken.toLowerCase();
      AYURVEDA_ALLOPATHY_INTERACTIONS.forEach(rule => {
        if (seenIds.has(rule.id)) return;

        const herbMatch = rule.herb.toLowerCase().includes(hLower) ||
                          hLower.includes(rule.herb.toLowerCase()) ||
                          (rule.hindiWarning && rule.hindiWarning.includes(hLower));

        const alloMatch = rule.allopathyGroup.toLowerCase().includes(allo) ||
                          rule.allopathyExamples.some(ex => ex.toLowerCase().includes(allo) || allo.includes(ex.toLowerCase()));

        if (herbMatch && alloMatch) {
          seenIds.add(rule.id);
          const enriched = { ...rule };
          if (polyMatch && herbToken !== ayur) {
            enriched.decomposedFrom = polyMatch.name;
            enriched.constituentDriver = herbToken;
          }
          matchedInteractions.push(enriched);
        }
      });
    });

    return matchedInteractions;
  }

  /**
   * Returns all known interactions for a given Ayurvedic herb or polyherbal formulation.
   * @param {string} herbName
   * @returns {Array<Object>}
   */
  function getInteractionsByHerb(herbName) {
    if (!herbName) return [];
    const q = herbName.toLowerCase().trim();
    const polyMatch = decomposePolyherbal(q);
    const searchHerbs = polyMatch ? [q, ...polyMatch.mappedSingleHerbs] : [q];

    const results = [];
    const seenIds = new Set();

    searchHerbs.forEach(hToken => {
      const hLower = hToken.toLowerCase();
      AYURVEDA_ALLOPATHY_INTERACTIONS.forEach(r => {
        if (seenIds.has(r.id)) return;
        if (r.herb.toLowerCase().includes(hLower) || hLower.includes(r.herb.toLowerCase())) {
          seenIds.add(r.id);
          results.push(r);
        }
      });
    });

    return results;
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.data = root.SMASP.data || {};
  root.SMASP.data.ayurvedaAllopathy = {
    herbs: AYURVEDA_HERB_CATALOG,
    polyherbals: CLASSICAL_POLYHERBAL_CATALOG,
    interactions: AYURVEDA_ALLOPATHY_INTERACTIONS,
    decomposePolyherbal,
    evaluateHerbDrugInteraction,
    getInteractionsByHerb
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      AYURVEDA_HERB_CATALOG,
      CLASSICAL_POLYHERBAL_CATALOG,
      AYURVEDA_ALLOPATHY_INTERACTIONS,
      decomposePolyherbal,
      evaluateHerbDrugInteraction,
      getInteractionsByHerb
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
