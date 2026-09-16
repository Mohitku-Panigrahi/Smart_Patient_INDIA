/**
 * @file interactions.js
 * @description Pairwise drug-drug interaction (DDI) rules, risk tiers, and clinical rationales.
 * @namespace SMASP.data.interactions
 */

(function (root) {
  'use strict';

  const interactionRules = [
    {
      meds: ["Aspirin", "Ibuprofen"],
      level: "CAUTION",
      reason: "Ibuprofen may reduce aspirin's antiplatelet effect and increase GI irritation risk.",
      severity: "Medium",
      confidence: "Moderate"
    },
    {
      meds: ["Aspirin", "Diclofenac"],
      level: "AVOID",
      reason: "Dual NSAID exposure significantly increases gastrointestinal bleeding and renal toxicity risk.",
      severity: "High",
      confidence: "Moderate"
    },
    {
      meds: ["Ibuprofen", "Naproxen"],
      level: "AVOID",
      reason: "Combining multiple NSAIDs significantly increases GI mucosal damage and kidney strain.",
      severity: "High",
      confidence: "High"
    },
    {
      meds: ["Ibuprofen", "Diclofenac"],
      level: "AVOID",
      reason: "Avoid combining systemic NSAIDs due to additive cardiovascular, GI, and renal toxicities.",
      severity: "High",
      confidence: "High"
    }
  ];

  root.SMASP = root.SMASP || {};
  root.SMASP.data = root.SMASP.data || {};
  root.SMASP.data.interactionRules = interactionRules;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = interactionRules;
  }
})(typeof window !== 'undefined' ? window : globalThis);
