const BioCascadeEngine = require('../../js/engine/bioCascadeEngine.js');

describe('BioCascadeEngine — "God-Level" Multi-Order Physiological Engine', () => {
  let engine;

  beforeEach(() => {
    engine = new BioCascadeEngine();
  });

  describe('1. The Triple Whammy (Glomerular Hemodynamic Collapse)', () => {
    test('should detect full triad: Combiflam (NSAID) + Telma (ARB) + Lasix (Diuretic)', () => {
      const drugs = ['Combiflam', 'Telma 40', 'Lasix'];
      const alert = engine.detectTripleWhammyCascade(drugs);
      expect(alert).not.toBeNull();
      expect(alert.id).toBe('cascade-triple-whammy-triad');
      expect(alert.severity).toBe('CRITICAL');
      expect(alert.mechanism).toContain('afferent renal arteriole');
      expect(alert.mechanism).toContain('efferent arteriole');
      expect(alert.clinicalRisk).toContain('Acute Kidney Injury (AKI)');
    });

    test('should detect high-risk dyad: Ibuprofen + Telmisartan', () => {
      const drugs = ['Ibuprofen', 'Telmisartan'];
      const alert = engine.detectTripleWhammyCascade(drugs);
      expect(alert).not.toBeNull();
      expect(alert.id).toBe('cascade-triple-whammy-dyad');
      expect(alert.severity).toBe('AVOID');
    });

    test('should return null for non-collapsing regimen (e.g. Paracetamol + Metformin)', () => {
      const drugs = ['Paracetamol', 'Metformin'];
      const alert = engine.detectTripleWhammyCascade(drugs);
      expect(alert).toBeNull();
    });
  });

  describe('2. Hepatic Cytochrome P450 (CYP) Clearance Bottlenecks', () => {
    test('should detect CYP3A4 inhibition surge: Clarithromycin + Atorvastatin', () => {
      const drugs = ['Clarithromycin', 'Atorvastatin'];
      const alerts = engine.computeCypClearanceBottlenecks(drugs);
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      const cyp3a4Alert = alerts.find(a => a.enzyme === 'CYP3A4');
      expect(cyp3a4Alert).toBeDefined();
      expect(cyp3a4Alert.severity).toBe('AVOID');
      expect(cyp3a4Alert.projectedExposureMultiplier).toContain('AUC surge');
    });

    test('should return empty list when no metabolic enzyme bottleneck exists', () => {
      const drugs = ['Paracetamol', 'Amoxicillin'];
      const alerts = engine.computeCypClearanceBottlenecks(drugs);
      expect(alerts).toEqual([]);
    });
  });

  describe('3. Anticholinergic Cognitive Burden (ACB) Accumulation', () => {
    test('should accumulate scores across multiple mild anticholinergic agents', () => {
      // Cetirizine (1) + Domperidone (1) + Ranitidine (1) = 3
      const drugs = ['Cetirizine', 'Domperidone', 'Ranitidine'];
      const res = engine.calculateAnticholinergicBurden(drugs, 45);
      expect(res.totalScore).toBe(3);
      expect(res.riskLevel).toBe('HIGH');
    });

    test('should escalate to HIGH for geriatric patient (Age >= 65) with ACB >= 2', () => {
      const drugs = ['Cetirizine', 'Alprazolam']; // Score = 1 + 1 = 2
      const resYoung = engine.calculateAnticholinergicBurden(drugs, 35);
      expect(resYoung.riskLevel).toBe('MODERATE');

      const resElderly = engine.calculateAnticholinergicBurden(drugs, 72);
      expect(resElderly.riskLevel).toBe('HIGH');
      expect(resElderly.title).toContain('Geriatric Cognitive Risk');
    });
  });

  describe('4. Composite QTc Interval Arrhythmia Vector Sum', () => {
    test('should calculate additive hERG blockade: Azithromycin + Domperidone', () => {
      // Azithromycin (2.5) + Domperidone (3.0) = 5.5 (SEVERE)
      const drugs = ['Azithromycin', 'Domperidone'];
      const res = engine.calculateCompositeQtcRisk(drugs);
      expect(res.compositeScore).toBeGreaterThanOrEqual(5.0);
      expect(res.riskCategory).toBe('SEVERE');
      expect(res.severity).toBe('AVOID');
      expect(res.mechanism).toContain('hERG channel');
    });

    test('should return minimal risk for non-QTc prolonging regimen', () => {
      const drugs = ['Paracetamol', 'Metformin'];
      const res = engine.calculateCompositeQtcRisk(drugs);
      expect(res.compositeScore).toBe(0);
      expect(res.riskCategory).toBe('MINIMAL');
    });
  });

  describe('5. Multi-Mechanism Cumulative Hemorrhagic Bleeding Risk', () => {
    test('should flag CRITICAL bleed risk for Warfarin + Aspirin + Combiflam in ulcer patient', () => {
      const drugs = ['Warfarin', 'Aspirin', 'Combiflam'];
      const profile = { conditions: ['peptic ulcer'] };
      const res = engine.calculateCumulativeHemorrhagicRisk(drugs, profile);
      expect(res.bleedScore).toBeGreaterThanOrEqual(5);
      expect(res.level).toBe('CRITICAL');
      expect(res.drivers.length).toBeGreaterThanOrEqual(4);
      expect(res.weightingBreakdown.length).toBeGreaterThanOrEqual(4);
      expect(res.weightingBreakdown.some(w => w.category.includes('Coagulation'))).toBe(true);
    });
  });

  describe('6. Ayurvedic Bio-Enhancer Surge (The Piperine Effect)', () => {
    test('should flag bio-enhancer alert for Trikatu Churna + Metformin', () => {
      const herbs = ['Trikatu Churna'];
      const allopathy = ['Metformin 500'];
      const alerts = engine.evaluateAyurvedicBioEnhancement(herbs, allopathy);
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      const alert = alerts[0];
      expect(alert.severity).toBe('AVOID');
      expect(alert.title).toContain('Bio-Enhancer Surge');
      expect(alert.mechanism).toContain('P-glycoprotein');
      expect(alert.doseDependenceCaveat).toBeDefined();
    });

    test('should recognize classical polyherbals containing Piperine (Chyawanprash & Chandraprabha Vati)', () => {
      const alertsChyawan = engine.evaluateAyurvedicBioEnhancement(['Chyawanprash'], ['Metformin']);
      expect(alertsChyawan.length).toBeGreaterThanOrEqual(1);

      const alertsChandra = engine.evaluateAyurvedicBioEnhancement(['Chandraprabha Vati'], ['Phenytoin']);
      expect(alertsChandra.length).toBeGreaterThanOrEqual(1);
    });

    test('should return empty when no bio-enhancing herbs are present', () => {
      const herbs = ['Ashwagandha'];
      const allopathy = ['Metformin'];
      const alerts = engine.evaluateAyurvedicBioEnhancement(herbs, allopathy);
      expect(alerts).toEqual([]);
    });
  });

  describe('7. Master Aggregator: evaluateFullBioCascade & Harm Reduction Directives', () => {
    test('should synthesize full multi-drug physiological cascade and provide universal harm-reduction directive', () => {
      const drugs = ['Combiflam', 'Telma 40', 'Lasix', 'Azithral 500', 'Pan-D', 'Metformin 500'];
      const herbs = ['Trikatu'];
      const profile = { age: 70, conditions: ['hypertension'] };

      const res = engine.evaluateFullBioCascade(drugs, herbs, profile);
      expect(res.hasCriticalAlerts).toBe(true);
      expect(res.tripleWhammy).not.toBeNull();
      expect(res.tripleWhammy.actionableGuidance).toContain('PAUSE or REPLACE the NSAID');
      expect(res.tripleWhammy.actionableGuidance).toContain('DO NOT stop blood pressure medications');
      expect(res.qtcRisk.severity).toBe('AVOID');
      expect(res.qtcRisk.actionableGuidance).toContain('12-lead ECG');
      expect(res.acbBurden.isGeriatric).toBe(true);
      expect(res.bioEnhancers.length).toBeGreaterThanOrEqual(1);
      expect(res.universalHarmReductionDirective).toContain('MANDATORY HARM-REDUCTION DIRECTIVE');
    });
  });
});
