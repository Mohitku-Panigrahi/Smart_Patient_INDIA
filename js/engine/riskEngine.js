/**
 * @file riskEngine.js
 * @description Clinical risk evaluation, demographic profile adjustment,
 * allergy triage, and drug-drug interaction logic with production-grade input validation.
 * @namespace SMASP.engine.risk
 */

(function (root) {
  'use strict';

  function getI18n(lang) {
    const dict = (root.SMASP && root.SMASP.data && root.SMASP.data.i18n) || {};
    return dict[lang] || dict.en || {
      noCondition: "No health condition selected — no known conflicts identified.",
      educationalOnly: "Educational results only. Not medical advice.",
      riskReasonSafe: "No known conflict between this medicine and your selected condition(s). Always verify with a licensed healthcare professional."
    };
  }

  /**
   * Evaluates the baseline risk of a medicine against selected health conditions.
   * @param {string[]} userConditions - Array of health condition strings
   * @param {Object} medicine - Medicine data object
   * @param {string} [lang='en'] - Language code ('en', 'hi')
   * @returns {Object} Risk evaluation result
   */
  function evaluateRisk(userConditions, medicine, lang) {
    const t = getI18n(lang || 'en');

    // Defensive input normalization
    const safeConditions = Array.isArray(userConditions)
      ? userConditions.filter(c => typeof c === 'string' && c.trim().length > 0)
      : [];

    const safeMedicine = (medicine && typeof medicine === 'object') ? medicine : {};
    const confidence = safeMedicine.confidence || "Moderate";

    if (safeConditions.length === 0) {
      return {
        level: "SAFE",
        cssClass: "safe",
        icon: "✅",
        score: 3,
        reason: t.noCondition,
        severity: "Low",
        confidence: confidence
      };
    }

    // Check avoid (absolute contraindication takes precedence)
    const avoidList = Array.isArray(safeMedicine.avoid) ? safeMedicine.avoid : [];
    for (let i = 0; i < safeConditions.length; i++) {
      const cond = safeConditions[i];
      if (avoidList.includes(cond)) {
        return {
          level: "AVOID",
          cssClass: "avoid",
          icon: "🚫",
          score: 1,
          reason: `This medicine should be AVOIDED with "${cond}". It may significantly worsen this condition or cause serious harm. Consult your doctor immediately.`,
          severity: "High",
          confidence: confidence
        };
      }
    }

    // Check caution
    const cautionList = Array.isArray(safeMedicine.caution) ? safeMedicine.caution : [];
    const cautionHits = safeConditions.filter(c => cautionList.includes(c));
    if (cautionHits.length > 0) {
      return {
        level: "CAUTION",
        cssClass: "caution",
        icon: "⚠️",
        score: 2,
        reason: `Use with CAUTION if you have "${cautionHits.join(', ')}". This medicine can interact with this condition. Always inform your healthcare provider.`,
        severity: "Medium",
        confidence: confidence
      };
    }

    return {
      level: "SAFE",
      cssClass: "safe",
      icon: "✅",
      score: 3,
      reason: t.riskReasonSafe,
      severity: "Low",
      confidence: confidence
    };
  }

  /**
   * Applies age, pregnancy, and breastfeeding modifiers to baseline risk.
   * @param {Object} risk - Baseline risk object
   * @param {Object} medicine - Medicine definition
   * @param {Object} profile - User demographic profile
   * @returns {Object} Adjusted risk object
   */
  function applyProfileRiskAdjustments(risk, medicine, profile) {
    const baseRisk = (risk && typeof risk === 'object') ? risk : { level: 'SAFE', score: 3, severity: 'Low' };
    const out = { ...baseRisk, profileNotes: [] };
    if (!profile || typeof profile !== 'object') return out;

    const safeMedicine = (medicine && typeof medicine === 'object') ? medicine : {};
    const pediatricRegex = /children?|under\s*\d+|aged?\s*under|below\s*\d+\s*years?|pediatric|paediatric|minors?/i;

    if (profile.ageGroup === 'child' && Array.isArray(safeMedicine.who_cannot) && safeMedicine.who_cannot.some(w => pediatricRegex.test(w))) {
      out.level = "AVOID";
      out.cssClass = "avoid";
      out.icon = "🚫";
      out.score = 1;
      out.severity = "High";
      out.reason = `${out.reason || ''} Age profile indicates child; this medicine has pediatric restrictions.`.trim();
      out.profileNotes.push("Child profile may increase risk.");
    } else if (profile.ageGroup === 'elderly') {
      out.profileNotes.push(safeMedicine.age_caution?.elderly || "Elderly profile: monitor side effects closely.");
    } else if (profile.ageGroup === 'child') {
      out.profileNotes.push(safeMedicine.age_caution?.child || "Child profile: use weight-based guidance from clinician.");
    }

    if (profile.pregnancy === 'yes') {
      const pregnancyStr = typeof safeMedicine.pregnancy === 'string' ? safeMedicine.pregnancy : '';
      const whoCannotArr = Array.isArray(safeMedicine.who_cannot) ? safeMedicine.who_cannot : [];
      
      if (/avoid/i.test(pregnancyStr) || whoCannotArr.some(w => /pregnan/i.test(w))) {
        out.level = "AVOID";
        out.cssClass = "avoid";
        out.icon = "🚫";
        out.score = 1;
        out.severity = "High";
      } else if (out.score > 2) {
        out.level = "CAUTION";
        out.cssClass = "caution";
        out.icon = "⚠️";
        out.score = 2;
        out.severity = "Medium";
      }
      out.profileNotes.push(`Pregnancy: ${pregnancyStr || "Consult clinician."}`);
    }

    if (profile.breastfeeding === 'yes') {
      const bfStr = typeof safeMedicine.breastfeeding === 'string' ? safeMedicine.breastfeeding : '';
      if (/caution|assess/i.test(bfStr) && out.score > 2) {
        out.level = "CAUTION";
        out.cssClass = "caution";
        out.icon = "⚠️";
        out.score = 2;
        out.severity = "Medium";
      }
      out.profileNotes.push(`Breastfeeding: ${bfStr || "Consult clinician."}`);
    }

    return out;
  }

  /**
   * Cross-checks declared user allergies against medicine allergen markers.
   * @param {Object} medicine - Medicine data
   * @param {string[]} allergies - Array of user allergy strings
   * @returns {Object|null} Allergy conflict risk or null
   */
  function evaluateAllergyRisk(medicine, allergies) {
    if (!medicine || typeof medicine !== 'object') return null;
    if (!Array.isArray(allergies) || !allergies.length) return null;

    const normalized = allergies
      .filter(a => typeof a === 'string' && a.trim().length > 0)
      .map(a => a.toLowerCase().trim());

    if (!normalized.length) return null;

    const allergenList = Array.isArray(medicine.allergens) ? medicine.allergens : [];
    const hits = allergenList.filter(al => typeof al === 'string' && normalized.includes(al.toLowerCase().trim()));
    if (!hits.length) return null;

    return {
      level: "AVOID",
      cssClass: "avoid",
      icon: "🚫",
      severity: "High",
      confidence: "High",
      reason: `Allergy/intolerance match found: ${hits.join(', ')}. Avoid this medicine and seek professional advice.`
    };
  }

  /**
   * Checks pairwise drug-drug interaction between two selected medicines.
   * @param {string} med1Name - Name of first medicine
   * @param {string} med2Name - Name of second medicine
   * @param {Array} [customRules] - Optional custom interaction rules array
   * @returns {Object|null} Interaction result
   */
  function evaluateInteraction(med1Name, med2Name, customRules) {
    if (!med1Name || !med2Name) return null;
    const rules = customRules || (root.SMASP && root.SMASP.data && root.SMASP.data.interactionRules) || [];
    const match = rules.find(rule =>
      Array.isArray(rule.meds) && rule.meds.includes(med1Name) && rule.meds.includes(med2Name)
    );

    if (!match) {
      return {
        level: "SAFE",
        cssClass: "safe",
        icon: "✅",
        severity: "Low",
        confidence: "Low",
        reason: "No known interaction rule found in this educational dataset."
      };
    }

    const css = match.level === "AVOID" ? "avoid" : match.level === "CAUTION" ? "caution" : "safe";
    const icon = css === "avoid" ? "🚫" : css === "caution" ? "⚠️" : "✅";
    return { ...match, cssClass: css, icon };
  }

  /**
   * Compares the safety score of two medicines to identify the safer option.
   * @param {string} name1
   * @param {Object} risk1
   * @param {string} name2
   * @param {Object} risk2
   * @returns {Object|null} Winner details
   */
  function getSaferMedicine(name1, risk1, name2, risk2) {
    if (!name2 || !risk2 || !risk1) return null;
    const score1 = typeof risk1.score === 'number' ? risk1.score : 0;
    const score2 = typeof risk2.score === 'number' ? risk2.score : 0;

    if (score1 > score2) return { name: name1, cssClass: risk1.cssClass || 'safe' };
    if (score2 > score1) return { name: name2, cssClass: risk2.cssClass || 'safe' };
    return { name: "Both Equal", cssClass: "safe" };
  }

  /**
   * Generates urgent clinical red flag alerts based on risk level.
   * @param {Object} risk
   * @returns {string[]} Red flag warnings
   */
  function getRedFlags(risk) {
    if (!risk || typeof risk !== 'object') return [];
    if (risk.level === 'AVOID') {
      return [
        "Seek immediate professional advice before taking this medicine.",
        "If already taken and symptoms worsen, seek urgent medical care.",
        "Do not combine with other pain medicines without clinical guidance."
      ];
    }
    if (risk.level === 'CAUTION') {
      return [
        "Consult clinician or pharmacist before repeat dosing.",
        "Stop medication and seek care if unexpected side effects occur."
      ];
    }
    return [];
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.engine = root.SMASP.engine || {};
  root.SMASP.engine.risk = {
    evaluateRisk,
    applyProfileRiskAdjustments,
    evaluateAllergyRisk,
    evaluateInteraction,
    getSaferMedicine,
    getRedFlags,
    getI18n
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.SMASP.engine.risk;
  }
})(typeof window !== 'undefined' ? window : globalThis);
