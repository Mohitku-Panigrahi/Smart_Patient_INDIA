/**
 * @file logger.js
 * @description Production-grade client-side logging and observability utility for SMASP.
 * Captures INFO, WARN, and ERROR logs with timestamps and metadata.
 * Buffers the last 100 entries in localStorage for debugging and error diagnosis.
 * @namespace SMASP.engine.logger
 */

(function (root) {
  'use strict';

  const STORAGE_KEY = 'smasp_telemetry_logs';
  const MAX_LOGS = 100;

  const Logger = {
    /**
     * Records a log entry.
     * @param {'INFO'|'WARN'|'ERROR'} level - Log severity level
     * @param {string} msg - Message description
     * @param {Object} [data] - Contextual metadata
     * @returns {Object} The formatted log entry
     */
    log: function (level, msg, data) {
      const timestamp = new Date().toISOString();
      const entry = {
        timestamp,
        level: level || 'INFO',
        msg: String(msg || ''),
        data: data ? sanitizeData(data) : undefined
      };

      try {
        if (typeof localStorage !== 'undefined') {
          const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          logs.push(entry);
          if (logs.length > MAX_LOGS) {
            logs.splice(0, logs.length - MAX_LOGS);
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        }
      } catch (err) {
        // Storage full or restricted in private mode
      }

      if (level === 'ERROR') {
        console.error(`[SMASP ERROR ${timestamp}] ${msg}`, data || '');
      } else if (level === 'WARN') {
        console.warn(`[SMASP WARN ${timestamp}] ${msg}`, data || '');
      }

      return entry;
    },

    info: function (msg, data) {
      return Logger.log('INFO', msg, data);
    },

    warn: function (msg, data) {
      return Logger.log('WARN', msg, data);
    },

    error: function (msg, data) {
      return Logger.log('ERROR', msg, data);
    },

    /**
     * Retrieves stored log buffer.
     * @returns {Array<Object>}
     */
    getLogs: function () {
      try {
        if (typeof localStorage !== 'undefined') {
          return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        }
      } catch (err) {}
      return [];
    },

    /**
     * Clears stored log buffer.
     */
    clearLogs: function () {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (err) {}
    }
  };

  function sanitizeData(data) {
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return String(data);
    }
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.engine = root.SMASP.engine || {};
  root.SMASP.engine.logger = Logger;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
  }
})(typeof window !== 'undefined' ? window : globalThis);
