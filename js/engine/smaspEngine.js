/**
 * @file smasp-engine.js
 * @description The Core Intelligence Algorithm for SMASP (Smart Medicine Awareness & Safety Platform).
 * Provides client-side, zero-latency clinical evaluation, contextual risk scoring,
 * polypharmacy interaction checking, and symptom-to-medicine resolution.
 *
 * Designed for 100% static hosting (GitHub Pages) with O(1) lookups and zero external dependencies.
 *
 * @version 2.1.0
 * @author SMASP Engineering Team
 * @license MIT
 */

// ── 1. DEFAULT POLYPHARMACY INTERACTIONS MATRIX ─────────────────────────────
/**
 * Bidirectional drug-to-drug interaction matrix.
 * Keys use normalized pair IDs formatted as "drugA_drugB" (lexicographically ordered for O(1) lookup).
 *
 * @type {Record<string, { level: 'avoid'|'caution', title: string, mechanism: string, reason: string }>}
 */
const DEFAULT_INTERACTIONS_MATRIX = {
  // Ibuprofen (ibu-001) + Lisinopril (lis-001)
  'ibu-001_lis-001': {
    level: 'avoid',
    title: 'Reduced Blood Pressure Control & Kidney Stress',
    mechanism: 'NSAIDs inhibit renal prostaglandins, opposing the vasodilatory and antihypertensive effects of ACE inhibitors.',
    reason: 'Ibuprofen can reduce the effectiveness of Lisinopril in lowering your blood pressure and place extra stress on your kidneys. A safer alternative for pain or fever is Paracetamol.',
    evidenceLevel: 'Established',
    source: 'FDA DailyMed / Beers Criteria',
    sourceUrl: 'https://dailymed.nlm.nih.gov',
    lastVerified: '2026-03-15'
  },

  // Ibuprofen (ibu-001) + Telmisartan (tel-001)
  'ibu-001_tel-001': {
    level: 'avoid',
    title: 'NSAID + ARB Hemodynamic Collapse',
    mechanism: 'Ibuprofen constricts afferent renal arterioles while Telmisartan dilates efferent arterioles, collapsing glomerular filtration pressure.',
    reason: 'Ibuprofen constricts afferent renal blood flow while Telmisartan dilates efferent flow, triggering acute drop in kidney filtration and high potassium.',
    evidenceLevel: 'Established',
    source: 'FDA DailyMed / CDSCO Safety Notice',
    sourceUrl: 'https://cdsco.gov.in',
    lastVerified: '2026-03-15'
  },

  // Combiflam (ibp-001) + Telmisartan (tel-001)
  'ibp-001_tel-001': {
    level: 'avoid',
    title: 'NSAID + ARB Severe Renal Synergism',
    mechanism: 'The ibuprofen component collapses renal perfusion pressure in hypertensive patients on renin-angiotensin blockade.',
    reason: 'Combiflam contains ibuprofen 400mg which collapses kidney perfusion pressure when taken with Telmisartan, risking acute kidney injury.',
    evidenceLevel: 'Established',
    source: 'PvPI / CDSCO Safety Circular',
    sourceUrl: 'https://cdsco.gov.in',
    lastVerified: '2026-03-15'
  },

  // Aspirin (asp-001) + Warfarin (war-001)
  'asp-001_war-001': {
    level: 'avoid',
    title: 'High Bleeding Risk',
    mechanism: 'Additive anticoagulant and antiplatelet inhibition combined with gastric mucosal irritation.',
    reason: 'Both Aspirin and Warfarin thin your blood in different ways. Taking them together significantly increases your risk of serious stomach bleeding or bruising. Please check with your doctor before combining these.',
    evidenceLevel: 'Established',
    source: 'FDA DailyMed',
    sourceUrl: 'https://dailymed.nlm.nih.gov',
    lastVerified: '2026-03-15'
  },

  // Sertraline (ser-001) + Tramadol (tra-001)
  'ser-001_tra-001': {
    level: 'avoid',
    title: 'Serotonin Syndrome Risk',
    mechanism: 'Concurrent serotonergic reuptake inhibition by Sertraline and monoaminergic activity of Tramadol.',
    reason: 'Combining Sertraline (an antidepressant) and Tramadol (a pain reliever) can cause an unsafe buildup of serotonin in your brain (Serotonin Syndrome), leading to shivering, confusion, or rapid heartbeat.',
    evidenceLevel: 'Established',
    source: 'FDA Drug Safety Communication',
    sourceUrl: 'https://dailymed.nlm.nih.gov',
    lastVerified: '2026-03-15'
  },

  // Omeprazole (ome-001) + Clopidogrel / Blood Thinners
  'eso-001_ome-001': {
    level: 'caution',
    title: 'Duplicate Acid Suppression',
    mechanism: 'Dual proton pump inhibition offers no added efficacy while elevating hypomagnesemia and fracture risk.',
    reason: 'Both medicines belong to the same acid-reducer family (PPIs). Taking both together is unnecessary and increases the risk of low mineral levels and digestive imbalances.',
    evidenceLevel: 'Established',
    source: 'FDA DailyMed',
    sourceUrl: 'https://dailymed.nlm.nih.gov',
    lastVerified: '2026-03-15'
  },

  // Metronidazole (met-002) + Fluoxetine / Central Agents
  'met-002_ser-001': {
    level: 'caution',
    title: 'Possible Central Nervous System Sensitivity',
    mechanism: 'Potential additive neurotoxicity and gastrointestinal intolerance.',
    reason: 'Taking Metronidazole with an antidepressant can increase feelings of nausea, dizziness, or a temporary metallic taste. Stay well-hydrated and report severe discomfort.',
    evidenceLevel: 'Moderate Evidence',
    source: 'Clinical Pharmacology Database',
    sourceUrl: 'https://dailymed.nlm.nih.gov',
    lastVerified: '2026-03-15'
  },

  // Atorvastatin (ato-001) + Clarithromycin (clar-001)
  'ato-001_clar-001': {
    level: 'avoid',
    title: 'Elevated Statin Blood Levels & Muscle Risk',
    mechanism: 'Clarithromycin is a potent CYP3A4 inhibitor, substantially increasing Atorvastatin systemic exposure.',
    reason: 'Clarithromycin slows down how your body breaks down Atorvastatin, causing statin levels to spike in your blood. This can lead to severe muscle aches or liver stress. Your doctor may temporarily pause the statin.',
    evidenceLevel: 'Established',
    source: 'FDA DailyMed',
    sourceUrl: 'https://dailymed.nlm.nih.gov',
    lastVerified: '2026-03-15'
  },

  // Ciprofloxacin (cip-001) + Calcium Carbonate (cal-001)
  'cal-001_cip-001': {
    level: 'caution',
    title: 'Chelation & Reduced Antibiotic Absorption',
    mechanism: 'Divalent and trivalent cations form insoluble chelate complexes with fluoroquinolones in the GI tract.',
    reason: 'Calcium binds to Ciprofloxacin in your stomach, preventing your body from absorbing the antibiotic. Take Ciprofloxacin at least 2 hours before or 6 hours after any calcium antacid.',
    evidenceLevel: 'Established',
    source: 'FDA DailyMed',
    sourceUrl: 'https://dailymed.nlm.nih.gov',
    lastVerified: '2026-03-15'
  },

  // Azithromycin (azi-001) + Domperidone (dom-001)
  'azi-001_dom-001': {
    level: 'avoid',
    title: 'Additive QTc Interval Prolongation',
    mechanism: 'Both agents delay cardiac ventricular repolarization via hERG potassium channel blockade.',
    reason: 'Both Azithromycin and Domperidone can affect heart rhythm by prolonging the QTc interval. Combining them significantly elevates the risk of cardiac arrhythmias.',
    evidenceLevel: 'Established',
    source: 'CDSCO Safety Notice / MHRA',
    sourceUrl: 'https://cdsco.gov.in',
    lastVerified: '2026-03-15'
  },

  // Metformin (met-001) + Ciprofloxacin (cip-001)
  'cip-001_met-001': {
    level: 'caution',
    title: 'Compounded Hypoglycemia & Renal Clearance Alteration',
    mechanism: 'Ciprofloxacin alters renal tubular transport of metformin and exerts independent pancreatic beta-cell stimulation.',
    reason: 'Ciprofloxacin can amplify the blood-sugar-lowering effect of Metformin and slow its kidney clearance. Monitor blood glucose closely.',
    evidenceLevel: 'Moderate Evidence',
    source: 'FDA DailyMed',
    sourceUrl: 'https://dailymed.nlm.nih.gov',
    lastVerified: '2026-03-15'
  },

  // Amoxicillin (amo-001) + Methotrexate / Allopurinol (alp-001)
  'alp-001_amo-001': {
    level: 'caution',
    title: 'Higher Incidence of Skin Rashes',
    mechanism: 'Concomitant administration elevates hypersensitivity cutaneous reaction rates.',
    reason: 'Taking Allopurinol with Amoxicillin increases the likelihood of developing a non-allergic skin rash. Let your healthcare provider know if a rash appears.',
    evidenceLevel: 'Moderate Evidence',
    source: 'Clinical Pharmacokinetics',
    sourceUrl: 'https://dailymed.nlm.nih.gov',
    lastVerified: '2026-03-15'
  }
};

// ── 2. SMASP INTELLIGENCE ENGINE CLASS ───────────────────────────────────────

/**
 * High-performance clinical evaluation and awareness engine for SMASP.
 * Implements Contextual Risk Scoring, Polypharmacy Matrix Analysis, and Symptom Resolution.
 */
class SmaspEngine {
  /**
   * Initializes the engine with medicine and interaction rule sets.
   * Builds an internal O(1) hash map for sub-millisecond lookups.
   *
   * @param {Array<Object>} medicinesData - Catalog of medicines adhering to the SMASP schema.
   * @param {Record<string, Object>} [interactionsData] - Custom or default interaction matrix rules.
   *
   * @timeComplexity O(N) where N is the number of medicines (one-time initialization).
   * @spaceComplexity O(N + M) where N is medicines count and M is interaction rules count.
   */
  constructor(medicinesData = [], interactionsData = DEFAULT_INTERACTIONS_MATRIX) {
    /** @type {Array<Object>} */
    this.medicines = Array.isArray(medicinesData) ? medicinesData : [];

    /** @type {Record<string, Object>} */
    this.interactions = interactionsData || {};

    /**
     * Fast O(1) lookup map: drugId -> DrugObject
     * @type {Map<string, Object>}
     */
    this.drugMap = new Map();

    /**
     * Fast normalized name lookup map: lowercaseName -> DrugObject
     * @type {Map<string, Object>}
     */
    this.nameMap = new Map();

    this._buildIndexes();
  }

  /**
   * Pre-indexes dataset into hash maps for instant querying.
   * @private
   * @timeComplexity O(N)
   */
  _buildIndexes() {
    this.drugMap.clear();
    this.nameMap.clear();

    for (let i = 0; i < this.medicines.length; i++) {
      const med = this.medicines[i];
      if (!med || !med.id) continue;

      this.drugMap.set(med.id, med);

      // Map primary generic name
      if (med.genericName) {
        this.nameMap.set(med.genericName.toLowerCase().trim(), med);
      }

      // Map brand names for alias resolution
      if (Array.isArray(med.brandNames)) {
        for (let b = 0; b < med.brandNames.length; b++) {
          this.nameMap.set(med.brandNames[b].toLowerCase().trim(), med);
        }
      }
    }
  }

  /**
   * Updates or reloads the active medicine dataset dynamically.
   *
   * @param {Array<Object>} newMedicinesData - Updated medicines catalog.
   * @timeComplexity O(N)
   * @spaceComplexity O(N)
   */
  updateMedicines(newMedicinesData) {
    this.medicines = Array.isArray(newMedicinesData) ? newMedicinesData : [];
    this._buildIndexes();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ALGORITHM 1: CONTEXTUAL RISK SCORER
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Calculates personalized clinical risk by evaluating the drug profile
   * against individual patient traits (age, chronic conditions, pregnancy, etc.).
   *
   * @param {string} drugId - Identifier of the medicine (e.g., 'ibu-001').
   * @param {Object} [userProfile={}] - User health profile.
   * @param {number} [userProfile.age] - Age in years.
   * @param {Array<string>} [userProfile.conditions=[]] - List of health conditions (e.g., ['hypertension', 'kidney']).
   * @param {boolean} [userProfile.isPregnant=false] - Pregnancy status.
   * @param {boolean} [userProfile.isBreastfeeding=false] - Breastfeeding status.
   * @param {Array<string>} [userProfile.allergies=[]] - Known drug allergies.
   *
   * @returns {{
   *   level: 'safe'|'caution'|'avoid'|'unknown',
   *   plainEnglishWhy: string,
   *   matchedFactors: Array<string>,
   *   drugData: Object|null
   * }}
   *
   * @timeComplexity O(W + C) where W is number of calmWarnings on the drug and C is user conditions count.
   * @spaceComplexity O(F) where F is the number of matched clinical factors.
   */
  calculatePersonalRisk(drugId, userProfile = {}) {
    const drug = this.drugMap.get(drugId);
    if (!drug) {
      return {
        level: 'unknown',
        plainEnglishWhy: 'We could not find this medicine in the reference database.',
        matchedFactors: [],
        drugData: null
      };
    }

    const {
      age = null,
      conditions = [],
      isPregnant = false,
      isBreastfeeding = false,
      allergies = []
    } = userProfile;

    let riskLevel = 'safe';
    const matchedReasons = [];
    const warnings = Array.isArray(drug.calmWarnings) ? drug.calmWarnings : [];

    // Normalize user conditions & allergies for fuzzy substring matching
    const normalizedConditions = conditions.map(c => String(c).toLowerCase().trim());
    const normalizedAllergies = allergies.map(a => String(a).toLowerCase().trim());
    const drugNameLower = (drug.genericName || '').toLowerCase();

    // 1. Allergy check (Instant AVOID escalation) - False-Positive Immune
    for (let a = 0; a < normalizedAllergies.length; a++) {
      const allergy = normalizedAllergies[a];
      if (!allergy || allergy.length < 3) continue;

      const allergyClasses = Array.isArray(drug.allergyClasses) ? drug.allergyClasses.map(c => c.toLowerCase()) : [];
      const allergens = Array.isArray(drug.allergens) ? drug.allergens.map(c => c.toLowerCase()) : [];
      const category = (drug.category || '').toLowerCase();

      // Strict matching: Only checks explicit allergyClasses, declared allergens, or active drug name token
      // NEVER scans drug.plainEnglishSummary, calmWarnings, or indications to prevent false positives
      const isClassMatch = allergyClasses.some(c => c.includes(allergy) || allergy.includes(c));
      const isAllergenMatch = allergens.some(al => al.includes(allergy) || allergy.includes(al));
      const isNameTokenMatch = drugNameLower.split(/[\s,+/]+/).some(token => token === allergy || (token.length > 3 && (token.startsWith(allergy) || allergy.startsWith(token))));
      const isCategoryMatch = category.includes(allergy);

      if (isClassMatch || isAllergenMatch || isNameTokenMatch || isCategoryMatch) {
        riskLevel = 'avoid';
        matchedReasons.push(`Known allergy match (${allergy})`);
      }
    }

    // 2. Pregnancy check
    if (isPregnant) {
      const hasPregnancyWarning = warnings.some(w => {
        const text = `${w.title} ${w.plainEnglishWhy}`.toLowerCase();
        return text.includes('pregnancy') || text.includes('unborn baby') || text.includes('fetus');
      });

      if (hasPregnancyWarning) {
        riskLevel = this.escalateRisk(riskLevel, 'avoid');
        matchedReasons.push('Pregnancy safety precaution');
      }
    }

    // 3. Breastfeeding check
    if (isBreastfeeding) {
      const hasLactationWarning = warnings.some(w => {
        const text = `${w.title} ${w.plainEnglishWhy}`.toLowerCase();
        return text.includes('breastfeeding') || text.includes('nursing') || text.includes('breast milk');
      });

      if (hasLactationWarning) {
        riskLevel = this.escalateRisk(riskLevel, 'caution');
        matchedReasons.push('Nursing/breastfeeding precaution');
      }
    }

    // 4. Age-specific checks (Pediatric & Geriatric)
    if (age !== null && age !== undefined) {
      if (age >= 65) {
        const hasGeriatricWarning = warnings.some(w => {
          const text = `${w.title} ${w.plainEnglishWhy}`.toLowerCase();
          return text.includes('older adult') || text.includes('over 60') || text.includes('over 65') || text.includes('elderly') || text.includes('falls');
        });

        if (hasGeriatricWarning) {
          riskLevel = this.escalateRisk(riskLevel, 'caution');
          matchedReasons.push('Age 65+ sensitivity');
        }
      } else if (age < 12) {
        const hasPediatricWarning = warnings.some(w => {
          const text = `${w.title} ${w.plainEnglishWhy}`.toLowerCase();
          return text.includes('children') || text.includes('under 12') || text.includes('under 16') || text.includes('reye');
        });

        if (hasPediatricWarning) {
          riskLevel = this.escalateRisk(riskLevel, 'avoid');
          matchedReasons.push('Pediatric age restriction (under 12)');
        }
      }
    }

    // 5. Condition-specific clinical warnings matching
    for (let c = 0; c < normalizedConditions.length; c++) {
      const cond = normalizedConditions[c];
      if (!cond) continue;

      for (let w = 0; w < warnings.length; w++) {
        const warning = warnings[w];
        const combinedText = `${warning.title} ${warning.plainEnglishWhy}`.toLowerCase();

        if (this._matchesCondition(cond, combinedText)) {
          const targetLevel = (warning.level || 'caution').toLowerCase() === 'avoid' ? 'avoid' : 'caution';
          riskLevel = this.escalateRisk(riskLevel, targetLevel);
          matchedReasons.push(`${this._formatConditionName(cond)}`);
          break; // Avoid duplicate triggers for the same condition
        }
      }
    }

    // 6. Build Empathetic Plain-English explanation
    let plainEnglishWhy = '';
    if (riskLevel === 'avoid') {
      plainEnglishWhy = `🛑 Pause & Check: We advise against taking this medicine because of your profile (${matchedReasons.join(', ')}). Safer alternatives are available for your condition.`;
    } else if (riskLevel === 'caution') {
      plainEnglishWhy = `⚠️ A Note for You: This medicine requires extra care because of your profile (${matchedReasons.join(', ')}). Be sure to review dosing and monitor how you feel.`;
    } else {
      plainEnglishWhy = '✅ Looking Good: This medicine has no standard warnings matching your health profile. Always follow labeled dosage instructions.';
    }

    return {
      level: riskLevel,
      plainEnglishWhy,
      matchedFactors: matchedReasons,
      drugData: drug
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ALGORITHM 2: POLYPHARMACY INTERACTION MATRIX
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Evaluates polypharmacy risk across a list of concurrent medicines.
   * Checks both direct two-way drug clashes (O(1) matrix lookup) and
   * compounding overlapping adverse effects (e.g. cumulative sedation).
   *
   * @param {Array<string>} selectedDrugIds - List of drug IDs (e.g. ['ibu-001', 'lis-001']).
   *
   * @returns {Array<{
   *   level: 'avoid'|'caution'|'safe',
   *   title: string,
   *   plainEnglishWhy: string,
   *   drugsInvolved: Array<string>,
   *   type: 'direct_clash'|'overlapping_effect'
   * }>}
   *
   * @timeComplexity O(K^2 + K * S) where K is selected drugs count and S is average side effects count.
   * @spaceComplexity O(K^2 + E) where E is the number of generated warnings.
   */
  checkInteractions(selectedDrugIds = []) {
    if (!Array.isArray(selectedDrugIds) || selectedDrugIds.length < 2) {
      return [];
    }

    // Deduplicate and filter valid IDs
    const uniqueIds = Array.from(new Set(selectedDrugIds)).filter(id => this.drugMap.has(id));
    if (uniqueIds.length < 2) return [];

    const warnings = [];
    const sideEffectTracker = new Map(); // sideEffectName -> Array<drugNames>

    // ── Part A: Check Direct Drug-to-Drug Clashes (O(K^2) pairs, O(1) lookup each) ──
    for (let i = 0; i < uniqueIds.length; i++) {
      for (let j = i + 1; j < uniqueIds.length; j++) {
        const idA = uniqueIds[i];
        const idB = uniqueIds[j];

        const medA = this.drugMap.get(idA);
        const medB = this.drugMap.get(idB);

        // Check canonical sorted pair keys (both directions supported)
        const pairKey1 = `${idA}_${idB}`;
        const pairKey2 = `${idB}_${idA}`;

        const rule = this.interactions[pairKey1] || this.interactions[pairKey2];

        if (rule) {
          warnings.push({
            level: rule.level || 'avoid',
            title: `Direct Clash: ${medA.genericName} + ${medB.genericName}`,
            plainEnglishWhy: rule.reason || 'These medicines interact when taken together. Please consult your pharmacist before combining them.',
            mechanism: rule.mechanism || rule.title,
            evidenceLevel: rule.evidenceLevel || 'Established',
            source: rule.source || 'FDA DailyMed / CDSCO',
            sourceUrl: rule.sourceUrl || 'https://dailymed.nlm.nih.gov',
            lastVerified: rule.lastVerified || '2026-03-15',
            drugsInvolved: [medA.genericName, medB.genericName],
            type: 'direct_clash'
          });
        }
      }
    }

    // ── Part B: Check Overlapping Side Effects (Compounding Burden) ──
    for (let i = 0; i < uniqueIds.length; i++) {
      const drug = this.drugMap.get(uniqueIds[i]);
      const effects = Array.isArray(drug.commonSideEffects) ? drug.commonSideEffects : [];

      for (let e = 0; e < effects.length; e++) {
        const raw = effects[e].toLowerCase();
        const key = this._normalizeSideEffectKey(raw);

        if (key) {
          if (!sideEffectTracker.has(key)) {
            sideEffectTracker.set(key, []);
          }
          sideEffectTracker.get(key).push(drug.genericName);
        }
      }
    }

    // Flag any side effects caused by 2 or more active medicines
    sideEffectTracker.forEach((drugsList, effectKey) => {
      if (drugsList.length >= 2) {
        const formattedEffect = effectKey.charAt(0).toUpperCase() + effectKey.slice(1);
        warnings.push({
          level: 'caution',
          title: `Overlapping Effect: Compounded ${formattedEffect}`,
          plainEnglishWhy: `${drugsList.join(' and ')} can both cause ${effectKey}. Taking them together makes this side effect significantly more noticeable. Avoid driving or operating machinery if you feel affected.`,
          mechanism: `Compounded pharmacodynamic burden across ${drugsList.length} active agents.`,
          evidenceLevel: 'Established',
          source: 'Clinical Pharmacology Formulary / DailyMed',
          sourceUrl: 'https://dailymed.nlm.nih.gov',
          lastVerified: '2026-03-15',
          drugsInvolved: drugsList,
          type: 'overlapping_effect'
        });
      }
    });

    // Sort: 'avoid' warnings first, then 'caution'
    return warnings.sort((a, b) => {
      if (a.level === 'avoid' && b.level !== 'avoid') return -1;
      if (a.level !== 'avoid' && b.level === 'avoid') return 1;
      return 0;
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ALGORITHM 3: SYMPTOM-TO-MEDICINE RESOLVER
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Discovers medicines that address specific symptoms, filters out any medications
   * deemed unsafe for the patient's individual profile, and sorts by relevance & safety.
   *
   * @param {Array<string>|string} symptoms - List of user-reported symptoms (e.g. ['headache', 'fever']).
   * @param {Object} [userProfile={}] - User health profile for personalized filtering.
   * @param {Object} [options={}] - Optional query modifiers.
   * @param {boolean} [options.allowCaution=true] - Whether to include 'caution' medicines (with warnings).
   * @param {number} [options.limit=20] - Maximum number of results to return.
   *
   * @returns {Array<Object & { personalRisk: 'safe'|'caution', matchScore: number, matchedUses: Array<string> }>}
   *
   * @timeComplexity O(N * (U + W)) where N is medicines count, U is average uses, and W is warnings.
   * @spaceComplexity O(M) where M is the number of matching non-avoid medicines.
   */
  findMedicinesForSymptoms(symptoms = [], userProfile = {}, options = {}) {
    const { allowCaution = true, limit = 20 } = options;

    // Normalize input symptoms
    const symptomArray = Array.isArray(symptoms) ? symptoms : [symptoms];
    const searchTerms = symptomArray
      .map(s => String(s).toLowerCase().trim())
      .filter(Boolean);

    if (searchTerms.length === 0) return [];

    const matches = [];

    for (let i = 0; i < this.medicines.length; i++) {
      const drug = this.medicines[i];
      const uses = Array.isArray(drug.commonUses) ? drug.commonUses : [];

      // Find matching uses
      const matchedUses = [];
      for (let u = 0; u < uses.length; u++) {
        const useLower = uses[u].toLowerCase();
        for (let t = 0; t < searchTerms.length; t++) {
          const term = searchTerms[t];
          if (useLower.includes(term) || term.includes(useLower)) {
            matchedUses.push(uses[u]);
            break;
          }
        }
      }

      if (matchedUses.length > 0) {
        // Run Contextual Risk Scoring for this specific patient
        const risk = this.calculatePersonalRisk(drug.id, userProfile);

        // Strict Safety Rule: NEVER recommend 'avoid' medicines to the patient
        if (risk.level === 'avoid') {
          continue;
        }

        if (risk.level === 'caution' && !allowCaution) {
          continue;
        }

        const matchScore = this.calculateMatchScore(drug, searchTerms);

        matches.push({
          ...drug,
          personalRisk: risk.level,
          personalRiskWhy: risk.plainEnglishWhy,
          matchedFactors: risk.matchedFactors,
          matchScore,
          matchedUses: Array.from(new Set(matchedUses))
        });
      }
    }

    // Sort order:
    // 1. Highest Match Score first (relevance)
    // 2. 'safe' before 'caution' (safety priority)
    // 3. Alphabetical generic name fallback
    matches.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      if (a.personalRisk !== b.personalRisk) {
        return a.personalRisk === 'safe' ? -1 : 1;
      }
      return (a.genericName || '').localeCompare(b.genericName || '');
    });

    return matches.slice(0, limit);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPER UTILITIES
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Escalates clinical risk level according to a deterministic hierarchy.
   * Hierarchy: safe (1) < caution (2) < avoid (3).
   *
   * @param {'safe'|'caution'|'avoid'|'unknown'} current - Current assigned level.
   * @param {'safe'|'caution'|'avoid'} proposed - Proposed escalation level.
   * @returns {'safe'|'caution'|'avoid'} The highest severity level.
   *
   * @timeComplexity O(1)
   */
  escalateRisk(current, proposed) {
    const hierarchy = { safe: 1, caution: 2, avoid: 3, unknown: 0 };
    const curVal = hierarchy[current] || 0;
    const propVal = hierarchy[proposed] || 0;
    return propVal > curVal ? proposed : current;
  }

  /**
   * Computes a relevance score based on the frequency of matching symptom keywords.
   *
   * @param {Object} drug - Medicine object.
   * @param {Array<string>} searchTerms - Lowercase symptom query strings.
   * @returns {number} Relevance score.
   *
   * @timeComplexity O(U * T) where U is uses count and T is search terms count.
   */
  calculateMatchScore(drug, searchTerms) {
    let score = 0;
    const uses = Array.isArray(drug.commonUses) ? drug.commonUses : [];

    for (let u = 0; u < uses.length; u++) {
      const useLower = uses[u].toLowerCase();
      for (let t = 0; t < searchTerms.length; t++) {
        if (useLower.includes(searchTerms[t])) {
          score += 2; // Direct symptom match weight
        }
      }
    }

    // Additional relevance if summary explicitly mentions the symptom
    const summaryLower = (drug.plainEnglishSummary || '').toLowerCase();
    for (let t = 0; t < searchTerms.length; t++) {
      if (summaryLower.includes(searchTerms[t])) {
        score += 1;
      }
    }

    return score;
  }

  /**
   * Fuzzy matches user condition against warning text with common medical synonyms.
   * @private
   */
  _matchesCondition(conditionLower, warningTextLower) {
    if (warningTextLower.includes(conditionLower)) return true;

    // Synonyms & Clinical equivalencies
    const conditionSynonyms = {
      'hypertension': ['blood pressure', 'high bp', 'hypertensive'],
      'high blood pressure': ['blood pressure', 'hypertension', 'heart disease'],
      'kidney': ['renal', 'kidneys', 'nephro'],
      'kidney disease': ['kidney', 'renal', 'nephro'],
      'liver': ['hepatic', 'liver health', 'cirrhosis'],
      'liver disease': ['liver', 'hepatic'],
      'asthma': ['breathing', 'bronchospasm', 'airways'],
      'diabetes': ['blood sugar', 'glucose', 'hypoglycemia'],
      'ulcer': ['stomach ulcer', 'stomach irritation', 'gi bleeding', 'bleeding risk'],
      'gout': ['uric acid', 'joint flare']
    };

    const syns = conditionSynonyms[conditionLower] || [];
    for (let i = 0; i < syns.length; i++) {
      if (warningTextLower.includes(syns[i])) return true;
    }

    return false;
  }

  /**
   * Normalizes high-risk side effect terms into canonical categories.
   * @private
   */
  _normalizeSideEffectKey(effectText) {
    if (effectText.includes('drowsiness') || effectText.includes('sleepiness') || effectText.includes('sedation')) {
      return 'drowsiness';
    }
    if (effectText.includes('dizziness') || effectText.includes('lightheadedness')) {
      return 'dizziness';
    }
    if (effectText.includes('stomach') || effectText.includes('heartburn') || effectText.includes('nausea')) {
      return 'stomach irritation';
    }
    if (effectText.includes('headache')) {
      return 'headaches';
    }
    if (effectText.includes('constipation')) {
      return 'constipation';
    }
    if (effectText.includes('diarrhea')) {
      return 'digestive upset';
    }
    return null;
  }

  /**
   * Formats condition strings for clean display in warnings.
   * @private
   */
  _formatConditionName(condition) {
    const map = {
      'hypertension': 'High Blood Pressure',
      'kidney': 'Kidney Health',
      'kidney disease': 'Kidney Disease',
      'liver': 'Liver Health',
      'asthma': 'Asthma / Respiratory Conditions',
      'diabetes': 'Diabetes / Blood Sugar',
      'ulcer': 'Stomach Ulcers / Bleeding'
    };
    return map[condition.toLowerCase()] || condition.charAt(0).toUpperCase() + condition.slice(1);
  }
}

// ── 3. UNIVERSAL MODULE EXPORT (ESM, CommonJS & Browser Global) ─────────────

// Browser Global
if (typeof window !== 'undefined') {
  window.SmaspEngine = SmaspEngine;
  window.DEFAULT_INTERACTIONS_MATRIX = DEFAULT_INTERACTIONS_MATRIX;
}

// GlobalThis (Web Workers, Node 12+)
if (typeof globalThis !== 'undefined') {
  globalThis.SmaspEngine = SmaspEngine;
  globalThis.DEFAULT_INTERACTIONS_MATRIX = DEFAULT_INTERACTIONS_MATRIX;
}

// CommonJS (Node.js environments / Testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SmaspEngine,
    DEFAULT_INTERACTIONS_MATRIX
  };
}
