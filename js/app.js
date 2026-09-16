/**
 * @file app.js
 * @description Main application entry point and router. Detects active page
 * and bootstraps accessibility controls and corresponding view lifecycle.
 * @namespace SMASP.app
 */

(function (root) {
  'use strict';

  function init() {
    if (typeof document === 'undefined') return;

    // Initialize global accessibility features (contrast toggle, keyboard aids)
    if (root.SMASP?.ui?.domUtils?.initAccessibilityControls) {
      root.SMASP.ui.domUtils.initAccessibilityControls();
    }

    // Initialize excellence layer (dark mode, plain english, micro-interactions)
    if (root.SMASP?.ui?.excellence?.initExcellence) {
      root.SMASP.ui.excellence.initExcellence();
    }

    const page = document.body.dataset.page;

    if (page === 'home') {
      if (root.SMASP?.ui?.homeView?.initHomePage) {
        root.SMASP.ui.homeView.initHomePage();
      }
    } else if (page === 'result') {
      if (root.SMASP?.ui?.resultView?.renderResultsPage) {
        root.SMASP.ui.resultView.renderResultsPage();
      }
      if (root.SMASP?.ui?.components?.renderAwareness) {
        root.SMASP.ui.components.renderAwareness('awarenessGridResult');
      }
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.init = init;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { init };
  }
})(typeof window !== 'undefined' ? window : globalThis);
