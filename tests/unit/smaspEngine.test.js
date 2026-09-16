const { SmaspEngine, DEFAULT_INTERACTIONS_MATRIX } = require('../../js/engine/smaspEngine.js');
const mockMedicines = require('../../data/medicines.json');

describe('SmaspEngine — High-Performance Intelligence Engine', () => {
  let engine;

  beforeEach(() => {
    engine = new SmaspEngine(mockMedicines, DEFAULT_INTERACTIONS_MATRIX);
  });

  describe('Initialization & Indexing', () => {
    test('should index medicines into hash map for O(1) lookups', () => {
      expect(engine.drugMap.size).toBe(mockMedicines.length);
      expect(engine.drugMap.get('ibu-001')).toBeDefined();
      expect(engine.drugMap.get('para-001')).toBeDefined();
    });

    test('should allow updating dataset dynamically', () => {
      const customData = [
        { id: 'custom-01', genericName: 'CustomDrug', calmWarnings: [], commonUses: ['Pain'] }
      ];
      engine.updateMedicines(customData);
      expect(engine.drugMap.size).toBe(1);
      expect(engine.drugMap.get('custom-01').genericName).toBe('CustomDrug');
    });
  });

  describe('Algorithm 1: calculatePersonalRisk', () => {
    test('should return safe for clean profile and standard drug', () => {
      const res = engine.calculatePersonalRisk('para-001', { age: 30, conditions: [] });
      expect(res.level).toBe('safe');
      expect(res.plainEnglishWhy).toContain('Looking Good');
    });

    test('should escalate to avoid for hypertension + ibuprofen', () => {
      const res = engine.calculatePersonalRisk('ibu-001', { conditions: ['hypertension'] });
      expect(res.level).toBe('avoid');
      expect(res.plainEnglishWhy).toContain('High Blood Pressure');
    });

    test('should escalate to avoid for pediatric aspirin (under 12)', () => {
      const res = engine.calculatePersonalRisk('asp-001', { age: 9 });
      expect(res.level).toBe('avoid');
      expect(res.plainEnglishWhy).toContain('Pediatric age restriction');
    });

    test('should escalate for known drug allergy', () => {
      const res = engine.calculatePersonalRisk('amo-001', { allergies: ['amoxicillin'] });
      expect(res.level).toBe('avoid');
      expect(res.plainEnglishWhy).toContain('allergy');
    });

    test('should escalate to avoid for pregnant patient taking doxycycline', () => {
      const res = engine.calculatePersonalRisk('dox-001', { isPregnant: true });
      expect(res.level).toBe('avoid');
      expect(res.matchedFactors).toContain('Pregnancy safety precaution');
    });

    test('should escalate for elderly patient taking ciprofloxacin', () => {
      const res = engine.calculatePersonalRisk('cip-001', { age: 72 });
      expect(res.level).toBe('caution');
      expect(res.matchedFactors).toContain('Age 65+ sensitivity');
    });

    test('should return unknown for non-existent drug ID', () => {
      const res = engine.calculatePersonalRisk('fake-id-999', {});
      expect(res.level).toBe('unknown');
      expect(res.drugData).toBeNull();
    });
  });

  describe('Algorithm 2: checkInteractions (Polypharmacy Matrix)', () => {
    test('should return empty array for single drug', () => {
      const res = engine.checkInteractions(['ibu-001']);
      expect(res).toEqual([]);
    });

    test('should detect direct clash between Ibuprofen and Lisinopril', () => {
      const res = engine.checkInteractions(['ibu-001', 'lis-001']);
      expect(res.length).toBeGreaterThanOrEqual(1);
      const directClash = res.find(r => r.type === 'direct_clash');
      expect(directClash).toBeDefined();
      expect(directClash.level).toBe('avoid');
      expect(directClash.plainEnglishWhy).toContain('Lisinopril');
    });

    test('should detect direct clash between Aspirin and Warfarin', () => {
      const res = engine.checkInteractions(['asp-001', 'war-001']);
      const clash = res.find(r => r.type === 'direct_clash');
      expect(clash).toBeDefined();
      expect(clash.level).toBe('avoid');
      expect(clash.plainEnglishWhy).toContain('bleeding');
    });

    test('should detect compounding overlapping side effects (drowsiness/dizziness)', () => {
      const res = engine.checkInteractions(['ibu-001', 'lis-001', 'nap-001']);
      const overlapping = res.filter(r => r.type === 'overlapping_effect');
      expect(overlapping.length).toBeGreaterThan(0);
    });
  });

  describe('Algorithm 3: findMedicinesForSymptoms', () => {
    test('should find medicines for headache and fever', () => {
      const matches = engine.findMedicinesForSymptoms(['headache', 'fever'], {});
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.genericName.includes('Paracetamol'))).toBe(true);
    });

    test('should exclude contraindicated medicines from patient suggestions', () => {
      // For hypertension, Ibuprofen should be excluded from recommendations
      const matches = engine.findMedicinesForSymptoms(['headache'], { conditions: ['hypertension'] });
      const containsIbu = matches.some(m => m.id === 'ibu-001');
      expect(containsIbu).toBe(false);
    });

    test('should return empty array for completely unmatched symptoms', () => {
      const matches = engine.findMedicinesForSymptoms(['extraterrestrial syndrome'], {});
      expect(matches).toEqual([]);
    });
  });
});
