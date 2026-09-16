const {
  AYURVEDA_HERB_CATALOG,
  AYURVEDA_ALLOPATHY_INTERACTIONS,
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
