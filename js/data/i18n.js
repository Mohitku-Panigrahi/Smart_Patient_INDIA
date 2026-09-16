/**
 * @file i18n.js
 * @description Internationalization dictionary for multilingual support.
 * @namespace SMASP.data.i18n
 */

(function (root) {
  'use strict';

  const i18n = {
    en: {
      noCondition: "No health condition selected — no known conflicts identified.",
      educationalOnly: "Educational results only. Not medical advice.",
      riskReasonSafe: "No known conflict between this medicine and your selected condition(s). Always verify with a licensed healthcare professional."
    },
    hi: {
      noCondition: "कोई स्वास्थ्य स्थिति चयनित नहीं — ज्ञात टकराव नहीं मिला।",
      educationalOnly: "केवल शैक्षिक परिणाम। यह चिकित्सकीय सलाह नहीं है।",
      riskReasonSafe: "चयनित स्वास्थ्य स्थितियों के साथ ज्ञात टकराव नहीं मिला। कृपया चिकित्सक से पुष्टि करें।"
    }
  };

  root.SMASP = root.SMASP || {};
  root.SMASP.data = root.SMASP.data || {};
  root.SMASP.data.i18n = i18n;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = i18n;
  }
})(typeof window !== 'undefined' ? window : globalThis);
