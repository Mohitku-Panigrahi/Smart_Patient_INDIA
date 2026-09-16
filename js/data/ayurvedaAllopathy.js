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
      hindiWarning: "अश्वगंधा और नींद/डिप्रेशन की दवाओं (जैसे अल्प्रैजोलम, क्लोनाजेपाम) को एक साथ न लें। इससे अत्यधिक बेहोशी और सांस लेने में कठिनाई हो सकती है।"
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
      hindiWarning: "डायबिटीज की दवाओं के साथ अश्वगंधा लेने से शुगर का स्तर खतरनाक रूप से गिर सकता है (हाइपोग्लाइसीमिया)। नियमित शुगर चेक करें।"
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
      hindiWarning: "थायराइड की दवा (Thyronorm/Eltroxin) के साथ अश्वगंधा लेने से थायराइड हार्मोन बढ़ सकता है और घबराहट हो सकती है।"
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
      hindiWarning: "गिलोय का काढ़ा डायबिटीज की दवाओं के असर को बहुत तेज कर सकता है जिससे अचानक चक्कर व कमजोरी आ सकती है।"
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
      hindiWarning: "गिलोय रोग प्रतिरोधक क्षमता को अत्यधिक सक्रिय करता है, जिससे स्टेरॉयड और ऑटोइम्यून दवाओं का असर समाप्त हो सकता है।"
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
      hindiWarning: "खून पतला करने वाली दवाओं (Ecosprin, Warfarin) के साथ गुग्गुल लेने से रक्तस्राव (ब्लीडिंग) का खतरा बहुत बढ़ जाता है।"
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
      hindiWarning: "कोलेस्ट्रॉल कम करने वाली स्टेटिन दवाओं के साथ गुग्गुल लेने पर लिवर एंजाइम्स की नियमित जांच कराएं।"
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
      hindiWarning: "हाई ब्लड प्रेशर और पेशाब बढ़ाने वाली दवाओं के साथ मुलेठी न लें। यह ब्लड प्रेशर बढ़ा सकती है और शरीर में पोटैशियम कम कर सकती है।"
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
      hindiWarning: "करेला-जामुन जूस और एलोपैथिक शुगर की गोलियां एक साथ लेने पर शुगर अचानक बहुत कम हो सकती है।"
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
      hindiWarning: "मिर्गी / दौरे की दवाओं (Eptoin, Phenytoin) के साथ शंखपुष्पी कभी न लें। इससे दौरे दोबारा शुरू हो सकते हैं।"
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
      hindiWarning: "त्रिफला और आयरन/खून की गोलियों को एक साथ न लें। दोनों के बीच कम से कम 3 से 4 घंटे का अंतर रखें।"
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
      hindiWarning: "दर्द निवारक दवाओं और खून पतला करने वाली गोलियों के साथ अत्यधिक हल्दी सप्लीमेंट्स लेने से पेट में जलन व ब्लीडिंग का जोखिम हो सकता है।"
    }
  ];

  /**
   * Cross-checks an Ayurvedic medicine/herb against a concurrent allopathic prescription.
   * @param {string} ayurvedaQuery - Herb or Ayurvedic medicine name
   * @param {string} allopathyQuery - Allopathic drug or generic name
   * @returns {Array<Object>} List of identified clinical interactions
   */
  function evaluateHerbDrugInteraction(ayurvedaQuery, allopathyQuery) {
    if (!ayurvedaQuery || !allopathyQuery) return [];

    const ayur = ayurvedaQuery.toLowerCase().trim();
    const allo = allopathyQuery.toLowerCase().trim();

    return AYURVEDA_ALLOPATHY_INTERACTIONS.filter(rule => {
      const herbMatch = rule.herb.toLowerCase().includes(ayur) ||
                        ayur.includes(rule.herb.toLowerCase()) ||
                        (rule.hindiWarning && rule.hindiWarning.includes(ayur));

      const alloMatch = rule.allopathyGroup.toLowerCase().includes(allo) ||
                        rule.allopathyExamples.some(ex => ex.toLowerCase().includes(allo) || allo.includes(ex.toLowerCase()));

      return herbMatch && alloMatch;
    });
  }

  /**
   * Returns all known interactions for a given Ayurvedic herb.
   * @param {string} herbName
   * @returns {Array<Object>}
   */
  function getInteractionsByHerb(herbName) {
    if (!herbName) return [];
    const q = herbName.toLowerCase().trim();
    return AYURVEDA_ALLOPATHY_INTERACTIONS.filter(r => r.herb.toLowerCase().includes(q) || q.includes(r.herb.toLowerCase()));
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.data = root.SMASP.data || {};
  root.SMASP.data.ayurvedaAllopathy = {
    herbs: AYURVEDA_HERB_CATALOG,
    interactions: AYURVEDA_ALLOPATHY_INTERACTIONS,
    evaluateHerbDrugInteraction,
    getInteractionsByHerb
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      AYURVEDA_HERB_CATALOG,
      AYURVEDA_ALLOPATHY_INTERACTIONS,
      evaluateHerbDrugInteraction,
      getInteractionsByHerb
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
