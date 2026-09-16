const riskEngine = require('../../js/engine/riskEngine.js');

const {
  evaluateRisk,
  applyProfileRiskAdjustments,
  evaluateAllergyRisk,
  evaluateInteraction,
  getSaferMedicine,
  getRedFlags,
  getI18n
} = riskEngine;

describe('evaluateRisk — Baseline Risk Evaluation', () => {

  describe('Avoid Cases (High Risk)', () => {
    test('should return AVOID when user condition is in medicine avoid list', () => {
      const medicine = {
        avoid: ['Diabetes', 'Heart Disease'],
        caution: [],
        confidence: 'High'
      };
      const userConditions = ['Diabetes'];

      const result = evaluateRisk(userConditions, medicine);

      expect(result.level).toBe('AVOID');
      expect(result.score).toBe(1);
      expect(result.icon).toBe('🚫');
      expect(result.cssClass).toBe('avoid');
      expect(result.severity).toBe('High');
    });

    test('should return AVOID for multiple matching conditions (picks first match)', () => {
      const medicine = {
        avoid: ['Asthma', 'Diabetes'],
        caution: [],
        confidence: 'High'
      };
      const userConditions = ['Hypertension', 'Diabetes'];

      const result = evaluateRisk(userConditions, medicine);

      expect(result.level).toBe('AVOID');
      expect(result.reason).toContain('Diabetes');
    });
  });

  describe('Caution Cases (Medium Risk)', () => {
    test('should return CAUTION when user condition is in medicine caution list', () => {
      const medicine = {
        avoid: [],
        caution: ['Elderly', 'Kidney Disease'],
        confidence: 'Moderate'
      };
      const userConditions = ['Kidney Disease'];

      const result = evaluateRisk(userConditions, medicine);

      expect(result.level).toBe('CAUTION');
      expect(result.score).toBe(2);
      expect(result.icon).toBe('⚠️');
      expect(result.cssClass).toBe('caution');
    });

    test('should return CAUTION when multiple conditions match, none in avoid', () => {
      const medicine = {
        avoid: [],
        caution: ['Hypertension', 'Diabetes']
      };
      const userConditions = ['Hypertension', 'Diabetes'];

      const result = evaluateRisk(userConditions, medicine);

      expect(result.level).toBe('CAUTION');
      expect(result.reason).toContain('Hypertension, Diabetes');
    });
  });

  describe('Safe Cases (No Risk)', () => {
    test('should return SAFE when no conditions selected', () => {
      const medicine = {
        avoid: ['Diabetes'],
        caution: ['Asthma'],
        confidence: 'High'
      };
      const userConditions = [];

      const result = evaluateRisk(userConditions, medicine);

      expect(result.level).toBe('SAFE');
      expect(result.score).toBe(3);
      expect(result.icon).toBe('✅');
      expect(result.reason).toContain('No health condition');
    });

    test('should return SAFE when no matching conditions found', () => {
      const medicine = {
        avoid: ['Diabetes'],
        caution: ['Asthma'],
        confidence: 'High'
      };
      const userConditions = ['Hypertension', 'Depression'];

      const result = evaluateRisk(userConditions, medicine);

      expect(result.level).toBe('SAFE');
      expect(result.score).toBe(3);
    });

    test('should prioritize AVOID over CAUTION', () => {
      const medicine = {
        avoid: ['Diabetes'],
        caution: ['Hypertension'],
        confidence: 'High'
      };
      const userConditions = ['Diabetes', 'Hypertension'];

      const result = evaluateRisk(userConditions, medicine);

      expect(result.level).toBe('AVOID');
    });
  });

  describe('Edge Cases & Defensive Validation', () => {
    test('should handle null medicine gracefully without crashing', () => {
      const result = evaluateRisk(['Diabetes'], null);
      expect(result).toHaveProperty('level');
      expect(result.level).toBe('SAFE');
    });

    test('should handle undefined medicine.avoid', () => {
      const medicine = { caution: [] };
      const result = evaluateRisk(['Diabetes'], medicine);
      expect(result.level).toBe('SAFE');
    });

    test('should handle empty medicine.avoid array', () => {
      const medicine = { avoid: [], caution: [] };
      const result = evaluateRisk(['Diabetes'], medicine);
      expect(result.level).toBe('SAFE');
    });

    test('should handle null userConditions', () => {
      const medicine = { avoid: ['Diabetes'] };
      const result = evaluateRisk(null, medicine);
      expect(result.level).toBe('SAFE');
    });

    test('should handle undefined userConditions', () => {
      const medicine = { avoid: ['Diabetes'] };
      const result = evaluateRisk(undefined, medicine);
      expect(result.level).toBe('SAFE');
    });

    test('should filter out blank condition strings', () => {
      const medicine = { avoid: ['Diabetes'] };
      const result = evaluateRisk(['', '   ', null], medicine);
      expect(result.level).toBe('SAFE');
    });
  });

  describe('Confidence levels & Language', () => {
    test('should preserve confidence from medicine data', () => {
      const medicine = { avoid: [], caution: [], confidence: 'High' };
      const result = evaluateRisk([], medicine);
      expect(result.confidence).toBe('High');
    });

    test('should default to Moderate confidence if missing', () => {
      const medicine = { avoid: [], caution: [] };
      const result = evaluateRisk([], medicine);
      expect(result.confidence).toBe('Moderate');
    });

    test('should use provided language for messages', () => {
      const medicine = { avoid: [], caution: [] };
      const result = evaluateRisk([], medicine, 'en');
      expect(result.reason).toContain('No health condition');
    });
  });
});

// ─── applyProfileRiskAdjustments ───

describe('applyProfileRiskAdjustments — Demographic Modifiers', () => {
  test('should add child profile note for safe medicine', () => {
    const risk = { level: 'SAFE', score: 3 };
    const medicine = { age_caution: { child: 'Use syrup formulation' } };
    const profile = { ageGroup: 'child' };

    const adjusted = applyProfileRiskAdjustments(risk, medicine, profile);

    expect(adjusted.profileNotes).toContain('Use syrup formulation');
  });

  test('should escalate to AVOID for pediatric restriction', () => {
    const risk = { level: 'SAFE', score: 3, severity: 'Low' };
    const medicine = {
      who_cannot: ['children under 12', 'pediatric use not approved']
    };
    const profile = { ageGroup: 'child' };

    const adjusted = applyProfileRiskAdjustments(risk, medicine, profile);

    expect(adjusted.level).toBe('AVOID');
    expect(adjusted.score).toBe(1);
  });

  test('should add pregnancy note when applicable', () => {
    const risk = { level: 'SAFE', score: 3 };
    const medicine = { pregnancy: 'Avoid first trimester' };
    const profile = { pregnancy: 'yes' };

    const adjusted = applyProfileRiskAdjustments(risk, medicine, profile);

    expect(adjusted.profileNotes.length).toBeGreaterThan(0);
    expect(adjusted.profileNotes[0]).toContain('Pregnancy');
  });

  test('should escalate to AVOID for pregnancy contraindication', () => {
    const risk = { level: 'SAFE', score: 3 };
    const medicine = { pregnancy: 'Avoid all trimesters' };
    const profile = { pregnancy: 'yes' };

    const adjusted = applyProfileRiskAdjustments(risk, medicine, profile);

    expect(adjusted.level).toBe('AVOID');
  });

  test('should handle missing profile gracefully', () => {
    const risk = { level: 'SAFE', score: 3 };
    const medicine = { pregnancy: 'Generally safe' };

    const adjusted = applyProfileRiskAdjustments(risk, medicine, null);

    expect(adjusted.profileNotes).toEqual([]);
  });
});

// ─── evaluateAllergyRisk ───

describe('evaluateAllergyRisk — Allergy Matching', () => {
  test('should detect exact allergy match', () => {
    const medicine = { allergens: ['Penicillin', 'Lactose'] };
    const allergies = ['Penicillin'];

    const result = evaluateAllergyRisk(medicine, allergies);

    expect(result).not.toBeNull();
    expect(result.level).toBe('AVOID');
    expect(result.reason).toContain('Penicillin');
  });

  test('should be case-insensitive for allergen matching', () => {
    const medicine = { allergens: ['Penicillin'] };
    const allergies = ['penicillin'];

    const result = evaluateAllergyRisk(medicine, allergies);

    expect(result).not.toBeNull();
    expect(result.level).toBe('AVOID');
  });

  test('should return null when no allergy match', () => {
    const medicine = { allergens: ['Penicillin'] };
    const allergies = ['Aspirin'];

    const result = evaluateAllergyRisk(medicine, allergies);

    expect(result).toBeNull();
  });

  test('should handle null allergies array', () => {
    const medicine = { allergens: ['Penicillin'] };
    const result = evaluateAllergyRisk(medicine, null);
    expect(result).toBeNull();
  });

  test('should handle empty allergies array', () => {
    const medicine = { allergens: ['Penicillin'] };
    const result = evaluateAllergyRisk(medicine, []);
    expect(result).toBeNull();
  });
});

// ─── getSaferMedicine ───

describe('getSaferMedicine — Comparative Safety', () => {
  test('should identify first medicine as safer (higher score)', () => {
    const risk1 = { score: 3 };
    const risk2 = { score: 2 };

    const result = getSaferMedicine('Medicine A', risk1, 'Medicine B', risk2);

    expect(result.name).toBe('Medicine A');
  });

  test('should identify second medicine as safer', () => {
    const risk1 = { score: 1 };
    const risk2 = { score: 3 };

    const result = getSaferMedicine('Medicine A', risk1, 'Medicine B', risk2);

    expect(result.name).toBe('Medicine B');
  });

  test('should return Both Equal when scores match', () => {
    const risk1 = { score: 2 };
    const risk2 = { score: 2 };

    const result = getSaferMedicine('Medicine A', risk1, 'Medicine B', risk2);

    expect(result.name).toBe('Both Equal');
  });

  test('should return null if second medicine missing', () => {
    const risk1 = { score: 3 };
    const result = getSaferMedicine('Medicine A', risk1, null, null);
    expect(result).toBeNull();
  });
});

// ─── getRedFlags ───

describe('getRedFlags — Clinical Warnings', () => {
  test('should return urgent warnings for AVOID level', () => {
    const risk = { level: 'AVOID' };
    const flags = getRedFlags(risk);
    expect(flags.length).toBeGreaterThan(0);
    expect(flags[0]).toContain('Seek immediate professional advice');
  });

  test('should return caution warnings for CAUTION level', () => {
    const risk = { level: 'CAUTION' };
    const flags = getRedFlags(risk);
    expect(flags.length).toBeGreaterThan(0);
    expect(flags[0]).toContain('Consult clinician');
  });

  test('should return no warnings for SAFE level', () => {
    const risk = { level: 'SAFE' };
    const flags = getRedFlags(risk);
    expect(flags.length).toBe(0);
  });

  test('should handle null risk gracefully', () => {
    const flags = getRedFlags(null);
    expect(flags).toEqual([]);
  });
});

describe('evaluateInteraction & Additional Modifiers', () => {
  test('should return SAFE when no interaction rule matches', () => {
    const res = evaluateInteraction('Aspirin', 'Vitamin C', []);
    expect(res.level).toBe('SAFE');
    expect(res.severity).toBe('Low');
  });

  test('should return matching interaction rule with custom rules', () => {
    const customRules = [
      { meds: ['DrugA', 'DrugB'], level: 'AVOID', summary: 'Severe interaction' }
    ];
    const res = evaluateInteraction('DrugA', 'DrugB', customRules);
    expect(res.level).toBe('AVOID');
    expect(res.cssClass).toBe('avoid');
    expect(res.icon).toBe('🚫');
    expect(res.summary).toBe('Severe interaction');
  });

  test('should return null when either medicine name is missing', () => {
    expect(evaluateInteraction('DrugA', null)).toBeNull();
    expect(evaluateInteraction(null, 'DrugB')).toBeNull();
  });

  test('should apply breastfeeding caution and custom notes', () => {
    const baseRisk = { score: 3, level: 'SAFE', profileNotes: [] };
    const med = {
      breastfeeding: 'Use with caution; potential infant sedation',
      age_caution: { elderly: 'Start at lower dose', child: 'Weight-based titration' }
    };
    const resElderly = applyProfileRiskAdjustments(baseRisk, med, { ageGroup: 'elderly', breastfeeding: 'yes' });
    expect(resElderly.level).toBe('CAUTION');
    expect(resElderly.score).toBe(2);
    expect(resElderly.profileNotes).toContain('Start at lower dose');

    const resChild = applyProfileRiskAdjustments(baseRisk, med, { ageGroup: 'child' });
    expect(resChild.profileNotes).toContain('Weight-based titration');
  });
});

