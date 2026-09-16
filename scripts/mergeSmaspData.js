/**
 * @file mergeSmaspData.js
 * @description Merges OpenFDA-fetched drug profiles (medicines_fda.json)
 * with the existing SMASP medicines.js dataset.
 * Existing SMASP entries take priority (they have curated avoid/caution/steps).
 * New FDA-fetched drugs are appended.
 *
 * Usage:
 *   node scripts/mergeSmaspData.js
 */

const fs = require('fs');
const path = require('path');

const FDA_JSON = path.join(__dirname, '..', 'js', 'data', 'medicines_fda.json');
const MEDICINES_JS = path.join(__dirname, '..', 'js', 'data', 'medicines.js');
const OUT_JS = path.join(__dirname, '..', 'js', 'data', 'medicines.js');

function extractDefaultMedicines(jsContent) {
  // Simple regex extraction of the object from the IIFE
  const match = jsContent.match(/const defaultMedicines\s*=\s*(\{[\s\S]*?\});\s*\n\s*(root|let|const|var)/);
  if (!match) throw new Error('Could not find defaultMedicines in medicines.js');
  try {
    return JSON.parse(match[1]);
  } catch {
    throw new Error('Could not JSON.parse defaultMedicines — check for trailing commas or syntax issues');
  }
}

function buildMedicinesJs(merged) {
  const json = JSON.stringify(merged, null, 2);
  return `/**
 * @file medicines.js
 * @description Default catalog of medicines with pharmacological data.
 * Auto-merged from: existing SMASP dataset + OpenFDA API (fetchDrugData.js)
 * @namespace SMASP.data.medicines
 */

(function (root) {
  'use strict';

  const defaultMedicines = ${json};

  root.SMASP = root.SMASP || {};
  root.SMASP.data = root.SMASP.data || {};
  root.SMASP.data.defaultMedicines = defaultMedicines;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = defaultMedicines;
  }
})(typeof window !== 'undefined' ? window : globalThis);
`;
}

(function main() {
  console.log('🔀 SMASP Dataset Merger\n');

  if (!fs.existsSync(FDA_JSON)) {
    console.error(`❌ FDA JSON not found at ${FDA_JSON}`);
    console.error('   Run: node scripts/fetchDrugData.js first');
    process.exit(1);
  }

  const fdaData = JSON.parse(fs.readFileSync(FDA_JSON, 'utf8'));
  const existingJs = fs.readFileSync(MEDICINES_JS, 'utf8');
  let existing = {};

  try {
    existing = extractDefaultMedicines(existingJs);
    console.log(`✅ Loaded ${Object.keys(existing).length} existing SMASP drugs`);
  } catch (e) {
    console.warn(`⚠️  Could not parse existing medicines.js (${e.message}). Starting fresh.`);
  }

  const fdaCount = Object.keys(fdaData).length;
  console.log(`✅ Loaded ${fdaCount} FDA-fetched drugs`);

  // Merge: existing data wins for shared drugs (it has curated avoid/caution)
  const merged = { ...fdaData, ...existing };
  console.log(`\n📦 Merged dataset: ${Object.keys(merged).length} total drugs`);

  // Show what's new
  const newDrugs = Object.keys(fdaData).filter(k => !existing[k]);
  if (newDrugs.length) {
    console.log(`\n🆕 New drugs added from FDA: ${newDrugs.join(', ')}`);
  }

  const output = buildMedicinesJs(merged);
  fs.writeFileSync(OUT_JS, output, 'utf8');
  console.log(`\n✅ Written to: ${OUT_JS}`);
  console.log('\n💡 Reminder: Review new drugs and fill in "avoid" and "caution" arrays!');
})();
