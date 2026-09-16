# Smart Patient: Your First Week Execution Plan

## Priority: TESTING FIRST

You've built a healthcare app with **zero tests**. This is not acceptable, and any engineer who reviews your code will immediately spot it. Your first job this week is to add test coverage for the risk engine — the most critical part of your app.

---

## Step 1: Project Setup (30 minutes)

### 1.1 Initialize Node.js Project
```bash
cd Smart_Patient-main
npm init -y
npm install --save-dev jest @testing-library/dom
npx jest --init
# Accept defaults, choose Node as environment
```

### 1.2 Create Jest Config
**jest.config.js:**
```javascript
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/data/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js']
};
```

### 1.3 Create Directory Structure
```bash
mkdir -p src/js/{engine,storage,ui,data}
mkdir -p tests/unit

# Move your core files (NO NODE-SPECIFIC CODE IN THEM YET)
cp -r js/engine/riskEngine.js src/js/engine/
cp -r js/storage/storageManager.js src/js/storage/
cp -r js/data/interactions.js src/js/data/
```

---

## Step 2: Make riskEngine.js Testable (1 hour)

Your current `riskEngine.js` uses IIFE pattern, which is fine for browsers but hard to test. We'll make it testable in Node while keeping it browser-compatible.

**src/js/engine/riskEngine.js** — Add this export at the bottom:
```javascript
// At the END of the IIFE, after the function definitions

  root.SMASP = root.SMASP || {};
  root.SMASP.engine = root.SMASP.engine || {};
  root.SMASP.engine.risk = {
    evaluateRisk,
    applyProfileRiskAdjustments,
    evaluateAllergyRisk,
    evaluateInteraction,
    getSaferMedicine,
    getRedFlags
  };

  // ADD THIS for Node.js testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      evaluateRisk,
      applyProfileRiskAdjustments,
      evaluateAllergyRisk,
      evaluateInteraction,
      getSaferMedicine,
      getRedFlags,
      getI18n  // For testing i18n logic
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

---

## Step 3: Write Your First 25 Tests (2-3 hours)

**tests/unit/riskEngine.test.js:**
```javascript
const riskEngine = require('../../src/js/engine/riskEngine.js');

const {
  evaluateRisk,
  applyProfileRiskAdjustments,
  evaluateAllergyRisk,
  evaluateInteraction,
  getSaferMedicine,
  getRedFlags
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
      // User has both avoid AND caution condition
      const userConditions = ['Diabetes', 'Hypertension'];
      
      const result = evaluateRisk(userConditions, medicine);
      
      // Should return AVOID, not CAUTION
      expect(result.level).toBe('AVOID');
    });
  });

  describe('Edge Cases', () => {
    
    test('should handle null medicine gracefully', () => {
      const result = evaluateRisk(['Diabetes'], null);
      expect(result).toHaveProperty('level');
      expect(result.level).not.toBeNull();
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

    test('should be case-sensitive for condition matching', () => {
      const medicine = {
        avoid: ['Diabetes'],
        caution: []
      };
      const result = evaluateRisk(['diabetes'], medicine); // lowercase
      
      // Current implementation is case-sensitive, so this should NOT match
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
  });

  describe('Confidence levels', () => {
    
    test('should preserve confidence from medicine data', () => {
      const medicine = { avoid: [], caution: [], confidence: 'High' };
      const result = evaluateRisk([], medicine);
      expect(result.confidence).toBe('High');
    });

    test('should default to Moderate confidence if missing', () => {
      const medicine = { avoid: [], caution: {} }; // no confidence
      const result = evaluateRisk([], medicine);
      expect(result.confidence).toBe('Moderate');
    });
  });

  describe('Language support', () => {
    
    test('should use provided language for messages', () => {
      const medicine = { avoid: [], caution: [] };
      const result = evaluateRisk([], medicine, 'en');
      expect(result.reason).toContain('No health condition');
    });

    test('should default to English if language not provided', () => {
      const medicine = { avoid: [], caution: [] };
      const result = evaluateRisk([], medicine);
      expect(result.reason).toBeDefined();
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
    const allergies = ['penicillin']; // lowercase
    
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
```

---

## Step 4: Run Your Tests

```bash
npm test -- tests/unit/riskEngine.test.js

# Output should show:
# PASS  tests/unit/riskEngine.test.js
#   evaluateRisk
#     Avoid Cases (High Risk)
#       ✓ should return AVOID when user condition is in avoid list
#     ... (more tests)
#   
#   Test Suites: 1 passed, 1 total
#   Tests:       25 passed, 25 total
```

---

## Step 5: Fix Any Failing Tests

If tests fail (they likely will), this is **good**. It means your tests caught a bug. For example:

**If this test fails:**
```javascript
test('should return CAUTION for secondary conditions', () => {
  const result = evaluateRisk(['Hypertension'], { caution: ['Hypertension'] });
  expect(result.level).toBe('CAUTION');
});
```

**Then your code has a bug.** Fix it in `riskEngine.js`:
```javascript
// Debug: log what you're actually getting
console.log('Test result:', result);

// Then fix the function logic
```

This is **exactly** why tests exist — they catch regressions before they reach users.

---

## Step 6: Add Input Validation (Next 2 hours)

Update your `evaluateRisk()` function to validate inputs:

**src/js/engine/riskEngine.js:**
```javascript
function evaluateRisk(userConditions, medicine, lang) {
  // ✅ NEW: Validate inputs
  if (!medicine || typeof medicine !== 'object') {
    return {
      level: "ERROR",
      cssClass: "error",
      icon: "❌",
      score: 0,
      reason: "Invalid medicine data. Please refresh and try again.",
      severity: "Unknown",
      confidence: "N/A"
    };
  }

  if (!Array.isArray(userConditions)) {
    userConditions = [];
  }

  // Filter out invalid conditions
  const validConditions = userConditions.filter(c => 
    typeof c === 'string' && c.trim().length > 0
  );

  const t = getI18n(lang || 'en');

  if (validConditions.length === 0) {
    return {
      level: "SAFE",
      cssClass: "safe",
      icon: "✅",
      score: 3,
      reason: t.noCondition,
      severity: "Low",
      confidence: medicine?.confidence || "Moderate"
    };
  }

  // ... rest of function
}
```

---

## Your Checklist for This Week

- [ ] Jest installed and configured
- [ ] 25+ unit tests written for riskEngine
- [ ] All tests passing
- [ ] Input validation added to evaluateRisk()
- [ ] Project structure organized (remove duplicate files)
- [ ] `npm test` command works and shows coverage

**By end of week, you'll have:**
- ✅ Confidence that your risk engine works correctly
- ✅ A test suite that catches regressions
- ✅ Portfolio evidence of professional testing practices

---

## Next Challenge (Week 2)

Once tests pass, tackle:
1. Write tests for `applyProfileRiskAdjustments()` (pregnancy/pediatric logic)
2. Write tests for DDI interaction rules
3. Add Logger utility for production debugging

**Your goal:** 50+ tests with 70%+ coverage.

Good luck. Get testing.
