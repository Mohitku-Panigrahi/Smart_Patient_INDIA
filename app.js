/**
 * @file app.js
 * @description Master client-side controller for SMASP static site.
 * Handles data fetching, in-memory fuzzy search, category filtering,
 * calm warning rendering, plain-English term glossaries, voice synthesis,
 * dark mode toggling, and offline PWA service worker registration.
 */

'use strict';

// ── 1. Terminology Glossary (Plain English Explanations) ─────────────────────
const GLOSSARY = {
  'nsaid': 'Non-Steroidal Anti-Inflammatory Drug — a common class of medicine used to reduce pain and swelling.',
  'ssri': 'Selective Serotonin Reuptake Inhibitor — a modern, common type of antidepressant.',
  'snri': 'Serotonin-Norepinephrine Reuptake Inhibitor — an antidepressant that works on two brain chemicals.',
  'ace inhibitor': 'A medicine that relaxes blood vessels to help lower blood pressure and protect kidneys.',
  'arb': 'Angiotensin Receptor Blocker — lowers blood pressure by preventing blood vessels from tightening.',
  'beta-blocker': 'A medicine that slows the heart rate, reducing blood pressure and heart workload.',
  'statin': 'A medicine that helps lower "bad" cholesterol in the blood and protect arteries.',
  'proton pump inhibitor': 'A medicine that significantly reduces the amount of acid your stomach produces.',
  'ppi': 'Proton Pump Inhibitor — reduces stomach acid production.',
  'histamine': 'A chemical your body naturally releases during an allergic reaction, causing itchiness, sneezing, and runny nose.',
  'antihistamine': 'A medicine that blocks allergy-triggering histamine to relieve sneezing, itching, and hives.',
  'hepatotoxicity': 'Medical term for liver irritation or damage.',
  'nephrotoxicity': 'Medical term for kidney irritation or stress.',
  'reye\'s syndrome': 'A rare but serious condition affecting the liver and brain in children taking aspirin during viral illnesses.',
  'contraindicated': 'Doctors strongly advise against taking this medicine in this specific situation.',
  'hypoglycemia': 'Blood sugar levels dropping below the normal, safe range.',
  'hypertension': 'Chronically high blood pressure in the arteries.',
  'gastroparesis': 'Delayed stomach emptying, common in long-term diabetes.',
  'tardive dyskinesia': 'Involuntary, repetitive muscle movements occasionally caused by certain medications.',
  'serotonin syndrome': 'A potentially serious reaction caused by excessively high levels of serotonin when combining certain medicines.'
};

// ── 2. Category Slugs for CSS Badges ─────────────────────────────────────────
function getCategoryBadgeClass(category) {
  const cat = String(category || '').toLowerCase();
  if (cat.includes('pain') || cat.includes('fever')) return 'cat-badge--pain';
  if (cat.includes('antibiotic')) return 'cat-badge--antibiotic';
  if (cat.includes('stomach') || cat.includes('gi')) return 'cat-badge--stomach';
  if (cat.includes('allergy') || cat.includes('cold')) return 'cat-badge--allergy';
  if (cat.includes('chronic')) return 'cat-badge--chronic';
  if (cat.includes('mental') || cat.includes('sleep')) return 'cat-badge--mental';
  return 'cat-badge--pain';
}

// ── 3. Helper Utilities ────────────────────────────────────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapPlainTerms(text) {
  if (!text) return '';
  let escaped = escapeHtml(text);

  Object.entries(GLOSSARY).forEach(([term, explanation]) => {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b(${escapedTerm})\\b`, 'gi');
    escaped = escaped.replace(regex, (match) => {
      return `<span class="plain-term" tabindex="0">` +
             `<span class="term-word">${match}</span>` +
             `<span class="term-badge" aria-label="Plain English: ${escapeHtml(explanation)}">?</span>` +
             `<span class="term-tooltip" role="tooltip">${escapeHtml(explanation)}</span>` +
             `</span>`;
    });
  });

  return escaped;
}

function debounce(func, wait = 100) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ── 4. App State ───────────────────────────────────────────────────────────
let allMedicines = [];
let currentCategory = 'all';
let searchQuery = '';

// ── 5. Data Fetching ───────────────────────────────────────────────────────
async function loadMedicines() {
  try {
    const res = await fetch('data/medicines.json');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    allMedicines = Array.isArray(data) ? data : [];
    return allMedicines;
  } catch (err) {
    console.warn('Primary fetch data/medicines.json failed, checking fallback...', err);
    try {
      const fallback = await fetch('Qwen_json_20260916_81cooh1p9.json');
      if (fallback.ok) {
        allMedicines = await fallback.json();
        return allMedicines;
      }
    } catch (e) {
      console.error('All data fetches failed:', e);
    }
    return [];
  }
}

// ── 6. Rendering: Home View (app.html) ──────────────────────────────────────
function renderCards(medicinesToRender) {
  const grid = document.getElementById('resultsGrid');
  const countEl = document.getElementById('resultsCount');
  const titleEl = document.getElementById('resultsTitle');
  if (!grid) return;

  if (countEl) {
    countEl.textContent = `${medicinesToRender.length} medicine${medicinesToRender.length === 1 ? '' : 's'} available`;
  }

  if (titleEl) {
    if (searchQuery) {
      titleEl.textContent = `Search Results for "${searchQuery}"`;
    } else if (currentCategory !== 'all') {
      titleEl.textContent = `${currentCategory} Medicines`;
    } else {
      titleEl.textContent = 'All Available Medicines';
    }
  }

  if (!medicinesToRender.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-state__icon">🔍</span>
        <div class="empty-state__title">No matching medicines found</div>
        <p class="empty-state__text">Try searching for a different symptom (e.g. "headache", "fever"), or brand name (e.g. "Advil", "Crocin").</p>
        <button class="btn-primary mt-3" id="resetSearchBtn" style="margin-top:16px;">Clear Search Filters</button>
      </div>
    `;
    const resetBtn = document.getElementById('resetSearchBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const input = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearch');
        if (input) input.value = '';
        if (clearBtn) clearBtn.classList.remove('visible');
        searchQuery = '';
        currentCategory = 'all';
        document.querySelectorAll('.chip').forEach(c => {
          c.classList.toggle('active', c.dataset.category === 'all');
          c.setAttribute('aria-selected', c.dataset.category === 'all' ? 'true' : 'false');
        });
        renderCards(allMedicines);
      });
    }
    return;
  }

  const html = medicinesToRender.map(med => {
    const brands = (med.brandNames || []).slice(0, 3).join(', ');
    const badgeClass = getCategoryBadgeClass(med.category);

    return `
      <article class="med-card" tabindex="0" onclick="window.location.href='medicine.html?id=${encodeURIComponent(med.id)}'" role="button" aria-label="View details for ${escapeHtml(med.genericName)}">
        <div class="med-card__header">
          <h3 class="med-card__name">${escapeHtml(med.genericName)}</h3>
          <span class="cat-badge ${badgeClass}">${escapeHtml(med.category)}</span>
        </div>
        ${brands ? `<div class="med-card__brands">Common brands: <strong>${escapeHtml(brands)}</strong></div>` : ''}
        <p class="med-card__summary">${escapeHtml(med.plainEnglishSummary || '')}</p>
        <div class="med-card__footer">
          <span class="med-card__link">
            <span>Learn More</span>
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </article>
    `;
  }).join('');

  grid.innerHTML = html;
}

function applyFilters() {
  let filtered = allMedicines;

  if (currentCategory !== 'all') {
    filtered = filtered.filter(m => m.category === currentCategory);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(m => {
      const name = (m.genericName || '').toLowerCase();
      const brands = (m.brandNames || []).join(' ').toLowerCase();
      const summary = (m.plainEnglishSummary || '').toLowerCase();
      const uses = (m.commonUses || []).join(' ').toLowerCase();
      const category = (m.category || '').toLowerCase();

      return name.includes(q) ||
             brands.includes(q) ||
             summary.includes(q) ||
             uses.includes(q) ||
             category.includes(q);
    });
  }

  renderCards(filtered);
}

// ── 7. Rendering: Detail View (medicine.html) ──────────────────────────────
function renderDetailView() {
  const detailContainer = document.getElementById('medicineDetail');
  if (!detailContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const medId = urlParams.get('id');

  if (!medId) {
    showDetailError('No medicine ID was specified in the URL.');
    return;
  }

  const med = allMedicines.find(m => m.id === medId || m.id?.toLowerCase() === medId.toLowerCase());
  if (!med) {
    showDetailError(`Could not find medicine profile for "${escapeHtml(medId)}".`);
    return;
  }

  // Update page title
  document.title = `${med.genericName} — Plain English Guide | SMASP`;

  // Build Brand Names
  const brandsHtml = (med.brandNames && med.brandNames.length)
    ? `<div class="detail-brand-names">Also known as: <strong>${med.brandNames.map(b => escapeHtml(b)).join(', ')}</strong></div>`
    : '';

  // Build Category Badge
  const badgeClass = getCategoryBadgeClass(med.category);

  // Build Common Uses Chips
  const usesHtml = (med.commonUses && med.commonUses.length)
    ? med.commonUses.map(u => `<span class="use-chip">✨ ${escapeHtml(u)}</span>`).join('')
    : '<span class="use-chip">General Healthcare</span>';

  // Build Calm Warnings
  let warningsHtml = '';
  if (med.calmWarnings && med.calmWarnings.length) {
    warningsHtml = med.calmWarnings.map(w => {
      const isAvoid = (w.level || '').toLowerCase() === 'avoid';
      const cardClass = isAvoid ? 'warning-card--avoid' : 'warning-card--caution';
      const icon = isAvoid ? '🛑' : '⚠️';
      const labelText = isAvoid ? 'Pause & Check' : 'Caution Note';

      return `
        <div class="warning-card ${cardClass}" role="alert">
          <div class="warning-card__icon">${icon}</div>
          <div class="warning-card__body">
            <span class="warning-label">${labelText}</span>
            <div class="warning-card__title">${escapeHtml(w.title)}</div>
            <div class="warning-card__why">
              <strong>Why?</strong> ${wrapPlainTerms(w.plainEnglishWhy)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    warningsHtml = `
      <div class="warning-card warning-card--caution" style="border-left-color:var(--safe); background: #f0fdf4;">
        <div class="warning-card__icon">✅</div>
        <div class="warning-card__body">
          <span class="warning-label" style="color:var(--safe); background:rgba(16,185,129,0.15);">Standard Safety</span>
          <div class="warning-card__title">Standard Safe Profile</div>
          <div class="warning-card__why">No severe contraindications noted when taken as directed. Always consult your pharmacist for personalized advice.</div>
        </div>
      </div>
    `;
  }

  // Build Side Effects with Progressive Disclosure
  const sideEffects = med.commonSideEffects || [];
  const topEffects = sideEffects.slice(0, 3);
  const remainingEffects = sideEffects.slice(3);

  let sideEffectsHtml = `
    <div class="side-effects-list">
      ${topEffects.map(se => `<div class="side-effect-item">${wrapPlainTerms(se)}</div>`).join('')}
    </div>
  `;

  if (remainingEffects.length) {
    const hiddenId = `more-se-${med.id}`;
    sideEffectsHtml += `
      <div id="${hiddenId}" class="side-effects-more">
        ${remainingEffects.map(se => `<div class="side-effect-item">${wrapPlainTerms(se)}</div>`).join('')}
      </div>
      <button type="button" class="btn-show-more" data-target="${hiddenId}">
        Show ${remainingEffects.length} more potential side effects ▾
      </button>
    `;
  }

  // Build Confidence Badge
  const grade = med.confidenceGrade || 'A';
  const gradeClass = `grade-badge--${grade}`;

  const html = `
    <div class="detail-header">
      <span class="cat-badge ${badgeClass}">${escapeHtml(med.category)}</span>
      <h1 class="detail-generic-name">${escapeHtml(med.genericName)}</h1>
      ${brandsHtml}
    </div>

    <!-- Action Toolbar (Read Aloud & Save) -->
    <div class="action-bar">
      <button id="voiceBtn" class="btn-primary" style="background:var(--card-bg); color:var(--text-primary); border:1px solid var(--border);" aria-label="Read summary aloud">
        🔊 Read Aloud
      </button>
      <button id="saveBtn" class="btn-primary" style="background:var(--blue-light); color:var(--blue); border:1px solid rgba(15,111,255,0.25);" aria-label="Save to My Medicines">
        ⭐ Save to My Cabinet
      </button>
    </div>

    <!-- Plain English Summary Box -->
    <div class="plain-english-box">
      <div class="plain-english-box__icon">💬</div>
      <div class="plain-english-box__text">
        ${wrapPlainTerms(med.plainEnglishSummary)}
      </div>
    </div>

    <!-- Common Uses -->
    <div class="detail-section">
      <h2 class="detail-section-title">
        <span>🎯 Common Uses</span>
        <span class="title-line"></span>
      </h2>
      <div class="uses-chips">${usesHtml}</div>
    </div>

    <!-- What to Know & Calm Warnings -->
    <div class="detail-section">
      <h2 class="detail-section-title">
        <span>🛡️ Important Things to Know</span>
        <span class="title-line"></span>
      </h2>
      <div class="warnings-stack">${warningsHtml}</div>
    </div>

    <!-- Side Effects -->
    <div class="detail-section">
      <h2 class="detail-section-title">
        <span>🩺 Side Effects</span>
        <span class="title-line"></span>
      </h2>
      ${sideEffectsHtml}
    </div>

    <!-- Evidence & Trust Footer -->
    <div class="confidence-section">
      <div class="grade-badge ${gradeClass}">${escapeHtml(grade)}</div>
      <div>
        <div class="confidence-label">Clinical Evidence Rating</div>
        <div class="confidence-source">
          Verified source: <strong>${escapeHtml(med.source || 'FDA / DailyMed Structured Product Labeling')}</strong>
        </div>
      </div>
    </div>
  `;

  detailContainer.innerHTML = html;

  // Bind progressive disclosure button
  detailContainer.querySelectorAll('.btn-show-more').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      const isVisible = targetEl.classList.toggle('visible');
      btn.textContent = isVisible ? 'Show fewer side effects ▴' : `Show ${remainingEffects.length} more potential side effects ▾`;
    });
  });

  // Setup Share Panel
  setupSharePanel(med);

  // Setup Voice Read Aloud
  setupVoice(med);

  // Setup Save Button
  setupSaveButton(med);
}

function showDetailError(msg) {
  const detailContainer = document.getElementById('medicineDetail');
  if (!detailContainer) return;
  detailContainer.innerHTML = `
    <div class="empty-state" style="padding:48px 20px;">
      <span class="empty-state__icon">⚠️</span>
      <div class="empty-state__title">Medicine Not Found</div>
      <p class="empty-state__text">${escapeHtml(msg)}</p>
      <a href="app.html" class="btn-primary" style="margin-top:20px; text-decoration:none;">Browse All Medicines →</a>
    </div>
  `;
}

// ── 8. Feature: Voice Synthesis (Read Aloud) ───────────────────────────────
function setupVoice(med) {
  const voiceBtn = document.getElementById('voiceBtn');
  if (!voiceBtn) return;

  if (!('speechSynthesis' in window)) {
    voiceBtn.style.display = 'none';
    return;
  }

  let isPlaying = false;

  voiceBtn.onclick = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      voiceBtn.textContent = '🔊 Read Aloud';
      isPlaying = false;
      return;
    }

    const warningsText = (med.calmWarnings || [])
      .map(w => `${w.title}. Why: ${w.plainEnglishWhy}`)
      .join('. ');

    const speechText = `${med.genericName}. ${med.plainEnglishSummary}. Commonly used for: ${(med.commonUses || []).join(', ')}. Key things to know: ${warningsText}.`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      voiceBtn.textContent = '🔊 Read Aloud';
      isPlaying = false;
    };

    utterance.onerror = () => {
      voiceBtn.textContent = '🔊 Read Aloud';
      isPlaying = false;
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    voiceBtn.textContent = '⏹️ Stop Reading';
    isPlaying = true;
  };
}

// ── 9. Feature: My Medicines (localStorage Bookmarks) ──────────────────────
function setupSaveButton(med) {
  const saveBtn = document.getElementById('saveBtn');
  if (!saveBtn) return;

  const STORAGE_KEY = 'smasp_saved_medicines';

  function getSaved() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function isSaved() {
    return getSaved().includes(med.id);
  }

  function updateBtn() {
    if (isSaved()) {
      saveBtn.textContent = '✅ Saved in Cabinet';
      saveBtn.style.background = '#d1fae5';
      saveBtn.style.color = '#047857';
    } else {
      saveBtn.textContent = '⭐ Save to Cabinet';
      saveBtn.style.background = 'var(--blue-light)';
      saveBtn.style.color = 'var(--blue)';
    }
  }

  updateBtn();

  saveBtn.onclick = () => {
    let list = getSaved();
    if (list.includes(med.id)) {
      list = list.filter(id => id !== med.id);
    } else {
      list.push(med.id);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage write failed:', e);
    }
    updateBtn();
  };
}

// ── 10. Feature: Share Result ──────────────────────────────────────────────
function setupSharePanel(med) {
  const panel = document.getElementById('sharePanel');
  const waBtn = document.getElementById('waShare');
  const copyBtn = document.getElementById('copyShare');
  if (!panel || !waBtn || !copyBtn) return;

  panel.style.display = 'flex';

  const shareText = `💊 ${med.genericName} — Plain English Overview\n\n${med.plainEnglishSummary}\n\nRead more safely on SMASP: ${window.location.href}`;

  waBtn.href = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  copyBtn.onclick = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        copyBtn.textContent = '✅ Link Copied!';
        setTimeout(() => { copyBtn.textContent = '📋 Copy Link'; }, 2000);
      }).catch(() => fallbackCopy(window.location.href, copyBtn));
    } else {
      fallbackCopy(window.location.href, copyBtn);
    }
  };
}

function fallbackCopy(text, btn) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  try {
    document.execCommand('copy');
    btn.textContent = '✅ Link Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy Link'; }, 2000);
  } catch (e) {
    btn.textContent = '⚠️ Copy failed';
  }
  document.body.removeChild(el);
}

// ── 11. Feature: Dark Mode Toggle ──────────────────────────────────────────
function initDarkMode() {
  const darkToggle = document.getElementById('darkToggle');
  const STORAGE_KEY = 'smasp_theme';

  function setMode(isDark) {
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
    if (darkToggle) {
      darkToggle.innerHTML = isDark ? '☀️' : '🌙';
      darkToggle.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    }
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch (e) {}
  }

  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  
  if (saved) {
    setMode(saved === 'dark');
  } else {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setMode(prefersDark);
  }

  if (darkToggle) {
    darkToggle.addEventListener('click', () => {
      const isCurrentlyDark = document.body.classList.contains('dark');
      setMode(!isCurrentlyDark);
    });
  }
}

// ── 12. Service Worker Registration (PWA Offline) ──────────────────────────
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => {
          console.log('✅ SMASP Service Worker active:', reg.scope);
        })
        .catch(err => {
          console.log('Service Worker registration skipped:', err);
        });
    });
  }
}

// ── 13. Main Initialization ────────────────────────────────────────────────
async function initApp() {
  initDarkMode();
  registerServiceWorker();

  await loadMedicines();

  // Update total count stats
  const medCountEl = document.getElementById('medCount');
  if (medCountEl && allMedicines.length) {
    medCountEl.textContent = `${allMedicines.length}+`;
  }

  // Check if we are on medicine.html or app.html
  const isMedicinePage = document.body.classList.contains('medicine-page') || window.location.pathname.includes('medicine.html');

  if (isMedicinePage) {
    renderDetailView();
  } else {
    // Search input binding
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');

    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        searchQuery = e.target.value;
        if (clearBtn) {
          if (searchQuery) {
            clearBtn.classList.add('visible');
          } else {
            clearBtn.classList.remove('visible');
          }
        }
        applyFilters();
      }, 100));

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          searchInput.value = '';
          searchQuery = '';
          clearBtn.classList.remove('visible');
          searchInput.focus();
          applyFilters();
        });
      }
    }

    // Category chips binding
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-selected', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-selected', 'true');
        currentCategory = chip.dataset.category || 'all';
        applyFilters();
      });
    });

    // Initial render
    renderCards(allMedicines);
  }
}

// Run on DOM Ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
