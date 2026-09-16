/**
 * @file awarenessTips.js
 * @description Educational medicine safety cards and guidance tips.
 * @namespace SMASP.data.awarenessTips
 */

(function (root) {
  'use strict';

  const awarenessTips = [
    {
      icon: "🚫",
      bg: "#fdedec",
      title: "Dangers of Self-Medication",
      tips: [
        "Self-prescribing can mask serious underlying conditions",
        "Incorrect doses can lead to organ damage or overdose",
        "Drug interactions may go unnoticed without professional review",
        "OTC medicines are not without real risks",
        "Antibiotic resistance worsens with unsupervised use"
      ]
    },
    {
      icon: "❤️",
      bg: "#eafaf1",
      title: "Check Your Health Conditions",
      tips: [
        "Always disclose existing conditions to your pharmacist",
        "Some medicines are contraindicated with chronic diseases",
        "Pregnancy and breastfeeding change medication safety profiles",
        "Kidney or liver disease affects how drugs are metabolized",
        "Age significantly alters drug metabolism and dosing"
      ]
    },
    {
      icon: "🩺",
      bg: "#eaf4fd",
      title: "When to Consult a Doctor",
      tips: [
        "Symptoms persist for more than 3 days without improvement",
        "You are taking 3 or more medications simultaneously",
        "You experience unexpected or severe side effects",
        "You are considering stopping a prescribed medication",
        "You have a new or worsening chronic condition"
      ]
    },
    {
      icon: "🛡️",
      bg: "#fef9e7",
      title: "Prevention & Safe Habits",
      tips: [
        "Keep an updated list of all medications you take",
        "Store medicines away from heat, light, and children",
        "Never share prescription medications with others",
        "Always check expiry dates before use",
        "Follow prescribed schedules — timing matters for effectiveness"
      ]
    }
  ];

  root.SMASP = root.SMASP || {};
  root.SMASP.data = root.SMASP.data || {};
  root.SMASP.data.awarenessTips = awarenessTips;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = awarenessTips;
  }
})(typeof window !== 'undefined' ? window : globalThis);
