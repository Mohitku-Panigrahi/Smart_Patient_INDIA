/**
 * @file conditions.js
 * @description Health conditions, symptom suggestions, and allergen definitions.
 * @namespace SMASP.data.conditions
 */

(function (root) {
  'use strict';

  const defaultConditions = [
    "Asthma",
    "Diabetes",
    "High Blood Pressure",
    "Liver Disease",
    "Stomach Ulcer",
    "Bleeding Disorder",
    "Kidney Disease",
    "Heart Disease",
    "Pregnancy",
    "Breastfeeding"
  ];

  const symptomSuggestions = [
    "Headache",
    "Fever",
    "Back pain",
    "Joint pain",
    "Toothache",
    "Muscle pain",
    "Menstrual cramps",
    "Sore throat",
    "Body ache"
  ];

  const knownAllergens = [
    "NSAID",
    "Aspirin",
    "Paracetamol",
    "Salicylate"
  ];

  root.SMASP = root.SMASP || {};
  root.SMASP.data = root.SMASP.data || {};
  root.SMASP.data.defaultConditions = defaultConditions;
  root.SMASP.data.symptomSuggestions = symptomSuggestions;
  root.SMASP.data.knownAllergens = knownAllergens;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { defaultConditions, symptomSuggestions, knownAllergens };
  }
})(typeof window !== 'undefined' ? window : globalThis);
