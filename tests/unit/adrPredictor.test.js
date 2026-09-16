const {
  predictAdverseReactionRisk,
  extractFeatures,
  MODEL_METADATA
} = require('../../js/engine/adrPredictor.js');

describe('Predictive Adverse Drug Reaction (ADR) ML Engine', () => {
  test('should provide model metadata with version and baselines', () => {
    expect(MODEL_METADATA.version).toBe('2.0.0');
    expect(MODEL_METADATA.trainingBaselines).toContain('PvPI (Indian Pharmacovigilance Program)');
  });

  test('should predict LOW risk for young healthy individual on single mild medicine', () => {
    const profile = {
      age: 24,
      gender: 'female',
      conditions: [],
      medicines: ['Paracetamol'],
      ayurvedaHerbs: []
    };
    const res = predictAdverseReactionRisk(profile);
    expect(res.riskProbability).toBeLessThan(0.35);
    expect(res.riskCategory).toBe('LOW');
    expect(res.riskScorePercentage).toBeLessThan(35);
  });

  test('should predict HIGH risk for elderly diabetic/hypertensive on Combiflam + Telma + Glycomet', () => {
    const profile = {
      age: 68,
      gender: 'male',
      conditions: ['Hypertension', 'Type 2 Diabetes', 'Kidney Disease'],
      medicines: ['Combiflam', 'Telma 40', 'Glycomet 500'],
      ayurvedaHerbs: []
    };
    const res = predictAdverseReactionRisk(profile);
    expect(res.riskProbability).toBeGreaterThan(0.70);
    expect(res.riskCategory).toBe('HIGH');
    expect(res.organHazards.nephrotoxicity.probability).toBeGreaterThan(0.60);
    expect(res.shapExplanations.length).toBeGreaterThan(0);
    expect(res.clinicalRecommendations.some(r => r.includes('NSAID') || r.includes('Metformin'))).toBe(true);
  });

  test('should detect synergic CNS depression hazard for Sedative + Ashwagandha combination', () => {
    const profile = {
      age: 45,
      gender: 'male',
      conditions: ['Insomnia'],
      medicines: ['Alprazolam'],
      ayurvedaHerbs: ['Ashwagandha']
    };
    const res = predictAdverseReactionRisk(profile);
    const synergy = res.activeInteractions.find(s => s.includes('Sedative + Ayurvedic'));
    expect(synergy).toBeDefined();
    expect(res.clinicalRecommendations.some(r => r.includes('Ashwagandha') || r.includes('sedative'))).toBe(true);
  });

  test('should detect GI bleeding hazard for NSAID + Antiplatelet (Combiflam + Ecosprin)', () => {
    const profile = {
      age: 62,
      gender: 'male',
      conditions: ['Peptic Ulcer'],
      medicines: ['Combiflam', 'Ecosprin 75'],
      ayurvedaHerbs: []
    };
    const res = predictAdverseReactionRisk(profile);
    expect(res.organHazards.gi_bleeding.probability).toBeGreaterThan(0.50);
    expect(res.riskCategory).toBe('HIGH');
  });

  test('should extract feature vectors safely with boundary values and defaults', () => {
    const featsEmpty = extractFeatures(null);
    expect(featsEmpty.age_normalized).toBe(0.35); // default age 35
    expect(featsEmpty.is_female).toBe(0.0);
    expect(featsEmpty.polypharmacy_count).toBe(0.0);

    const featsCapped = extractFeatures({ age: 150, gender: 'FEMALE', medicines: new Array(20).fill('drug') });
    expect(featsCapped.age_normalized).toBe(1.10); // capped at 110/100
    expect(featsCapped.is_female).toBe(1.0);
    expect(featsCapped.polypharmacy_count).toBe(1.5); // capped at 15/10
  });
});
