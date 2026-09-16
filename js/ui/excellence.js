/**
 * @file excellence.js
 * @description SMASP Excellence Layer — Calm Technology, Dark Mode,
 * Plain English Toggles, Why Drawers, Skeleton Loaders, Share Cards,
 * and Progressive Disclosure micro-interactions.
 * @namespace SMASP.ui.excellence
 */

(function (root) {
  'use strict';

  // ── Plain English Medical Dictionary ──────────────────────────────────────
  const MEDICAL_TERMS = {
    'hepatotoxicity':    'This can be hard on your liver.',
    'nephrotoxicity':    'This can stress or damage your kidneys.',
    'contraindicated':   'Doctors advise against using this in your situation.',
    'thrombocytopenia':  'This can lower your platelet count, affecting how your blood clots.',
    'hypertension':      'High blood pressure.',
    'hypotension':       'Unusually low blood pressure.',
    'analgesic':         'A pain-relieving medicine.',
    'antipyretic':       'A medicine that reduces fever.',
    'antiplatelet':      'Prevents blood platelets from clumping together and forming clots.',
    'prostaglandin':     'A chemical your body makes that triggers pain, fever, and inflammation.',
    'cox inhibitor':     'Blocks an enzyme (COX) that your body uses to produce pain signals.',
    'bioavailability':   'How much of the medicine actually reaches your bloodstream and does its job.',
    'half-life':         'The time it takes for half the medicine to leave your body.',
    'reye\'s syndrome':  'A rare but serious condition that affects the liver and brain — mainly in children.',
    'gi tract':          'Your digestive system — from mouth to stomach to intestines.',
    'metabolism':        'How your body breaks down and processes the medicine.',
    'renal':             'Relating to the kidneys.',
    'hepatic':           'Relating to the liver.',
    'cardiac':           'Relating to the heart.',
    'prophylaxis':       'Taking medicine to prevent a condition, not treat one that already exists.',
    'antibiotic':        'A medicine that kills or stops the growth of bacteria.',
    'antihistamine':     'A medicine that blocks histamine — the chemical that causes allergy symptoms.',
    'proton pump inhibitor': 'A medicine that reduces the amount of acid your stomach produces.',
    'statin':            'A medicine that lowers cholesterol levels in your blood.',
    'biguanide':         'A type of diabetes medicine that helps control blood sugar levels.'
  };

  // ── Calm Warning Templates ─────────────────────────────────────────────────
  const CALM_MESSAGES = {
    avoid: {
      title: '🛑 Pause & Check In',
      format: (reason) =>
        `Taking this medicine in your current situation isn't recommended. ${reason.replace(/AVOID[^.]*\./i, '').trim()}`,
      action: 'What should I do instead?',
      href:   '#awareness'
    },
    caution: {
      title: '⚠️ A Note Just for You',
      format: (reason) =>
        `This medicine can work differently for your profile. ${reason.replace(/CAUTION[^.]*\./i, '').trim()}`,
      action: 'Good to know — what should I watch for?',
      href:   '#awareness'
    },
    safe: {
      title: '✅ Looking Good',
      format: (reason) => reason,
      action: 'Read full safety profile',
      href:   '#'
    }
  };

  // ── Build a Calm Warning Block ────────────────────────────────────────────
  function buildCalmWarning(riskLevel, reason, why) {
    const level = (riskLevel || 'safe').toLowerCase();
    const template = CALM_MESSAGES[level] || CALM_MESSAGES.safe;
    const message = template.format(reason || '');

    const whySection = why
      ? `<button type="button" class="why-chip" data-why="${encodeURIComponent(why)}">💡 Why?</button>
         <div class="why-drawer" aria-live="polite"></div>`
      : '';

    return `
      <div class="calm-warning calm-${level}" role="alert">
        <div class="calm-warning-icon">${level === 'avoid' ? '🛑' : level === 'caution' ? '⚠️' : '✅'}</div>
        <div class="calm-warning-body">
          <div class="calm-warning-title">${template.title}</div>
          <p>${escHtml(message)}</p>
          ${whySection}
          <a href="${template.href}" class="calm-warning-action">${template.action} →</a>
        </div>
      </div>
    `;
  }

  // ── Plain English Term Wrapper ─────────────────────────────────────────────
  function wrapMedicalTerms(text) {
    if (!text) return '';
    let result = escHtml(text);
    Object.entries(MEDICAL_TERMS).forEach(([term, plain]) => {
      const regex = new RegExp(`\\b(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
      result = result.replace(regex, (match) =>
        `<span class="plain-term" tabindex="0">
          <span class="term-text">${match}</span>
          <span class="term-badge" aria-label="Plain English: ${plain}" title="${plain}">?</span>
          <span class="term-tooltip" role="tooltip">💬 ${plain}</span>
        </span>`
      );
    });
    return result;
  }

  // ── Skeleton Loader HTML ───────────────────────────────────────────────────
  function buildSkeletonCard() {
    return `
      <div class="skeleton-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
          <div style="flex:1;">
            <div class="skeleton skeleton-line w-30" style="margin-bottom:8px;height:12px;"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-line w-50" style="height:12px;"></div>
          </div>
          <div class="skeleton skeleton-badge"></div>
        </div>
        <div class="skeleton skeleton-gauge"></div>
        <div class="skeleton skeleton-line w-100"></div>
        <div class="skeleton skeleton-line w-75"></div>
        <div class="skeleton skeleton-line w-50"></div>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <div class="skeleton" style="height:36px;width:160px;border-radius:20px;"></div>
          <div class="skeleton" style="height:36px;width:120px;border-radius:20px;"></div>
        </div>
      </div>
    `;
  }

  function showSkeletonLoaders(containerId, count = 2) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = '<div class="row g-4">';
    for (let i = 0; i < count; i++) {
      html += `<div class="col-lg-${count > 1 ? 6 : '8 mx-auto'}">${buildSkeletonCard()}</div>`;
    }
    html += '</div>';
    container.innerHTML = html;
  }

  // ── Share Bar Component ────────────────────────────────────────────────────
  function buildShareBar(medicineName, riskLevel, conditionList) {
    const condStr = conditionList?.length ? conditionList.join(', ') : 'general use';
    const icon = riskLevel === 'AVOID' ? '🛑' : riskLevel === 'CAUTION' ? '⚠️' : '✅';
    const shareText = `${icon} ${medicineName} → ${riskLevel} for ${condStr} | Checked on SMASP — Smart Medicine Awareness Platform`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText + '\n\nLearn more: ' + window.location.href)}`;

    return `
      <div class="share-bar">
        <span class="share-bar-label">📤 Share Result</span>
        <a href="${waUrl}" target="_blank" rel="noopener" class="share-btn whatsapp">
          💬 WhatsApp
        </a>
        <button type="button" class="share-btn copy js-copy-result"
          data-text="${encodeURIComponent(shareText)}">
          📋 Copy Link
        </button>
      </div>
    `;
  }

  // ── Progressive Disclosure: Side Effects ─────────────────────────────────
  function buildProgressiveSideEffects(sideEffectsText) {
    if (!sideEffectsText) return '';
    const parts = sideEffectsText.split(',').map(s => s.trim()).filter(Boolean);
    const preview = parts.slice(0, 3).join(', ');
    const rest    = parts.slice(3).join(', ');

    if (!rest) {
      return `<span class="side-effects-preview">${escHtml(preview)}</span>`;
    }

    const id = 'se-' + Math.random().toString(36).slice(2, 7);
    return `
      <span class="side-effects-preview">${escHtml(preview)}</span>
      <div class="side-effects-more" id="${id}">${escHtml(rest)}</div>
      <button type="button" class="show-more-btn js-show-more" data-target="${id}">
        Show all <span class="chevron">▾</span>
      </button>
    `;
  }

  // ── Dark Mode Toggle ──────────────────────────────────────────────────────
  function initDarkMode() {
    const btn = document.getElementById('darkModeToggle');
    const KEY = 'smasp_dark_mode';

    function applyDark(enabled) {
      document.body.classList.toggle('dark-mode', enabled);
      if (btn) btn.textContent = enabled ? '☀️ Light' : '🌙 Dark';
      try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) { /* ignore */ }
    }

    // Restore saved preference; else use system preference
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    applyDark(saved !== null ? saved === '1' : prefersDark);

    if (btn) btn.addEventListener('click', () => applyDark(!document.body.classList.contains('dark-mode')));

    // Sync with system changes if no manual override
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      try { if (!localStorage.getItem(KEY)) applyDark(e.matches); } catch { applyDark(e.matches); }
    });
  }

  // ── Bind Why Drawers ──────────────────────────────────────────────────────
  function bindWhyDrawers() {
    document.querySelectorAll('.why-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const drawer = btn.nextElementSibling;
        if (!drawer || !drawer.classList.contains('why-drawer')) return;
        const why = decodeURIComponent(btn.dataset.why || '');
        if (!drawer.classList.contains('open')) {
          drawer.textContent = why;
          drawer.classList.add('open');
          btn.textContent = '💡 Got it';
        } else {
          drawer.classList.remove('open');
          btn.textContent = '💡 Why?';
        }
      });
    });
  }

  // ── Bind Show-More Toggles ────────────────────────────────────────────────
  function bindShowMoreToggles() {
    document.querySelectorAll('.js-show-more').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        if (!target) return;
        const open = target.classList.toggle('open');
        btn.classList.toggle('open', open);
        const chevron = btn.querySelector('.chevron');
        if (chevron) chevron.textContent = open ? '▴' : '▾';
        btn.childNodes[0].textContent = open ? 'Show less ' : 'Show all ';
      });
    });
  }

  // ── Bind Copy Share Button ────────────────────────────────────────────────
  function bindShareButtons() {
    document.querySelectorAll('.js-copy-result').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = decodeURIComponent(btn.dataset.text || '');
        const copyText = text + '\n' + window.location.href;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(copyText).then(() => {
            btn.textContent = '✅ Copied!';
            setTimeout(() => { btn.innerHTML = '📋 Copy Link'; }, 2000);
          }).catch(() => fallbackCopy(copyText, btn));
        } else {
          fallbackCopy(copyText, btn);
        }
      });
    });
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
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.innerHTML = '📋 Copy Link'; }, 2000);
    } catch (e) { /* ignore */ }
    document.body.removeChild(el);
  }

  // ── Bookmark Micro-feedback ───────────────────────────────────────────────
  function triggerBookmarkAnimation(btn) {
    btn.classList.add('bookmark-pop');
    btn.textContent = '⭐ Bookmarked!';
    btn.addEventListener('animationend', () => btn.classList.remove('bookmark-pop'), { once: true });
  }

  // ── Init All Excellence Features ──────────────────────────────────────────
  function initExcellence() {
    initDarkMode();
    bindWhyDrawers();
    bindShowMoreToggles();
    bindShareButtons();

    // Enhance bookmark buttons
    document.querySelectorAll('.js-bookmark-btn').forEach(btn => {
      btn.addEventListener('click', () => triggerBookmarkAnimation(btn));
    });
  }

  function escHtml(val) {
    return root.SMASP?.ui?.domUtils?.escHtml
      ? root.SMASP.ui.domUtils.escHtml(val)
      : String(val ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.ui = root.SMASP.ui || {};
  root.SMASP.ui.excellence = {
    initExcellence,
    buildCalmWarning,
    wrapMedicalTerms,
    buildSkeletonCard,
    showSkeletonLoaders,
    buildShareBar,
    buildProgressiveSideEffects,
    initDarkMode,
    bindWhyDrawers,
    MEDICAL_TERMS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.SMASP.ui.excellence;
  }
})(typeof window !== 'undefined' ? window : globalThis);
