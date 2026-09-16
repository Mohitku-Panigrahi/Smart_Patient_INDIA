/**
 * @file domUtils.js
 * @description Safe DOM manipulation, string sanitization, and ARIA accessibility notifications.
 * @namespace SMASP.ui.domUtils
 */

(function (root) {
  'use strict';

  /**
   * Sanitizes string for safe insertion into HTML context.
   * @param {*} value
   * @returns {string}
   */
  function escHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  /**
   * Sanitizes string for safe insertion into HTML attribute context.
   * @param {*} value
   * @returns {string}
   */
  function escAttr(value) {
    return escHtml(value).replaceAll('`', '&#96;');
  }

  /**
   * Retrieves or constructs a hidden ARIA live region for screen readers.
   * @returns {HTMLElement}
   */
  function getOrCreateLiveRegion() {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('appLiveRegion');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'appLiveRegion';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.width = '1px';
    el.style.height = '1px';
    el.style.overflow = 'hidden';
    document.body.appendChild(el);
    return el;
  }

  /**
   * Announces an accessible update message to screen readers and logs to console.
   * @param {string} message
   */
  function notify(message) {
    const text = String(message || '');
    const live = getOrCreateLiveRegion();
    if (live) live.textContent = text;
    console.info('[SMASP]', text);
  }

  /**
   * Initializes contrast toggling and restores saved user accessibility preferences.
   */
  function initAccessibilityControls() {
    if (typeof document === 'undefined') return;
    const btn = document.getElementById('contrastToggle');
    const storage = root.SMASP?.storage;

    if (storage && storage.isHighContrast()) {
      document.body.classList.add('high-contrast');
    }

    if (btn) {
      btn.addEventListener('click', () => {
        document.body.classList.toggle('high-contrast');
        const active = document.body.classList.contains('high-contrast');
        if (storage) storage.setHighContrast(active);
        notify(active ? 'High contrast mode enabled.' : 'High contrast mode disabled.');
      });
    }
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.ui = root.SMASP.ui || {};
  root.SMASP.ui.domUtils = {
    escHtml,
    escAttr,
    getOrCreateLiveRegion,
    notify,
    initAccessibilityControls
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.SMASP.ui.domUtils;
  }
})(typeof window !== 'undefined' ? window : globalThis);
