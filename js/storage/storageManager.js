/**
 * @file storageManager.js
 * @description Safe LocalStorage abstraction for datasets, history, bookmarks, and preferences.
 * @namespace SMASP.storage
 */

(function (root) {
  'use strict';

  const KEYS = {
    DATASET: 'smasp_dataset',
    HISTORY: 'smasp_history',
    BOOKMARKS: 'smasp_bookmarks',
    LANG: 'smasp_lang',
    VOICE_LANG: 'smasp_voice_lang',
    HIGH_CONTRAST: 'smasp_high_contrast'
  };

  /**
   * Safely loads custom dataset from storage, falling back to defaults.
   * @returns {{ medicines: Object, conditions: Array }}
   */
  function loadDataset() {
    const defaults = root.SMASP?.data || {};
    let meds = { ...(defaults.defaultMedicines || {}) };
    let conds = [...(defaults.defaultConditions || [])];

    try {
      const raw = localStorage.getItem(KEYS.DATASET);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.medicines && typeof parsed.medicines === 'object') meds = parsed.medicines;
        if (Array.isArray(parsed?.conditions)) conds = parsed.conditions;
      }
    } catch (err) {
      console.warn('StorageManager: unable to load stored dataset; using defaults.', err);
    }

    return { medicines: meds, conditions: conds };
  }

  /**
   * Saves updated dataset to local storage.
   * @param {Object} medicines
   * @param {Array} conditions
   */
  function saveDataset(medicines, conditions) {
    try {
      localStorage.setItem(KEYS.DATASET, JSON.stringify({ medicines, conditions }));
    } catch (err) {
      console.error('StorageManager: failed to save dataset.', err);
    }
  }

  /**
   * Clears custom dataset from storage, reverting to default.
   */
  function resetDataset() {
    try {
      localStorage.removeItem(KEYS.DATASET);
    } catch (err) {
      console.warn('StorageManager: failed to remove dataset from storage.', err);
    }
  }

  /**
   * Records a search query in local history.
   * @param {Object} record
   */
  function pushHistoryRecord(record) {
    try {
      const history = readHistory();
      history.unshift({ ...record, at: new Date().toISOString() });
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(history.slice(0, 25)));
    } catch (err) {
      console.warn('StorageManager: failed to save history record.', err);
    }
  }

  /**
   * Retrieves recorded search history.
   * @returns {Array} List of past evaluations
   */
  function readHistory() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Adds a medicine name to bookmarks.
   * @param {string} name
   */
  function bookmarkMedicine(name) {
    try {
      const bookmarks = readBookmarks();
      if (!bookmarks.includes(name)) {
        bookmarks.push(name);
        localStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(bookmarks));
      }
    } catch (err) {
      console.warn('StorageManager: failed to bookmark.', err);
    }
  }

  /**
   * Retrieves bookmarked medicine names.
   * @returns {string[]}
   */
  function readBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.BOOKMARKS) || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Gets current active UI language code.
   * @returns {string}
   */
  function getLang() {
    try {
      return localStorage.getItem(KEYS.LANG) || 'en';
    } catch {
      return 'en';
    }
  }

  /**
   * Sets UI language preference.
   * @param {string} lang
   */
  function setLang(lang) {
    try {
      localStorage.setItem(KEYS.LANG, lang);
    } catch (err) {
      console.warn('StorageManager: failed to save language.', err);
    }
  }

  /**
   * Checks if high contrast mode is enabled.
   * @returns {boolean}
   */
  function isHighContrast() {
    try {
      return localStorage.getItem(KEYS.HIGH_CONTRAST) === '1';
    } catch {
      return false;
    }
  }

  /**
   * Toggles or sets high contrast state.
   * @param {boolean} enabled
   */
  function setHighContrast(enabled) {
    try {
      localStorage.setItem(KEYS.HIGH_CONTRAST, enabled ? '1' : '0');
    } catch (err) {
      console.warn('StorageManager: failed to save high contrast setting.', err);
    }
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.storage = {
    loadDataset,
    saveDataset,
    resetDataset,
    pushHistoryRecord,
    readHistory,
    bookmarkMedicine,
    readBookmarks,
    getLang,
    setLang,
    isHighContrast,
    setHighContrast
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.SMASP.storage;
  }
})(typeof window !== 'undefined' ? window : globalThis);
