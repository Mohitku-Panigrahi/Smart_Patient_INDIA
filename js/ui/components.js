/**
 * @file components.js
 * @description HTML component templates for medicine cards, comparison banners,
 * journey timelines, and educational widgets.
 * @namespace SMASP.ui.components
 */

(function (root) {
  'use strict';

  function escHtml(val) {
    return root.SMASP?.ui?.domUtils?.escHtml ? root.SMASP.ui.domUtils.escHtml(val) : String(val ?? '');
  }

  function escAttr(val) {
    return root.SMASP?.ui?.domUtils?.escAttr ? root.SMASP.ui.domUtils.escAttr(val) : String(val ?? '');
  }

  /**
   * Generates full v2.0 interactive medicine card with risk gauge, mechanism, and journey.
   * @param {string} name
   * @param {Object} med
   * @param {Object} risk
   * @param {string} [voiceLang='en-US']
   * @returns {string} HTML string
   */
  function buildMedicineCard(name, med, risk, voiceLang) {
    const gaugeWidth = { safe: '90%', caution: '55%', avoid: '20%' }[risk.cssClass] || '50%';
    const gaugeColor = { safe: 'var(--safe-border)', caution: 'var(--caution-border)', avoid: 'var(--avoid-border)' }[risk.cssClass] || 'var(--blue-500)';

    const safeName = escHtml(name);
    const safeCardId = escAttr(name.replace(/\s/g, ''));
    const steps = med.steps || [];
    const stepsHTML = steps.map((s, i) => `
      <div class="mech-step">
        <div class="mech-step-icon">${escHtml(s.icon)}</div>
        <div class="mech-step-content">
          <strong>${escHtml(s.label)}</strong>
          <span>${escHtml(s.desc)}</span>
        </div>
        ${i < steps.length - 1 ? '<div class="mech-arrow">↓</div>' : ''}
      </div>
    `).join('');

    const didYouKnow = (med.did_you_know || []).map(f => `
      <div class="dyk-fact">
        <span class="dyk-bullet">💡</span>
        <span>${escHtml(f)}</span>
      </div>
    `).join('');

    const whoCannotList = (med.who_cannot || []).map(w => `<li>${escHtml(w)}</li>`).join('');
    const dosageForms = (med.dosage_forms || []).map(d => `<span class="bookmark-chip">💊 ${escHtml(d)}</span>`).join('');
    const profileNotes = (risk.profileNotes || []).map(n => `<div class="bookmark-chip">👤 ${escHtml(n)}</div>`).join('');
    const redFlagsList = root.SMASP?.engine?.risk?.getRedFlags ? root.SMASP.engine.risk.getRedFlags(risk) : [];
    const redFlags = redFlagsList.map(r => `<li>${escHtml(r)}</li>`).join('');

    const voiceText = `${name}. Category: ${med.category}. ${med.mechanism} Risk for your condition: ${risk.level}. ${risk.reason}`;
    const vLang = voiceLang || 'en-US';

    return `
      <div class="medicine-card" id="card-${safeCardId}">

        <!-- Header -->
        <div class="medicine-card-header">
          <div>
            <div class="med-category-tag">${escHtml(med.category)}</div>
            <h3>${escHtml(med.icon)} ${safeName}</h3>
            <div class="use-tag">Used for: ${escHtml(med.use)}</div>
          </div>
          <span class="risk-badge ${escAttr(risk.cssClass)}">${escHtml(risk.icon)} ${escHtml(risk.level)}</span>
        </div>

        <!-- Risk Gauge -->
        <div class="risk-gauge-wrap">
          <div class="risk-gauge-labels">
            <span style="color:var(--avoid-border);">AVOID</span>
            <span style="color:var(--caution-border);">CAUTION</span>
            <span style="color:var(--safe-border);">SAFE</span>
          </div>
          <div class="risk-gauge-track">
            <div class="risk-gauge-fill" style="width:${gaugeWidth};background:${gaugeColor};"></div>
            <div class="risk-gauge-pointer" style="left:${gaugeWidth};"></div>
          </div>
        </div>

        <!-- Risk Reason -->
        <div class="risk-reason ${escAttr(risk.cssClass)}">
          <span class="risk-reason-icon">${escHtml(risk.icon)}</span>
          <span>${escHtml(risk.reason)}</span>
        </div>
        <div class="severity-confidence-row px-4">
          <div class="metric-card"><span class="label">Severity</span><span class="value">${escHtml(risk.severity || 'Low')}</span></div>
          <div class="metric-card"><span class="label">Confidence</span><span class="value">${escHtml(risk.confidence || med.confidence || 'Moderate')}</span></div>
        </div>
        ${redFlags ? `<div class="red-flag-alert"><strong>🚨 Red Flags:</strong><ul style="margin:8px 0 0 18px;">${redFlags}</ul></div>` : ''}

        <!-- Card Body -->
        <div class="medicine-card-body">
          ${dosageForms ? `<div class="mb-3"><strong style="font-size:0.82rem;">Dosage forms:</strong><div class="mt-1">${dosageForms}</div></div>` : ''}
          ${profileNotes ? `<div class="mb-3"><strong style="font-size:0.82rem;">Profile guidance:</strong><div class="mt-1">${profileNotes}</div></div>` : ''}

          <!-- Info chips -->
          <div class="info-row">
            <div class="info-chip">
              <span class="chip-label">Side Effects</span>
              <span class="chip-value">${escHtml(med.side_effects)}</span>
            </div>
            <div class="info-chip">
              <span class="chip-label">Learn More</span>
              <span class="chip-value">${escHtml(med.learn_more)}</span>
            </div>
          </div>

          <!-- Expandable sections -->
          <div class="accordion-sections">

            <!-- How it Works -->
            <details class="expand-section" open>
              <summary class="expand-summary">
                <span>🧠 How This Medicine Works</span>
                <span class="expand-chevron">›</span>
              </summary>
              <div class="expand-body">
                <div class="mechanism-box">
                  <div class="mechanism-label">Mechanism of Action</div>
                  <p>${escHtml(med.mechanism)}</p>
                </div>
                <div class="mechanism-box mt-3">
                  <div class="mechanism-label">How It Treats Your Problem</div>
                  <p>${escHtml(med.treats)}</p>
                </div>
                <div class="learn-more-tag">📘 Awareness Note: ${escHtml(med.learn_more)}</div>

                <!-- Process Steps -->
                <div class="mech-steps-title">📈 Journey Through Your Body</div>
                <div class="mech-steps">
                  ${stepsHTML}
                </div>
              </div>
            </details>

            <!-- Did You Know -->
            <details class="expand-section">
              <summary class="expand-summary">
                <span>🧠 Quick Science Facts</span>
                <span class="expand-chevron">›</span>
              </summary>
              <div class="expand-body">
                <div class="dyk-grid">
                  ${didYouKnow}
                </div>
              </div>
            </details>

            <!-- Who Cannot Use -->
            <details class="expand-section">
              <summary class="expand-summary">
                <span>🚫 Who Should Not Use This</span>
                <span class="expand-chevron">›</span>
              </summary>
              <div class="expand-body">
                <ul class="who-cannot-list">
                  ${whoCannotList}
                </ul>
              </div>
            </details>

          </div>

          <!-- Actions -->
          <button type="button" class="voice-btn js-voice-btn" data-med-name="${safeName}" data-voice-text="${escAttr(voiceText)}" data-voice-lang="${escAttr(vLang)}">
            🔊 Explain Like a Doctor
          </button>
          <button type="button" class="btn-secondary-custom mt-2 js-bookmark-btn" data-med-name="${safeName}">
            ⭐ Bookmark ${safeName}
          </button>

        </div>
      </div>
    `;
  }

  /**
   * Generates comparison score banner for dual-medicine evaluations.
   * @param {string} name1
   * @param {Object} risk1
   * @param {string} name2
   * @param {Object} risk2
   * @returns {string} HTML string
   */
  function buildSafetyScoreBanner(name1, risk1, name2, risk2) {
    if (!name2 || !risk2) return '';
    const safer = root.SMASP?.engine?.risk?.getSaferMedicine
      ? root.SMASP.engine.risk.getSaferMedicine(name1, risk1, name2, risk2)
      : { name: 'Both Equal', cssClass: 'safe' };

    const s1 = risk1.score || 1;
    const s2 = risk2.score || 1;
    const scoreLabel = { 3: 'SAFE', 2: 'CAUTION', 1: 'AVOID' };
    const colorClass = { safe: '#27ae60', caution: '#d4ac0d', avoid: '#e74c3c' };

    return `
      <div class="safety-score-banner">
        <div class="ssb-header">
          <span>🏅</span>
          <h5>Safety Comparison Score</h5>
          ${safer.name !== 'Both Equal'
            ? `<span class="ssb-winner">🟢 Safer for your condition: <strong>${escHtml(safer.name)}</strong></span>`
            : `<span class="ssb-winner">🟢 Both medicines have equal safety for your condition.</span>`}
        </div>
        <div class="ssb-scores">
          <div class="ssb-score-item">
            <div class="ssb-med-name">${escHtml(name1)}</div>
            <div class="ssb-bar-wrap">
              <div class="ssb-bar" style="width:${(s1/3)*100}%;background:${colorClass[risk1.cssClass] || '#27ae60'};"></div>
            </div>
            <span class="ssb-label ${escAttr(risk1.cssClass)}">${escHtml(risk1.icon)} ${escHtml(scoreLabel[s1] || 'SAFE')}</span>
          </div>
          <div class="ssb-score-item">
            <div class="ssb-med-name">${escHtml(name2)}</div>
            <div class="ssb-bar-wrap">
              <div class="ssb-bar" style="width:${(s2/3)*100}%;background:${colorClass[risk2.cssClass] || '#27ae60'};"></div>
            </div>
            <span class="ssb-label ${escAttr(risk2.cssClass)}">${escHtml(risk2.icon)} ${escHtml(scoreLabel[s2] || 'SAFE')}</span>
          </div>
        </div>
        <p class="ssb-note">Score is based on relative risk for your selected health condition(s). Educational only.</p>
      </div>
    `;
  }

  /**
   * Generates drug-drug interaction warning banner.
   * @param {string} med1Name
   * @param {string} med2Name
   * @returns {string} HTML string
   */
  function buildInteractionBanner(med1Name, med2Name) {
    if (!med2Name) return '';
    const inter = root.SMASP?.engine?.risk?.evaluateInteraction
      ? root.SMASP.engine.risk.evaluateInteraction(med1Name, med2Name)
      : null;
    if (!inter) return '';

    return `
      <div class="safety-score-banner" style="margin-top:-8px;">
        <div class="ssb-header">
          <span>🧪</span>
          <h5>Drug–Drug Interaction Check</h5>
          <span class="ssb-label ${escAttr(inter.cssClass)}">${escHtml(inter.icon)} ${escHtml(inter.level)}</span>
        </div>
        <p style="margin:0 0 8px;font-size:0.9rem;">${escHtml(inter.reason)}</p>
        <div class="severity-confidence-row">
          <div class="metric-card"><span class="label">Interaction Severity</span><span class="value">${escHtml(inter.severity)}</span></div>
          <div class="metric-card"><span class="label">Interaction Confidence</span><span class="value">${escHtml(inter.confidence)}</span></div>
        </div>
      </div>
    `;
  }

  /**
   * Builds detailed side-by-side comparison matrix table.
   */
  function buildComparisonTable(name1, med1, risk1, name2, med2, risk2, conditionsList) {
    const condStr = conditionsList?.length ? escHtml(conditionsList.join(', ')) : 'None selected';
    const rows = [
      ["Category",     escHtml(med1.category), escHtml(med2.category)],
      ["Uses",         escHtml(med1.use), escHtml(med2.use)],
      ["Risk Level",
        `<span class="comp-risk-cell ${escAttr(risk1.cssClass)}">${escHtml(risk1.icon)} ${escHtml(risk1.level)}</span>`,
        `<span class="comp-risk-cell ${escAttr(risk2.cssClass)}">${escHtml(risk2.icon)} ${escHtml(risk2.level)}</span>`
      ],
      ["Mechanism",    escHtml(med1.mechanism), escHtml(med2.mechanism)],
      ["Treats",       escHtml(med1.treats), escHtml(med2.treats)],
      ["Side Effects", escHtml(med1.side_effects), escHtml(med2.side_effects)],
      ["Avoid With",   escHtml((med1.avoid || []).join(', ') || 'None'), escHtml((med2.avoid || []).join(', ') || 'None')],
      ["Use Caution",  escHtml((med1.caution || []).join(', ') || 'None'), escHtml((med2.caution || []).join(', ') || 'None')],
      ["Risk Reason",  escHtml(risk1.reason), escHtml(risk2.reason)]
    ];

    return `
      <div class="comparison-section mb-4">
        <div class="comp-header">
          <span style="font-size:1.3rem;">⚖️</span>
          <h4>Side-by-Side Comparison · Your Condition(s): ${condStr}</h4>
        </div>
        <div class="table-responsive">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Attribute</th>
                <th>${escHtml(med1.icon)} ${escHtml(name1)}</th>
                <th>${escHtml(med2.icon)} ${escHtml(name2)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(([label, v1, v2]) => `
                <tr>
                  <td>${label}</td>
                  <td>${v1}</td>
                  <td>${v2}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Generates references and educational sources list.
   * @param {Array} meds
   * @returns {string} HTML string
   */
  function buildSourceCitations(meds) {
    const all = (meds || []).flatMap(m => (m?.sources || []).map(s => s.trim())).filter(Boolean);
    const unique = [...new Set(all)];
    if (!unique.length) return '';

    return `
      <div class="sources-card">
        <h6>📚 Educational Sources</h6>
        <ul>${unique.map(s => `<li>${escHtml(s)}</li>`).join('')}</ul>
        <p style="margin:8px 0 0;font-size:0.78rem;color:var(--text-muted);">
          References are for education and awareness, not individual diagnosis or prescription.
        </p>
      </div>
    `;
  }

  /**
   * Renders awareness cards into the target container.
   * @param {string} containerId
   */
  function renderAwareness(containerId) {
    if (typeof document === 'undefined') return;
    const container = document.getElementById(containerId);
    if (!container) return;

    const tips = root.SMASP?.data?.awarenessTips || [];
    container.innerHTML = tips.map(tip => `
      <div class="col-md-6 col-lg-3">
        <div class="awareness-card">
          <h5>
            <span class="aw-icon" style="background:${escAttr(tip.bg)};">${escHtml(tip.icon)}</span>
            ${escHtml(tip.title)}
          </h5>
          <ul>
            ${tip.tips.map(t => `<li>${escHtml(t)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `).join('');
  }

  root.SMASP = root.SMASP || {};
  root.SMASP.ui = root.SMASP.ui || {};
  root.SMASP.ui.components = {
    buildMedicineCard,
    buildSafetyScoreBanner,
    buildInteractionBanner,
    buildComparisonTable,
    buildSourceCitations,
    renderAwareness
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.SMASP.ui.components;
  }
})(typeof window !== 'undefined' ? window : globalThis);
