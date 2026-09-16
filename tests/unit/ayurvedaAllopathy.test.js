const {
  AYURVEDA_HERB_CATALOG,
  CLASSICAL_POLYHERBAL_CATALOG,
  AYURVEDA_ALLOPATHY_INTERACTIONS,
  decomposePolyherbal,
  evaluateHerbDrugInteraction,
  getInteractionsByHerb
} = require('../../js/data/ayurvedaAllopathy.js');

describe('Ayurveda–Allopathy Herb-Drug Interaction Matrix', () => {
  test('should load curated Ayurvedic herbs catalog', () => {
    expect(AYURVEDA_HERB_CATALOG.length).toBeGreaterThanOrEqual(8);
    const ashwa = AYURVEDA_HERB_CATALOG.find(h => h.commonName === 'Ashwagandha');
    expect(ashwa).toBeDefined();
    expect(ashwa.hindiName).toBe('अश्वगंधा');
  });

  test('should load classical polyherbal formulations catalog', () => {
    expect(CLASSICAL_POLYHERBAL_CATALOG.length).toBeGreaterThanOrEqual(5);
    const chyawanprash = CLASSICAL_POLYHERBAL_CATALOG.find(p => p.name === 'Chyawanprash');
    expect(chyawanprash).toBeDefined();
    expect(chyawanprash.botanicalConstituents.length).toBeGreaterThanOrEqual(4);
  });

  test('should decompose polyherbal formulation (Chyawanprash) into constituent single herbs', () => {
    const decomp = decomposePolyherbal('Chyawanprash');
    expect(decomp).not.toBeNull();
    expect(decomp.name).toBe('Chyawanprash');
    expect(decomp.mappedSingleHerbs).toContain('Giloy / Guduchi');
    expect(decomp.mappedSingleHerbs).toContain('Ashwagandha');
  });

  test('should recursively detect interactions for polyherbal formulations (Chyawanprash + Prednisolone)', () => {
    // Chyawanprash contains Guduchi (Giloy) which opposes immunosuppressants
    const hits = evaluateHerbDrugInteraction('Chyawanprash', 'Prednisolone');
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits.some(h => h.decomposedFrom === 'Chyawanprash')).toBe(true);
    expect(hits.some(h => h.severity === 'AVOID')).toBe(true);
  });

  test('should detect Chandraprabha Vati bleeding interaction with Aspirin/Ecosprin', () => {
    // Chandraprabha Vati contains Guggulu
    const hits = evaluateHerbDrugInteraction('Chandraprabha Vati', 'Ecosprin');
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].severity).toBe('AVOID');
  });

  test('should detect Trikatu bio-enhancer surge with Metformin', () => {
    const hits = evaluateHerbDrugInteraction('Trikatu', 'Metformin');
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].title).toContain('Piperine Bio-Enhancer Surge');
  });

  test('should detect high-severity interaction between Ashwagandha and Sedatives', () => {
    const hits = evaluateHerbDrugInteraction('Ashwagandha', 'Alprazolam');
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].severity).toBe('AVOID');
    expect(hits[0].title).toContain('Central Nervous System');
  });

  test('should detect interaction between Giloy and oral antidiabetics', () => {
    const hits = evaluateHerbDrugInteraction('Giloy', 'Metformin');
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].severity).toBe('CAUTION');
    expect(hits[0].clinicalRisk).toContain('blood glucose');
  });

  test('should detect interaction between Guggulu and blood thinners (Ecosprin)', () => {
    const hits = evaluateHerbDrugInteraction('Guggulu', 'Ecosprin');
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].severity).toBe('AVOID');
    expect(hits[0].mechanism).toContain('platelet aggregation');
  });

  test('should return all interactions for a specific herb via getInteractionsByHerb', () => {
    const ashwaInteractions = getInteractionsByHerb('Ashwagandha');
    expect(ashwaInteractions.length).toBeGreaterThanOrEqual(3);
  });

  test('should safely return empty array for unrecognized or missing inputs', () => {
    expect(evaluateHerbDrugInteraction('', '')).toEqual([]);
    expect(evaluateHerbDrugInteraction('NonExistentHerb', 'Aspirin')).toEqual([]);
    expect(getInteractionsByHerb('')).toEqual([]);
  });
});
