/**
 * @file speechEngine.js
 * @description Web Speech API wrapper for vocalizing clinical explanations.
 * @namespace SMASP.engine.speech
 */

(function (root) {
  'use strict';

  /**
   * Speaks clinical explanation for a medicine using browser synthesis.
   * @param {string} name - Medicine name
   * @param {string} text - Explanation script
   * @param {string} [lang='en-US'] - Speech language code
   */
  function speakMedicine(name, text, lang) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (root.SMASP?.ui?.domUtils?.notify) {
        root.SMASP.ui.domUtils.notify('Voice synthesis is not supported in this browser.');
      }
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.pitch = 1.0;
    utterance.lang = lang || 'en-US';

    try {
      localStorage.setItem('smasp_voice_lang', utterance.lang);
    } catch (e) {
      // Ignore private browsing storage restrictions
    }

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Immediately stops any ongoing speech synthesis.
   */
  function stopSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.engine = root.SMASP.engine || {};
  root.SMASP.engine.speech = {
    speakMedicine,
    stopSpeech
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.SMASP.engine.speech;
  }
})(typeof window !== 'undefined' ? window : globalThis);
