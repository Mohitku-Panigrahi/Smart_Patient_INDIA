/**
 * @file runTests.js
 * @description Zero-dependency, ultra-fast test runner for SMASP engine and risk modules.
 * Runs in pure Node.js in under 100ms.
 */

const assert = require('assert');
const riskEngine = require('../js/engine/riskEngine.js');
const { SmaspEngine, DEFAULT_INTERACTIONS_MATRIX } = require('../smasp-engine.js');
const Logger = require('../js/engine/logger.js');
const medicines = require('../data/medicines.json');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

console.log('🚀 Running SMASP Automated Test Suite...\n');

// ── 1. Risk Engine Tests ──────────────────────────────────────────────────
console.log('📦 1. Baseline Risk Engine (js/engine/riskEngine.js)');

test('evaluateRisk: Avoid condition triggers AVOID level', () => {
  const res = riskEngine.evaluateRisk(['Diabetes'], { avoid: ['Diabetes'] });
  assert.strictEqual(res.level, 'AVOID');
  assert.strictEqual(res.score, 1);
});

test('evaluateRisk: Caution condition triggers CAUTION level', () => {
  const res = riskEngine.evaluateRisk(['Kidney Disease'], { caution: ['Kidney Disease'] });
  assert.strictEqual(res.level, 'CAUTION');
  assert.strictEqual(res.score, 2);
});

test('evaluateRisk: No condition triggers SAFE level', () => {
  const res = riskEngine.evaluateRisk([], { avoid: ['Diabetes'] });
  assert.strictEqual(res.level, 'SAFE');
  assert.strictEqual(res.score, 3);
});

test('evaluateRisk: Handles null medicine without crashing', () => {
  const res = riskEngine.evaluateRisk(['Diabetes'], null);
  assert.strictEqual(res.level, 'SAFE');
});

test('applyProfileRiskAdjustments: Child restriction triggers AVOID', () => {
  const res = riskEngine.applyProfileRiskAdjustments(
    { level: 'SAFE', score: 3 },
    { who_cannot: ['children under 12'] },
    { ageGroup: 'child' }
  );
  assert.strictEqual(res.level, 'AVOID');
  assert.strictEqual(res.score, 1);
});

test('applyProfileRiskAdjustments: Pregnancy contraindication triggers AVOID', () => {
  const res = riskEngine.applyProfileRiskAdjustments(
    { level: 'SAFE', score: 3 },
    { pregnancy: 'Avoid throughout pregnancy' },
    { pregnancy: 'yes' }
  );
  assert.strictEqual(res.level, 'AVOID');
});

test('evaluateAllergyRisk: Detects exact and case-insensitive allergen matches', () => {
  const res = riskEngine.evaluateAllergyRisk({ allergens: ['Penicillin'] }, ['penicillin']);
  assert.ok(res !== null);
  assert.strictEqual(res.level, 'AVOID');
});

test('getSaferMedicine: Returns medicine with higher safety score', () => {
  const winner = riskEngine.getSaferMedicine('Drug A', { score: 3 }, 'Drug B', { score: 1 });
  assert.strictEqual(winner.name, 'Drug A');
});

test('getRedFlags: Returns clinical alerts for AVOID', () => {
  const flags = riskEngine.getRedFlags({ level: 'AVOID' });
  assert.ok(flags.length > 0);
});

// ── 2. SmaspEngine Intelligence Tests ─────────────────────────────────────
console.log('\n📦 2. SmaspEngine Intelligence (smasp-engine.js)');
const engine = new SmaspEngine(medicines, DEFAULT_INTERACTIONS_MATRIX);

test('SmaspEngine: Contextual Risk Scorer flags hypertension with Ibuprofen', () => {
  const risk = engine.calculatePersonalRisk('ibu-001', { conditions: ['hypertension'] });
  assert.strictEqual(risk.level, 'avoid');
  assert.ok(risk.plainEnglishWhy.includes('High Blood Pressure'));
});

test('SmaspEngine: Contextual Risk Scorer flags pediatric aspirin', () => {
  const risk = engine.calculatePersonalRisk('asp-001', { age: 7 });
  assert.strictEqual(risk.level, 'avoid');
  assert.ok(risk.plainEnglishWhy.includes('Pediatric'));
});

test('SmaspEngine: Polypharmacy Matrix detects Ibuprofen + Lisinopril clash', () => {
  const warnings = engine.checkInteractions(['ibu-001', 'lis-001']);
  assert.ok(warnings.length >= 1);
  assert.strictEqual(warnings[0].level, 'avoid');
});

test('SmaspEngine: Polypharmacy Matrix detects Aspirin + Warfarin bleeding clash', () => {
  const warnings = engine.checkInteractions(['asp-001', 'war-001']);
  const clash = warnings.find(w => w.type === 'direct_clash');
  assert.ok(clash !== undefined);
  assert.strictEqual(clash.level, 'avoid');
});

test('SmaspEngine: Symptom Resolver suggests safe medicines and excludes avoid drugs', () => {
  const matches = engine.findMedicinesForSymptoms(['headache'], { conditions: ['hypertension'] });
  assert.ok(matches.length > 0);
  assert.ok(!matches.some(m => m.id === 'ibu-001'), 'Ibuprofen should be excluded for hypertension patients');
});

// ── 3. Logger Utility Tests ───────────────────────────────────────────────
console.log('\n📦 3. Logger Utility (js/engine/logger.js)');

test('Logger: Formats INFO logs with ISO timestamps', () => {
  const entry = Logger.info('Test log event', { status: 200 });
  assert.strictEqual(entry.level, 'INFO');
  assert.strictEqual(entry.msg, 'Test log event');
  assert.ok(entry.timestamp);
});

test('Logger: Formats ERROR logs correctly', () => {
  const entry = Logger.error('Test error', { code: 'E_FAIL' });
  assert.strictEqual(entry.level, 'ERROR');
});

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n========================================`);
console.log(`🏁 Test Summary: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL TESTS PASSED! Production-ready resilience verified.\n');
}
