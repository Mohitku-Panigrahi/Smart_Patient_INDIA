/**
 * @file homeView.js
 * @description View controller for the home search interface (index.html).
 * Manages form binding, condition filtering, admin dataset panel, and analytics.
 * @namespace SMASP.ui.homeView
 */

(function (root) {
  'use strict';

  function escHtml(val) {
    return root.SMASP?.ui?.domUtils?.escHtml ? root.SMASP.ui.domUtils.escHtml(val) : String(val ?? '');
  }

  function escAttr(val) {
    return root.SMASP?.ui?.domUtils?.escAttr ? root.SMASP.ui.domUtils.escAttr(val) : String(val ?? '');
  }

  function notify(msg) {
    if (root.SMASP?.ui?.domUtils?.notify) {
      root.SMASP.ui.domUtils.notify(msg);
    }
  }

  /**
   * Populates condition checkboxes grid.
   * @param {string} containerId
   * @param {string[]} conditions
   */
  function populateConditionCheckboxes(containerId, conditions) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = (conditions || []).map(c => `
      <label class="condition-check-label">
        <input type="checkbox" name="conditions" value="${escAttr(c)}" />
        <span>${escHtml(c)}</span>
      </label>
    `).join('');
  }

  /**
   * Populates medicine dropdown selection.
   * @param {string} selectId
   * @param {Object} medicines
   * @param {string} placeholder
   */
  function populateMedicines(selectId, medicines, placeholder) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '';
    const blank = document.createElement('option');
    blank.value = "";
    blank.textContent = placeholder || "Select a medicine";
    sel.appendChild(blank);

    Object.keys(medicines || {}).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${medicines[name].icon || '💊'}  ${name} — ${medicines[name].use || ''}`;
      sel.appendChild(opt);
    });
  }

  /**
   * Populates HTML5 datalist element with suggestions.
   * @param {string} id
   * @param {string[]} values
   */
  function populateDatalist(id, values) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = (values || []).map(v => `<option value="${escAttr(v)}"></option>`).join('');
  }

  /**
   * Live filter for condition checkboxes.
   * @param {string} query
   */
  function filterConditions(query) {
    const q = (query || "").trim().toLowerCase();
    document.querySelectorAll('#conditionCheckboxes .condition-check-label').forEach(label => {
      const text = label.textContent.toLowerCase();
      label.style.display = text.includes(q) ? '' : 'none';
    });
  }

  /**
   * Connects quick medicine search input to primary medicine dropdown.
   * @param {Object} medicines
   */
  function bindMedicineSearch(medicines) {
    const input = document.getElementById('medicineSearchInput');
    const select1 = document.getElementById('medicine1Select');
    if (!input || !select1) return;

    input.addEventListener('input', () => {
      const term = input.value.trim().toLowerCase();
      if (!term) return;
      const name = Object.keys(medicines || {}).find(m => m.toLowerCase().includes(term));
      if (name) select1.value = name;
    });
  }

  /**
   * Displays inline form error alert.
   * @param {string} msg
   */
  function showFormError(msg) {
    const el = document.getElementById('formError');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => {
      if (el) el.style.display = 'none';
    }, 4000);
  }

  /**
   * Form submission handler.
   */
  function handleFormSubmit(e) {
    e.preventDefault();
    const disease = document.getElementById('diseaseInput')?.value.trim() || "";
    const checked = [...document.querySelectorAll('input[name="conditions"]:checked')].map(el => el.value);
    const med1 = document.getElementById('medicine1Select')?.value || "";
    const med2 = document.getElementById('medicine2Select')?.value || "";
    const ageGroup = document.getElementById('ageGroupSelect')?.value || "adult";
    const pregnancy = document.getElementById('pregnancySelect')?.value || "no";
    const breastfeeding = document.getElementById('breastfeedingSelect')?.value || "no";
    const allergiesRaw = document.getElementById('allergyInput')?.value || "";
    const voiceLang = document.getElementById('voiceLanguageSelect')?.value || "en-US";
    const language = document.getElementById('languageSelect')?.value || "en";

    if (!med1) {
      showFormError("Please select at least one medicine to evaluate.");
      return;
    }

    const params = new URLSearchParams();
    if (disease) params.set('disease', disease);
    if (checked.length) params.set('conditions', checked.join(','));
    params.set('med1', med1);
    if (med2 && med2 !== med1) params.set('med2', med2);
    params.set('ageGroup', ageGroup);
    params.set('pregnancy', pregnancy);
    params.set('breastfeeding', breastfeeding);
    if (allergiesRaw.trim()) params.set('allergies', allergiesRaw);
    params.set('voiceLang', voiceLang);
    params.set('lang', language);

    root.SMASP?.storage?.setLang(language);
    root.SMASP?.storage?.pushHistoryRecord({
      disease,
      conditions: checked,
      med1,
      med2,
      ageGroup,
      pregnancy,
      breastfeeding,
      allergies: allergiesRaw
    });

    window.location.href = `result.html?${params.toString()}`;
  }

  /**
   * Shows recent search history.
   */
  function showHistoryModal() {
    const items = root.SMASP?.storage?.readHistory() || [];
    if (!items.length) {
      notify('No history available yet.');
      return;
    }
    const lines = items.slice(0, 10).map(i =>
      `${new Date(i.at).toLocaleString()}: ${i.med1}${i.med2 ? ` vs ${i.med2}` : ''}`
    ).join('\n');
    notify(`Recent searches loaded (${items.length} entries).`);
    console.info(`[SMASP Recent Searches]\n\n${lines}`);
  }

  /**
   * Renders local search analytics panel.
   */
  function renderAnalyticsHome() {
    const panel = document.getElementById('analyticsPanel');
    if (!panel) return;

    const history = root.SMASP?.storage?.readHistory() || [];
    const medCount = {};
    const pairCount = {};

    history.forEach(h => {
      if (h.med1) medCount[h.med1] = (medCount[h.med1] || 0) + 1;
      if (h.med2) medCount[h.med2] = (medCount[h.med2] || 0) + 1;
      if (h.med1 && h.med2) {
        const k = [h.med1, h.med2].sort().join(' + ');
        pairCount[k] = (pairCount[k] || 0) + 1;
      }
    });

    const topMeds = Object.entries(medCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topPairs = Object.entries(pairCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const bookmarkList = root.SMASP?.storage?.readBookmarks() || [];

    panel.innerHTML = `
      <div class="row g-3">
        <div class="col-md-4">
          <h6 style="font-weight:800;">Top Medicines</h6>
          ${topMeds.length ? `<ul>${topMeds.map(([m, c]) => `<li>${escHtml(m)} (${escHtml(c)})</li>`).join('')}</ul>` : '<p class="text-muted">No search data yet.</p>'}
        </div>
        <div class="col-md-4">
          <h6 style="font-weight:800;">Frequent Combinations</h6>
          ${topPairs.length ? `<ul>${topPairs.map(([p, c]) => `<li>${escHtml(p)} (${escHtml(c)})</li>`).join('')}</ul>` : '<p class="text-muted">No comparison data yet.</p>'}
        </div>
        <div class="col-md-4">
          <h6 style="font-weight:800;">Bookmarked Medicines</h6>
          ${bookmarkList.length ? `<div>${bookmarkList.map(b => `<span class="bookmark-chip">⭐ ${escHtml(b)}</span>`).join('')}</div>` : '<p class="text-muted">No bookmarks yet.</p>'}
        </div>
      </div>
    `;
  }

  /**
   * Initializes local dataset JSON editor in the admin panel.
   * @param {Object} currentDataset
   * @param {Function} onDatasetUpdated
   */
  function initAdminPanel(currentDataset, onDatasetUpdated) {
    const txt = document.getElementById('adminDatasetJson');
    const loadBtn = document.getElementById('adminLoadCurrentBtn');
    const applyBtn = document.getElementById('adminApplyBtn');
    const resetBtn = document.getElementById('adminResetBtn');
    if (!txt || !loadBtn || !applyBtn || !resetBtn) return;

    loadBtn.addEventListener('click', () => {
      txt.value = JSON.stringify(currentDataset, null, 2);
    });

    applyBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(txt.value || '{}');
        if (!parsed.medicines || !parsed.conditions) {
          throw new Error("Invalid dataset: must contain 'medicines' object and 'conditions' array.");
        }
        currentDataset.medicines = parsed.medicines;
        currentDataset.conditions = parsed.conditions;
        root.SMASP?.storage?.saveDataset(currentDataset.medicines, currentDataset.conditions);
        notify('Dataset applied. Refreshing form options.');
        if (typeof onDatasetUpdated === 'function') onDatasetUpdated();
      } catch (e) {
        notify(`Invalid JSON: ${e.message}`);
      }
    });

    resetBtn.addEventListener('click', () => {
      root.SMASP?.storage?.resetDataset();
      const fresh = root.SMASP?.storage?.loadDataset();
      currentDataset.medicines = fresh.medicines;
      currentDataset.conditions = fresh.conditions;
      txt.value = '';
      notify('Dataset reset to defaults.');
      if (typeof onDatasetUpdated === 'function') onDatasetUpdated();
    });
  }

  /**
   * Main entry point for initializing the Home page.
   */
  function initHomePage() {
    const storage = root.SMASP?.storage;
    const dataset = storage ? storage.loadDataset() : { medicines: {}, conditions: [] };

    function refreshForm() {
      populateConditionCheckboxes('conditionCheckboxes', dataset.conditions);
      populateMedicines('medicine1Select', dataset.medicines, '— Select primary medicine');
      populateMedicines('medicine2Select', dataset.medicines, '— Optional: compare with');
      bindMedicineSearch(dataset.medicines);
    }

    refreshForm();

    const data = root.SMASP?.data || {};
    populateDatalist('symptomSuggestions', data.symptomSuggestions || []);
    populateDatalist('allergySuggestions', data.knownAllergens || []);

    if (root.SMASP?.ui?.components?.renderAwareness) {
      root.SMASP.ui.components.renderAwareness('awarenessGrid');
    }

    renderAnalyticsHome();
    initAdminPanel(dataset, refreshForm);

    const cSearch = document.getElementById('conditionSearchInput');
    if (cSearch) {
      cSearch.addEventListener('input', () => filterConditions(cSearch.value));
    }

    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
      historyBtn.addEventListener('click', showHistoryModal);
    }

    const langSelect = document.getElementById('languageSelect');
    if (langSelect && storage) {
      langSelect.value = storage.getLang();
      langSelect.addEventListener('change', () => storage.setLang(langSelect.value));
    }

    const form = document.getElementById('searchForm');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.ui = root.SMASP.ui || {};
  root.SMASP.ui.homeView = {
    initHomePage,
    populateConditionCheckboxes,
    populateMedicines,
    populateDatalist,
    filterConditions,
    renderAnalyticsHome,
    showHistoryModal
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.SMASP.ui.homeView;
  }
})(typeof window !== 'undefined' ? window : globalThis);
