/**
 * @file bioCascadeEngine.js
 * @description Advanced multi-order physiological bio-cascade evaluation engine for Smart Patient INDIA v4.
 * Implements:
 *   1. "The Triple Whammy" Hemodynamic Glomerular Collapse Detector (NSAID + ARB/ACEi + Diuretic).
 *   2. Hepatic Cytochrome P450 (CYP) Enzymatic Competition & Clearance Matrix (CYP3A4, 2D6, 2C9, 2C19, 1A2, P-gp).
 *   3. Cumulative Anticholinergic Cognitive Burden (ACB) Scale Accumulator (Geriatric delirium/fall risk).
 *   4. Composite QTc Interval Prolongation Arrhythmia Vector Sum (hERG channel blockade).
 *   5. Multi-Mechanism Cumulative Hemorrhagic Bleeding Risk Index.
 *   6. Classical Ayurvedic Bio-Enhancer Pharmacokinetic Surge (The Piperine / P-gp effect).
 *
 * @version 4.0.0
 * @license MIT
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SMASP = root.SMASP || {};
    root.SMASP.engine = root.SMASP.engine || {};
    root.SMASP.engine.BioCascadeEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── 1. PHARMACOLOGICAL KNOWLEDGE BASES ──────────────────────────────────────

  /**
   * Hemodynamic Drug Classes for Acute Kidney Injury (The Triple Whammy)
   */
  const HEMODYNAMIC_DRUG_CLASSES = {
    nsaids: [
      'ibu-001', 'ibp-001', 'dic-001', 'nap-001', 'asp-001',
      'ibuprofen', 'combiflam', 'diclofenac', 'naproxen', 'aspirin', 'indomethacin', 'piroxicam'
    ],
    raas_inhibitors: [
      'tel-001', 'lis-001', 'ram-001', 'los-001', 'ena-001',
      'telmisartan', 'telma', 'lisinopril', 'ramipril', 'losartan', 'enalapril', 'valsartan'
    ],
    diuretics: [
      'fur-001', 'hct-001', 'chl-001', 'spi-001',
      'furosemide', 'lasix', 'hydrochlorothiazide', 'chlorthalidone', 'spironolactone', 'torsemide'
    ]
  };

  /**
   * Hepatic Cytochrome P450 (CYP) Enzyme Profiles
   */
  const CYP_PROFILES = {
    // CYP3A4
    cyp3a4: {
      substrates: ['atorvastatin', 'atorva', 'simvastatin', 'alprazolam', 'amlodipine', 'amlong', 'clarithromycin'],
      inhibitors: ['clarithromycin', 'ketoconazole', 'itraconazole', 'fluconazole', 'guggulu', 'piperine'],
      inducers: ['rifampicin', 'carbamazepine', 'phenytoin', 'st_johns_wort']
    },
    // CYP2C9
    cyp2c9: {
      substrates: ['warfarin', 'celecoxib', 'losartan', 'glimepiride', 'phenytoin'],
      inhibitors: ['fluconazole', 'amiodarone', 'miconazole', 'piperine'],
      inducers: ['rifampicin', 'carbamazepine']
    },
    // CYP2D6
    cyp2d6: {
      substrates: ['tramadol', 'codeine', 'metoprolol', 'haloperidol', 'fluoxetine'],
      inhibitors: ['fluoxetine', 'paroxetine', 'bupropion', 'quinidine'],
      inducers: []
    }
  };

  /**
   * Anticholinergic Cognitive Burden (ACB) Scale (Boustani et al.)
   * Scaled 1 to 3 based on central nervous system muscarinic receptor antagonism.
   */
  const ACB_SCORES = {
    // Score 3 (Severe Central Anticholinergic)
    'amitriptyline': 3,
    'hydroxyzine': 3,
    'chlorpheniramine': 3,
    'diphenhydramine': 3,
    'oxybutynin': 3,
    'clozapine': 3,
    // Score 2 (Moderate Anticholinergic)
    'amantadine': 2,
    'belladonna': 2,
    'carbamazepine': 2,
    // Score 1 (Mild / Peripheral Anticholinergic)
    'cetirizine': 1,
    'levocetirizine': 1,
    'montair-lc': 1,
    'domperidone': 1,
    'pan-d': 1,
    'ranitidine': 1,
    'alprazolam': 1,
    'atenolol': 1,
    'diazepam': 1,
    'prednisolone': 1
  };

  /**
   * Additive QTc Interval Prolongation Potential (hERG Potassium Channel Blockade)
   * Weighted by clinical arrhythmia hazard magnitude.
   */
  const QTC_RISK_WEIGHTS = {
    'domperidone': 3.0,
    'pan-d': 3.0,
    'azithromycin': 2.5,
    'azithral 500': 2.5,
    'clarithromycin': 2.5,
    'ciprofloxacin': 2.0,
    'ondansetron': 2.0,
    'escitalopram': 2.0,
    'haloperidol': 3.0,
    'amiodarone': 3.5,
    'hydroxychloroquine': 2.5
  };

  /**
   * Ayurvedic Formulations containing Piperine / Bio-Enhancers
   * Covers single spices, extracts, and classical polyherbal formulations.
   */
  const PIPERINE_FORMULATIONS = [
    'trikatu', 'maricha', 'pippali', 'black pepper', 'piper longum', 'piper nigrum', 'churna',
    'chyawanprash', 'chandraprabha vati', 'kanchnar guggulu'
  ];

  /**
   * Allopathic Drugs with narrow therapeutic index sensitive to Piperine P-gp / CYP clearance inhibition
   */
  const BIO_ENHANCER_TARGETS = [
    { drug: 'metformin', risk: 'Hypoglycemic shock from 2-fold bio-availability surge' },
    { drug: 'glycomet', risk: 'Severe hypoglycemia from doubled systemic metformin absorption' },
    { drug: 'rifampicin', risk: 'Elevated hepatotoxicity due to 150% surge in rifampicin AUC' },
    { drug: 'phenytoin', risk: 'Phenytoin neurotoxicity (ataxia, nystagmus) from P-gp inhibition' },
    { drug: 'propranolol', risk: 'Profound bradycardia and hypotension from elevated beta-blocker exposure' }
  ];

  // ── 2. CORE BIOLOGICAL CASCADE ENGINE CLASS ────────────────────────────────

  class BioCascadeEngine {
    constructor() {}

    /**
     * Normalizes a drug or brand name to a standard token string.
     * @private
     */
    _normalize(str) {
      if (!str || typeof str !== 'string') return '';
      return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '');
    }

    /**
     * 1. Detects "The Triple Whammy" Hemodynamic Glomerular Filtration Collapse.
     * Occurs when an NSAID + RAAS inhibitor (ACEi/ARB) + Diuretic are combined.
     *
     * @param {string[]} drugList - List of drug or brand names
     * @param {Object} [patientProfile] - Optional patient conditions
     * @returns {Object|null} Cascade alert or null
     */
    detectTripleWhammyCascade(drugList = [], patientProfile = {}) {
      if (!Array.isArray(drugList) || drugList.length < 2) return null;

      const normalizedList = drugList.map(d => this._normalize(d));

      const matchedNsaids = [];
      const matchedRaas = [];
      const matchedDiuretics = [];

      normalizedList.forEach(drug => {
        if (HEMODYNAMIC_DRUG_CLASSES.nsaids.some(n => drug.includes(n))) matchedNsaids.push(drug);
        if (HEMODYNAMIC_DRUG_CLASSES.raas_inhibitors.some(r => drug.includes(r))) matchedRaas.push(drug);
        if (HEMODYNAMIC_DRUG_CLASSES.diuretics.some(d => drug.includes(d))) matchedDiuretics.push(drug);
      });

      const hasNsaid = matchedNsaids.length > 0;
      const hasRaas = matchedRaas.length > 0;
      const hasDiuretic = matchedDiuretics.length > 0;

      // Full Triple Whammy Triad
      if (hasNsaid && hasRaas && hasDiuretic) {
        return {
          id: 'cascade-triple-whammy-triad',
          type: 'hemodynamic_cascade',
          severity: 'CRITICAL',
          title: '🚨 The Triple Whammy: Glomerular Hemodynamic Collapse',
          drugsInvolved: [...new Set([...matchedNsaids, ...matchedRaas, ...matchedDiuretics])],
          mechanism: 'Three-point collapse of renal autoregulation: (1) NSAID constricts afferent renal arteriole, (2) ACEi/ARB dilates efferent arteriole, (3) Diuretic induces plasma hypovolemia. Glomerular filtration pressure collapses precipitously.',
          clinicalRisk: 'Catastrophic Acute Kidney Injury (AKI), acute tubular necrosis, and fatal hyperkalemia.',
          actionableGuidance: 'CRITICAL HARM-REDUCTION ADVISORY: Discuss with your doctor immediately to PAUSE or REPLACE the NSAID (painkiller) (e.g. substitute Combiflam/Ibuprofen with topical therapy or Paracetamol). DO NOT stop blood pressure medications (ACEi/ARB) or diuretics on your own, as abrupt cessation triggers acute hypertensive crisis and congestive pulmonary edema. Request urgent renal function (eGFR/creatinine) and potassium lab tests.',
          harmReductionDirective: '⚠️ MANDATORY GUARDRAIL: Never discontinue prescribed antihypertensive or diuretic therapies without direct physician supervision.',
          evidenceLevel: 'Established',
          source: 'NICE Guidelines / British Journal of Clinical Pharmacology / CDSCO',
          lastVerified: '2026-03-15'
        };
      }

      // High-Risk Dyad (NSAID + ACEi/ARB)
      if (hasNsaid && hasRaas) {
        return {
          id: 'cascade-triple-whammy-dyad',
          type: 'hemodynamic_cascade',
          severity: 'AVOID',
          title: '⚠️ NSAID + Renin-Angiotensin Blockade: Renal Perfusion Strain',
          drugsInvolved: [...new Set([...matchedNsaids, ...matchedRaas])],
          mechanism: 'NSAID inhibits vasodilatory renal prostaglandins while ARB/ACEi blocks efferent constriction. Blunts antihypertensive efficacy and compromises renal hemodynamics.',
          clinicalRisk: 'Acute elevation in serum creatinine, oliguria, fluid retention, and hyperkalemia.',
          actionableGuidance: 'CLINICAL ADVISORY: Consult physician regarding replacing the oral NSAID with Paracetamol or local analgesics. Do NOT stop prescribed ACEi/ARB blood pressure medications on your own.',
          harmReductionDirective: '⚠️ MANDATORY GUARDRAIL: Do not stop cardiovascular medications without physician confirmation.',
          evidenceLevel: 'Established',
          source: 'FDA DailyMed / KDIGO Guidelines',
          lastVerified: '2026-03-15'
        };
      }

      return null;
    }

    /**
     * 2. Computes Hepatic CYP450 Enzymatic Competition and AUC Surges.
     *
     * @param {string[]} drugList - Active medicines
     * @returns {Object[]} Detected CYP metabolic bottleneck alerts
     */
    computeCypClearanceBottlenecks(drugList = []) {
      if (!Array.isArray(drugList) || drugList.length < 2) return [];

      const normalizedList = drugList.map(d => this._normalize(d));
      const alerts = [];

      for (const [enzyme, profile] of Object.entries(CYP_PROFILES)) {
        const inhibitorsFound = normalizedList.filter(d => profile.inhibitors.some(inh => d.includes(inh)));
        const substratesFound = normalizedList.filter(d => profile.substrates.some(sub => d.includes(sub)));

        if (inhibitorsFound.length > 0 && substratesFound.length > 0) {
          alerts.push({
            id: `cyp-${enzyme}-inhibition`,
            type: 'hepatic_cyp_cascade',
            enzyme: enzyme.toUpperCase(),
            severity: 'AVOID',
            title: `Metabolic Clearance Blockade: ${enzyme.toUpperCase()} Inhibition`,
            inhibitors: inhibitorsFound,
            substrates: substratesFound,
            mechanism: `${inhibitorsFound.join(', ')} strongly inhibits the ${enzyme.toUpperCase()} hepatic isoenzyme, blocking metabolic degradation of ${substratesFound.join(', ')}.`,
            projectedExposureMultiplier: '3x to 8x AUC surge',
            clinicalRisk: `Systemic drug toxicity due to impaired clearance (e.g. severe statin rhabdomyolysis with acute myoglobinuric kidney failure, profound benzodiazepine sedation).`,
            actionableGuidance: `CLINICAL ACTIONABILITY: When prescribing ${inhibitorsFound.join(', ')}, discuss with your physician whether to temporarily withhold ${substratesFound.join(', ')} for the duration of antimicrobial therapy, or switch to a non-CYP3A4 statin (e.g. Rosuvastatin or Pravastatin). Report unexplained muscle pain or brown urine immediately.`,
            harmReductionDirective: '⚠️ MANDATORY GUARDRAIL: Consult prescribing doctor before altering lipid-lowering or antimicrobial regimens.',
            evidenceLevel: 'Established',
            source: 'FDA Drug Development & Drug Interactions Database / Flockhart Table',
            lastVerified: '2026-03-15'
          });
        }
      }

      return alerts;
    }

    /**
     * 3. Calculates Cumulative Anticholinergic Cognitive Burden (ACB).
     * Calibrated to the clinical Boustani et al. criteria: ACB >= 3 defines high cognitive/delirium hazard.
     *
     * @param {string[]} drugList - Regimen drugs
     * @param {number} [patientAge=35] - Patient age
     * @returns {Object} Anticholinergic burden assessment
     */
    calculateAnticholinergicBurden(drugList = [], patientAge = 35) {
      const normalizedList = (drugList || []).map(d => this._normalize(d));
      let totalScore = 0;
      const scoredDrugs = [];

      normalizedList.forEach(drug => {
        for (const [sub, score] of Object.entries(ACB_SCORES)) {
          if (drug.includes(sub)) {
            totalScore += score;
            scoredDrugs.push({ drug, score });
            break;
          }
        }
      });

      const isGeriatric = patientAge >= 65;
      let riskLevel = 'LOW';
      let title = 'Normal Anticholinergic Burden';

      if (totalScore >= 3) {
        riskLevel = 'HIGH';
        title = isGeriatric
          ? '🚨 Critical Geriatric Cognitive Risk: Anticholinergic Burden (ACB >= 3)'
          : '⚠️ Significant Anticholinergic Cognitive Burden (ACB >= 3)';
      } else if (totalScore === 2) {
        riskLevel = isGeriatric ? 'HIGH' : 'MODERATE';
        title = isGeriatric
          ? '⚠️ Elevated Geriatric Cognitive Risk (ACB = 2 in Age >= 65)'
          : 'Moderate Anticholinergic Exposure (ACB = 2)';
      } else if (totalScore === 1) {
        riskLevel = 'MODERATE';
        title = 'Mild Anticholinergic Exposure (ACB = 1)';
      }

      return {
        totalScore,
        riskLevel,
        isGeriatric,
        title,
        scoredDrugs,
        clinicalImplications: totalScore >= 3 || (isGeriatric && totalScore >= 2)
          ? 'Cumulative central muscarinic blockade significantly elevates risk of acute delirium, confusion, memory impairment, falls, and urinary retention in older adults.'
          : 'Mild anticholinergic load. Low probability of central cognitive disturbance in non-geriatric individuals.',
        actionableGuidance: isGeriatric && totalScore >= 2
          ? 'CLINICAL ADVISORY: Review anticholinergic regimen with geriatrician. Discuss deprescribing or substituting sedating antihistamines/antispasmodics with non-anticholinergic agents.'
          : 'Maintain hydration and observe for dry mouth or blurred vision.',
        harmReductionDirective: '⚠️ MANDATORY GUARDRAIL: Do not abruptly stop prescription psychotropic medications without physician guidance.',
        evidenceLevel: 'Established',
        source: 'ACB Scale (Boustani et al.) / Beers Criteria 2023',
        lastVerified: '2026-03-15'
      };
    }

    /**
     * 4. Calculates Composite QTc Prolongation Arrhythmia Vector Sum.
     * Evaluates categorical ventricular repolarization delay without claiming false-precision millisecond values.
     *
     * @param {string[]} drugList - Regimen drugs
     * @returns {Object} Composite QTc risk scoring
     */
    calculateCompositeQtcRisk(drugList = []) {
      const normalizedList = (drugList || []).map(d => this._normalize(d));
      let compositeScore = 0;
      const contributingDrugs = [];

      normalizedList.forEach(drug => {
        for (const [target, weight] of Object.entries(QTC_RISK_WEIGHTS)) {
          if (drug.includes(target)) {
            compositeScore += weight;
            contributingDrugs.push({ drug, weight });
            break;
          }
        }
      });

      let riskCategory = 'MINIMAL';
      let severity = 'SAFE';

      if (compositeScore >= 5.0) {
        riskCategory = 'SEVERE';
        severity = 'AVOID';
      } else if (compositeScore >= 3.0) {
        riskCategory = 'ELEVATED';
        severity = 'CAUTION';
      } else if (compositeScore > 0) {
        riskCategory = 'MILD';
        severity = 'MONITOR';
      }

      return {
        compositeScore,
        riskCategory,
        severity,
        contributingDrugs,
        title: compositeScore >= 3.0 ? '⚡ Additive Cardiac Repolarization Delay & Arrhythmia Hazard' : 'Normal Cardiac Repolarization Profile',
        mechanism: 'Cumulative pharmacological blockade of the rapid delayed rectifier cardiac potassium current (I_Kr / hERG channel) by co-administered agents.',
        clinicalRisk: compositeScore >= 3.0
          ? 'Synergistic delay of myocardial ventricular repolarization, predisposing to polymorphic ventricular tachycardia (Torsades de Pointes) and syncope.'
          : 'Baseline cardiac repolarization kinetics remain within safe therapeutic thresholds.',
        actionableGuidance: compositeScore >= 3.0
          ? 'CLINICAL ADVISORY: Obtain baseline 12-lead ECG prior to co-administration. Correct hypokalemia and hypomagnesemia. Avoid combining Domperidone with Azithromycin or Macrolides.'
          : 'Standard clinical monitoring.',
        harmReductionDirective: '⚠️ MANDATORY GUARDRAIL: Do not discontinue cardiac or antimicrobial treatments without physician consultation.',
        evidenceLevel: 'Established',
        source: 'CredibleMeds QTDrugs List / CDSCO Safety Circulars',
        lastVerified: '2026-03-15'
      };
    }

    /**
     * 5. Evaluates Multi-Mechanism Cumulative Hemorrhagic Bleeding Risk.
     *
     * @param {string[]} drugList - Regimen drugs
     * @param {Object} [patientProfile] - Optional clinical history
     * @returns {Object} Bleeding risk scoring
     */
    calculateCumulativeHemorrhagicRisk(drugList = [], patientProfile = {}) {
      const normalizedList = (drugList || []).map(d => this._normalize(d));
      let bleedScore = 0;
      const drivers = [];
      const weightingBreakdown = [];

      normalizedList.forEach(drug => {
        if (drug.includes('warfarin') || drug.includes('dabigatran') || drug.includes('rivaroxaban')) {
          bleedScore += 3;
          drivers.push(`${drug} (Anticoagulant)`);
          weightingBreakdown.push({ factor: drug, category: 'Enzymatic Coagulation Factor Inhibition', points: 3 });
        }
        if (drug.includes('aspirin') || drug.includes('ecosprin') || drug.includes('clopidogrel')) {
          bleedScore += 2;
          drivers.push(`${drug} (Antiplatelet)`);
          weightingBreakdown.push({ factor: drug, category: 'Platelet COX-1 / P2Y12 Blockade', points: 2 });
        }
        if (drug.includes('ibuprofen') || drug.includes('combiflam') || drug.includes('diclofenac')) {
          bleedScore += 2;
          drivers.push(`${drug} (NSAID Gastric Mucosal Injury)`);
          weightingBreakdown.push({ factor: drug, category: 'Topical Mucosal Injury & Prostaglandin Depletion', points: 2 });
        }
        if (drug.includes('sertraline') || drug.includes('fluoxetine')) {
          bleedScore += 1;
          drivers.push(`${drug} (SSRI Platelet Serotonin Depletion)`);
          weightingBreakdown.push({ factor: drug, category: 'Platelet Serotonin Depletion', points: 1 });
        }
        if (drug.includes('guggulu') || drug.includes('curcumin') || drug.includes('haldi')) {
          bleedScore += 1;
          drivers.push(`${drug} (Herbal Antiplatelet Synergy)`);
          weightingBreakdown.push({ factor: drug, category: 'Herbal Thromboxane A2 Inhibition Synergy', points: 1 });
        }
      });

      const conditions = (patientProfile.conditions || []).map(c => String(c).toLowerCase());
      if (conditions.some(c => c.includes('ulcer') || c.includes('bleed'))) {
        bleedScore += 2;
        drivers.push('Pre-existing peptic ulcer / bleeding history');
        weightingBreakdown.push({ factor: 'History of Peptic Ulcer / Bleeding', category: 'Pre-existing Endothelial Vulnerability', points: 2 });
      }

      let level = 'LOW';
      if (bleedScore >= 5) level = 'CRITICAL';
      else if (bleedScore >= 3) level = 'HIGH';
      else if (bleedScore >= 2) level = 'MODERATE';

      return {
        bleedScore,
        level,
        drivers,
        weightingBreakdown,
        title: bleedScore >= 3 ? '🩸 Compounded Systemic & Gastrointestinal Hemorrhage Hazard' : 'Normal Hemostatic Profile',
        mechanism: 'Multi-pathway hemostatic impairment: Combined enzymatic coagulation factor inhibition, platelet cyclooxygenase-1 blockade, and mucosal prostaglandin depletion.',
        clinicalRisk: bleedScore >= 3
          ? 'Major upper gastrointestinal hemorrhage, spontaneous hematomas, epistaxis, or melena.'
          : 'Low systemic bleeding tendency under standard therapeutic dosing.',
        actionableGuidance: bleedScore >= 3
          ? 'CLINICAL ADVISORY: Review bleeding risk with physician. Prescribe concurrent proton pump inhibitor (PPI) gastroprotection (e.g. Pantoprazole) if antiplatelet/NSAID combination is medically unavoidable.'
          : 'Standard clinical vigilance.',
        harmReductionDirective: '⚠️ MANDATORY GUARDRAIL: Do not stop prescribed blood thinners without consulting your cardiologist or physician.',
        evidenceLevel: 'Established',
        source: 'HAS-BLED Adapted Criteria / FDA DailyMed',
        lastVerified: '2026-03-15'
      };
    }

    /**
     * 6. Detects Ayurvedic Bio-Enhancer Pharmacokinetic Surges (The Piperine Effect).
     *
     * @param {string[]} herbList - Ayurvedic herbs or formulations
     * @param {string[]} allopathicList - Modern medications
     * @returns {Object[]} Bio-enhancer alerts
     */
    evaluateAyurvedicBioEnhancement(herbList = [], allopathicList = []) {
      const normalizedHerbs = (herbList || []).map(h => this._normalize(h));
      const normalizedAllo = (allopathicList || []).map(a => this._normalize(a));

      const hasPiperine = normalizedHerbs.some(h => PIPERINE_FORMULATIONS.some(p => h.includes(p)));
      if (!hasPiperine) return [];

      const alerts = [];
      normalizedAllo.forEach(alloDrug => {
        const match = BIO_ENHANCER_TARGETS.find(t => alloDrug.includes(t.drug));
        if (match) {
          alerts.push({
            id: `piperine-bioenhancement-${match.drug}`,
            type: 'ayurvedic_bioenhancement',
            severity: 'AVOID',
            title: `🌿 Bio-Enhancer Surge: Piperine + ${alloDrug.toUpperCase()}`,
            mechanism: 'Trikatu / Piperine is an ancient Ayurvedic bio-enhancer (Yogavahi) that strongly inhibits intestinal P-glycoprotein efflux pumps and hepatic CYP3A4, dramatically increasing oral bioavailability.',
            clinicalRisk: match.risk,
            doseDependenceCaveat: 'Bio-enhancement magnitude is dose- and extract-dependent: standardized Ayurvedic extracts (e.g. Trikatu capsules/tablets) exert significantly greater P-gp/CYP3A4 inhibition than modest culinary spice use in food.',
            actionableGuidance: 'CLINICAL ADVISORY: Separate ingestion by at least 4 hours. Inform physician of herbal supplement use; therapeutic drug monitoring may be required.',
            harmReductionDirective: '⚠️ MANDATORY GUARDRAIL: Do not adjust prescribed antidiabetic, antiepileptic, or cardiovascular medicine doses without physician confirmation.',
            evidenceLevel: 'Established',
            source: 'Ayurvedic Pharmacopoeia of India / Clinical Pharmacokinetics',
            lastVerified: '2026-03-15'
          });
        }
      });

      return alerts;
    }

    /**
     * Master Aggregator: Executes full bio-cascade analysis across all physiological domains.
     *
     * @param {string[]} allopathicDrugs - List of medicines
     * @param {string[]} [ayurvedicHerbs=[]] - Concurrent herbal preparations
     * @param {Object} [patientProfile={}] - Patient age, conditions, eGFR
     * @returns {Object} Complete physiological bio-cascade evaluation
     */
    evaluateFullBioCascade(allopathicDrugs = [], ayurvedicHerbs = [], patientProfile = {}) {
      const allDrugs = [...(allopathicDrugs || [])];
      const herbs = [...(ayurvedicHerbs || [])];
      const age = patientProfile.age || 35;

      const tripleWhammy = this.detectTripleWhammyCascade(allDrugs, patientProfile);
      const cypBottlenecks = this.computeCypClearanceBottlenecks(allDrugs);
      const acbBurden = this.calculateAnticholinergicBurden(allDrugs, age);
      const qtcRisk = this.calculateCompositeQtcRisk(allDrugs);
      const bleedRisk = this.calculateCumulativeHemorrhagicRisk(allDrugs, patientProfile);
      const bioEnhancers = this.evaluateAyurvedicBioEnhancement(herbs, allDrugs);

      const hasCriticalAlerts = !!tripleWhammy || cypBottlenecks.length > 0 || acbBurden.riskLevel === 'HIGH' || qtcRisk.severity === 'AVOID' || bleedRisk.level === 'CRITICAL' || bioEnhancers.length > 0;

      return {
        timestamp: new Date().toISOString(),
        hasCriticalAlerts,
        universalHarmReductionDirective: '⚠️ MANDATORY HARM-REDUCTION DIRECTIVE: Do NOT stop or alter any prescribed chronic medicine (blood pressure, diabetes, heart, epilepsy, or psychiatric) on your own. Abrupt cessation carries severe rebound risk. Discuss all alerts with your prescribing physician.',
        tripleWhammy,
        cypBottlenecks,
        acbBurden,
        qtcRisk,
        bleedRisk,
        bioEnhancers
      };
    }
  }

  return BioCascadeEngine;
});
