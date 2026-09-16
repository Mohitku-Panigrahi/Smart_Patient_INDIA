/**
 * @file fetchDrugData.js
 * @description OpenFDA Drug Data Fetcher for SMASP
 * Connects to the OpenFDA API, pulls clinical drug profiles for target medicines,
 * extracts uses/warnings/side effects, and outputs SMASP-ready JSON.
 *
 * Usage:
 *   node fetchDrugData.js
 *   node fetchDrugData.js --output smasp_drugs.json
 *
 * OpenFDA API Docs: https://open.fda.gov/apis/drug/label/
 * No API key required for up to 240 requests/minute.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Target Drugs ─────────────────────────────────────────────────────────────
// Map SMASP display names to OpenFDA search terms.
// FDA uses US generic names (acetaminophen for paracetamol, etc.)
const TARGET_DRUGS = [
  { smaspName: 'Paracetamol',  fdaQuery: 'acetaminophen',  icon: '💊', category: 'Analgesic / Antipyretic' },
  { smaspName: 'Ibuprofen',    fdaQuery: 'ibuprofen',       icon: '🔵', category: 'NSAID / Anti-inflammatory' },
  { smaspName: 'Amoxicillin',  fdaQuery: 'amoxicillin',     icon: '💉', category: 'Antibiotic / Penicillin' },
  { smaspName: 'Cetirizine',   fdaQuery: 'cetirizine',      icon: '🍃', category: 'Antihistamine' },
  { smaspName: 'Omeprazole',   fdaQuery: 'omeprazole',      icon: '🟤', category: 'Proton Pump Inhibitor (PPI)' },
  { smaspName: 'Metformin',    fdaQuery: 'metformin',       icon: '💙', category: 'Antidiabetic / Biguanide' },
  { smaspName: 'Atorvastatin', fdaQuery: 'atorvastatin',    icon: '❤️', category: 'Statin / Lipid-Lowering' },
  { smaspName: 'Amoxicillin',  fdaQuery: 'amoxicillin',     icon: '💉', category: 'Antibiotic / Penicillin' },
  { smaspName: 'Azithromycin', fdaQuery: 'azithromycin',    icon: '🔶', category: 'Antibiotic / Macrolide' },
  { smaspName: 'Metronidazole',fdaQuery: 'metronidazole',   icon: '🟢', category: 'Antibiotic / Antiprotozoal' },
];

const FDA_BASE = 'https://api.fda.gov/drug/label.json';
const DELAY_MS = 400; // Respectful rate limiting (max 240 req/min)

// ── Helper: HTTPS GET ─────────────────────────────────────────────────────────
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'SMASP-DataFetcher/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error for URL: ${url}`));
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Extract clean text from FDA label sections ────────────────────────────────
function extractFirst(arr) {
  if (!arr || !arr.length) return null;
  return arr[0]
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/<[^>]*>/g, '') // strip any HTML
    .trim()
    .substring(0, 600); // Truncate to reasonable length
}

function extractList(arr, maxItems = 5) {
  if (!arr || !arr.length) return [];
  const text = arr[0].replace(/<[^>]*>/g, '').replace(/\n+/g, '\n');
  const bullets = text
    .split(/[\n\u2022\u25CF]/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 200)
    .slice(0, maxItems);
  return bullets;
}

// ── Map FDA label → SMASP medicine schema ────────────────────────────────────
function mapFdaToSmasp(drug, label) {
  const l = label;

  // Extract key sections
  const indication     = extractFirst(l.indications_and_usage);
  const mechanism      = extractFirst(l.mechanism_of_action || l.clinical_pharmacology);
  const warnings       = extractFirst(l.boxed_warning || l.warnings_and_cautions || l.warnings);
  const sideEffectsRaw = extractFirst(l.adverse_reactions);
  const patientInfo    = extractFirst(l.information_for_patients || l.patient_package_insert);
  const doNotUse       = extractFirst(l.contraindications);
  const description    = extractFirst(l.description || l.clinical_pharmacology);
  const doseForm       = l.dosage_forms_and_strengths
    ? extractFirst(l.dosage_forms_and_strengths)
    : null;

  // Parse dosage forms
  const dosageForms = doseForm
    ? doseForm.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 40).slice(0, 5)
    : ['Tablet', 'Capsule'];

  // Extract who cannot use from contraindications
  const whoCannotRaw = extractList(l.contraindications, 4);

  // Build SMASP schema
  return {
    use: indication ? indication.substring(0, 120) : `${drug.smaspName} — see full label`,
    category: drug.category,
    icon: drug.icon,
    mechanism: mechanism
      ? mechanism.substring(0, 300)
      : `Mechanism of action for ${drug.smaspName} (fetch from FDA label manually).`,
    treats: indication ? indication.substring(0, 200) : '',
    description: description ? description.substring(0, 300) : '',
    avoid: [],       // Requires DrugBank for contraindicated conditions — enriched separately
    caution: [],     // Requires DrugBank / clinical logic
    side_effects: sideEffectsRaw
      ? sideEffectsRaw.substring(0, 180)
      : 'See full FDA label for adverse reactions.',
    learn_more: patientInfo
      ? patientInfo.substring(0, 200)
      : warnings ? warnings.substring(0, 200) : 'Consult a healthcare professional before use.',
    did_you_know: [
      `${drug.smaspName} is classified as a ${drug.category}.`,
      patientInfo ? patientInfo.substring(0, 150) : `Always take ${drug.smaspName} as directed by your doctor or pharmacist.`,
    ].filter(Boolean),
    who_cannot: whoCannotRaw.length ? whoCannotRaw : [`Patients with known hypersensitivity to ${drug.smaspName}`],
    dosage_forms: dosageForms,
    allergens: [drug.smaspName],
    age_caution: {
      child: 'Consult a pediatric specialist for appropriate dosing.',
      elderly: 'May require dose adjustment; monitor closely for side effects.',
    },
    pregnancy: 'Consult a qualified healthcare professional before use during pregnancy.',
    breastfeeding: 'Consult a qualified healthcare professional before use while breastfeeding.',
    sources: [
      `FDA Drug Label — ${drug.smaspName}`,
      'OpenFDA.gov — Structured Product Labeling',
      'DailyMed — National Library of Medicine',
    ],
    confidence: 'High',
    steps: [
      { icon: drug.icon, label: 'Taken', desc: 'Administered as directed' },
      { icon: '🩸',       label: 'Absorbed', desc: 'Enters the bloodstream' },
      { icon: '🧬',       label: 'Acts',    desc: `${drug.category} effect initiated` },
      { icon: '✨',       label: 'Effect',  desc: 'Therapeutic outcome achieved' },
    ],
    // Raw FDA data preserved for LLM rewriting
    _fda_raw: {
      indications_and_usage: indication,
      warnings: warnings,
      adverse_reactions: sideEffectsRaw,
      contraindications: doNotUse,
    },
  };
}

// ── Main Fetcher ──────────────────────────────────────────────────────────────
async function fetchAllDrugs() {
  console.log('🔬 SMASP OpenFDA Data Fetcher\n');
  console.log('Fetching drug profiles from api.fda.gov...\n');

  const results = {};
  const errors = [];
  const seen = new Set();

  for (const drug of TARGET_DRUGS) {
    if (seen.has(drug.smaspName)) continue;
    seen.add(drug.smaspName);

    const url = `${FDA_BASE}?search=active_ingredient:${encodeURIComponent(drug.fdaQuery)}&limit=1`;
    process.stdout.write(`  Fetching ${drug.icon} ${drug.smaspName}...`);

    try {
      const response = await fetchJson(url);

      if (!response.results || !response.results.length) {
        // Try alternative search by generic name in all fields
        const url2 = `${FDA_BASE}?search=openfda.generic_name:${encodeURIComponent(drug.fdaQuery)}&limit=1`;
        const res2 = await fetchJson(url2);

        if (!res2.results || !res2.results.length) {
          errors.push(drug.smaspName);
          console.log(' ⚠️  No results found. Skipping.');
          continue;
        }

        results[drug.smaspName] = mapFdaToSmasp(drug, res2.results[0]);
      } else {
        results[drug.smaspName] = mapFdaToSmasp(drug, response.results[0]);
      }

      console.log(' ✅');
      await sleep(DELAY_MS);
    } catch (err) {
      errors.push(drug.smaspName);
      console.log(` ❌ Error: ${err.message}`);
    }
  }

  return { results, errors };
}

// ── Entry Point ───────────────────────────────────────────────────────────────
(async () => {
  const { results, errors } = await fetchAllDrugs();

  const outputArg = process.argv.find(a => a.startsWith('--output='));
  const outputFile = outputArg
    ? outputArg.split('=')[1]
    : path.join(__dirname, '..', 'js', 'data', 'medicines_fda.json');

  // Write JSON output
  const json = JSON.stringify(results, null, 2);
  fs.writeFileSync(outputFile, json, 'utf8');

  console.log('\n──────────────────────────────────────');
  console.log(`✅ ${Object.keys(results).length} drug profiles written to:`);
  console.log(`   ${outputFile}`);

  if (errors.length) {
    console.log(`\n⚠️  ${errors.length} drugs failed to fetch: ${errors.join(', ')}`);
    console.log('   Try running again — FDA API may have temporary limits.');
  }

  console.log('\n📋 Next steps:');
  console.log('   1. Review the output JSON for accuracy');
  console.log('   2. Fill in the "avoid" and "caution" arrays using DrugBank data');
  console.log('   3. Merge into js/data/medicines.js using mergeSmaspData.js');
  console.log('   4. Run: node scripts/mergeSmaspData.js to combine datasets\n');
})();
