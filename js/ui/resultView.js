/**
 * @file resultView.js
 * @description View controller for the safety evaluation results interface (result.html).
 * Orchestrates clinical evaluation, rich UI card rendering, comparison matrix, and print export.
 * @namespace SMASP.ui.resultView
 */

(function (root) {
  'use strict';

  function escHtml(val) {
    return root.SMASP?.ui?.domUtils?.escHtml ? root.SMASP.ui.domUtils.escHtml(val) : String(val ?? '');
  }

  function notify(msg) {
    if (root.SMASP?.ui?.domUtils?.notify) {
      root.SMASP.ui.domUtils.notify(msg);
    }
  }

  /**
   * Parses allergies from URL search params.
   * @param {URLSearchParams} params
   * @returns {string[]}
   */
  function getAllergiesFromParams(params) {
    const raw = params.get('allergies') || '';
    return raw.split(',').map(a => a.trim()).filter(Boolean);
  }

  /**
   * Toggles clinician mode for high-density, cleaner print output.
   */
  function toggleClinicianMode() {
    document.body.classList.toggle('clinician-mode');
    const enabled = document.body.classList.contains('clinician-mode');
    notify(enabled ? 'Clinician mode enabled for cleaner print summaries.' : 'Clinician mode disabled.');
  }

  /**
   * Triggers browser print dialog for the clinical awareness report.
   */
  function printReport() {
    const origTitle = document.title;
    document.title = 'Personal Medicine Awareness Report — SMASP';
    window.print();
    document.title = origTitle;
  }

  /**
   * Attaches interactive event listeners to generated result widgets.
   */
  function bindResultInteractions() {
    // Voice buttons
    document.querySelectorAll('.js-voice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-med-name') || '';
        const text = btn.getAttribute('data-voice-text') || '';
        const lang = btn.getAttribute('data-voice-lang') || 'en-US';
        if (root.SMASP?.engine?.speech?.speakMedicine) {
          root.SMASP.engine.speech.speakMedicine(name, text, lang);
        }
      });
    });

    // Bookmark buttons
    document.querySelectorAll('.js-bookmark-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-med-name') || '';
        if (root.SMASP?.storage?.bookmarkMedicine) {
          root.SMASP.storage.bookmarkMedicine(name);
          notify(`${name} bookmarked.`);
        }
      });
    });

    // Control buttons
    const printBtn = document.getElementById('printReportBtn');
    if (printBtn) printBtn.addEventListener('click', printReport);

    const clinicianBtn = document.getElementById('clinicianModeBtn');
    if (clinicianBtn) clinicianBtn.addEventListener('click', toggleClinicianMode);

    const stopVoiceBtn = document.getElementById('stopVoiceBtn');
    if (stopVoiceBtn) {
      stopVoiceBtn.addEventListener('click', () => {
        if (root.SMASP?.engine?.speech?.stopSpeech) {
          root.SMASP.engine.speech.stopSpeech();
        }
      });
    }
  }

  /**
   * Main rendering routine for the safety results page.
   */
  function renderResultsPage() {
    const storage = root.SMASP?.storage;
    const engine = root.SMASP?.engine?.risk;
    const comps = root.SMASP?.ui?.components;

    const dataset = storage ? storage.loadDataset() : { medicines: {}, conditions: [] };
    const medicines = dataset.medicines || {};
    const conditions = dataset.conditions || [];

    const params = new URLSearchParams(window.location.search);
    const condRaw = params.get('conditions') || "";
    const userConds = condRaw ? condRaw.split(',').map(c => c.trim()).filter(c => conditions.includes(c)) : [];

    const med1NameRaw = params.get('med1') || "";
    const med2NameRaw = params.get('med2') || "";
    const med1Name = Object.keys(medicines).find(n => n === med1NameRaw) || "";
    const med2Name = Object.keys(medicines).find(n => n === med2NameRaw) || "";
    const med1 = medicines[med1Name];
    const med2 = med2Name ? medicines[med2Name] : null;

    const ageGroup = params.get('ageGroup') || 'adult';
    const pregnancy = params.get('pregnancy') || 'no';
    const breastfeeding = params.get('breastfeeding') || 'no';
    const allergies = getAllergiesFromParams(params);
    const voiceLang = params.get('voiceLang') || localStorage.getItem('smasp_voice_lang') || 'en-US';
    const lang = params.get('lang') || (storage ? storage.getLang() : 'en');
    if (storage) storage.setLang(lang);

    const profile = { ageGroup, pregnancy, breastfeeding };
    const resultsContainer = document.getElementById('resultsContainer');
    if (!resultsContainer) return;

    if (!med1) {
      resultsContainer.innerHTML = `
        <div class="text-center py-5">
          <div style="font-size:3rem;margin-bottom:16px;">🔍</div>
          <h4>No medicine data found.</h4>
          <a href="index.html" class="btn-primary-custom mt-3 d-inline-flex">← Start New Search</a>
        </div>`;
      return;
    }

    // Hero chips
    const heroChips = document.getElementById('heroChips');
    if (heroChips) {
      const condChips = userConds.length
        ? userConds.map(c => `<span class="query-chip">❤️ ${escHtml(c)}</span>`).join('')
        : '<span class="query-chip">No conditions selected</span>';
      const profileChip = `<span class="query-chip">👤 ${escHtml(ageGroup)}${pregnancy === 'yes' ? ' · pregnant' : ''}${breastfeeding === 'yes' ? ' · breastfeeding' : ''}</span>`;
      heroChips.innerHTML = `
        ${condChips}
        ${profileChip}
        <span class="query-chip">💊 ${escHtml(med1Name)}${med2 ? ` vs ${escHtml(med2Name)}` : ''}</span>
      `;
    }

    // Clinical Evaluation
    let risk1 = engine.applyProfileRiskAdjustments(engine.evaluateRisk(userConds, med1, lang), med1, profile);
    let risk2 = med2 ? engine.applyProfileRiskAdjustments(engine.evaluateRisk(userConds, med2, lang), med2, profile) : null;

    const allergyRisk1 = engine.evaluateAllergyRisk(med1, allergies);
    const allergyRisk2 = med2 ? engine.evaluateAllergyRisk(med2, allergies) : null;

    if (allergyRisk1) {
      risk1 = { ...risk1, ...allergyRisk1, reason: [risk1.reason, allergyRisk1.reason].filter(Boolean).join(' ') };
    }
    if (risk2 && allergyRisk2) {
      risk2 = { ...risk2, ...allergyRisk2, reason: [risk2.reason, allergyRisk2.reason].filter(Boolean).join(' ') };
    }

    // Render HTML structures
    let html = '';

    // If comparing two medicines, show comparison score banner and interaction check
    if (med2 && comps?.buildSafetyScoreBanner) {
      html += comps.buildSafetyScoreBanner(med1Name, risk1, med2Name, risk2);
      if (comps.buildInteractionBanner) {
        html += comps.buildInteractionBanner(med1Name, med2Name);
      }
    }

    // Medicine Cards Row
    html += '<div class="row g-4 mb-4">';
    if (med2) {
      html += `<div class="col-lg-6">${comps.buildMedicineCard(med1Name, med1, risk1, voiceLang)}</div>`;
      html += `<div class="col-lg-6">${comps.buildMedicineCard(med2Name, med2, risk2, voiceLang)}</div>`;
    } else {
      html += `<div class="col-lg-8 mx-auto">${comps.buildMedicineCard(med1Name, med1, risk1, voiceLang)}</div>`;
    }
    html += '</div>';

    // Side-by-Side Comparison Table (if comparing)
    if (med2 && comps?.buildComparisonTable) {
      html += comps.buildComparisonTable(med1Name, med1, risk1, med2Name, med2, risk2, userConds);
    }

    // Control buttons bar
    html += `
      <div class="back-row">
        <a href="index.html" class="btn-primary-custom">← New Search</a>
        <button type="button" id="printReportBtn" class="btn-secondary-custom">📄 Print Health Report</button>
        <button type="button" id="clinicianModeBtn" class="btn-secondary-custom">🧑‍⚕️ Clinician Mode</button>
        <button type="button" id="stopVoiceBtn" class="btn-secondary-custom">🔇 Stop Voice</button>
      </div>
    `;

    resultsContainer.innerHTML = html;

    // Attach event listeners to dynamic elements
    bindResultInteractions();

    // Source Citations
    const srcEl = document.getElementById('sourceCitations');
    if (srcEl && comps?.buildSourceCitations) {
      srcEl.innerHTML = comps.buildSourceCitations([med1, ...(med2 ? [med2] : [])]);
    }
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.ui = root.SMASP.ui || {};
  root.SMASP.ui.resultView = {
    renderResultsPage,
    toggleClinicianMode,
    printReport
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.SMASP.ui.resultView;
  }
})(typeof window !== 'undefined' ? window : globalThis);
