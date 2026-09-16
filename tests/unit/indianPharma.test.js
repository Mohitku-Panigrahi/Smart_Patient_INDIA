const {
  INDIAN_PHARMA_CATALOG,
  searchIndianPharma,
  getJanAushadhiAlternative
} = require('../../js/data/indianPharma.js');

describe('Indian Pharmaceutical Intelligence & Jan Aushadhi Mapping', () => {
  test('should contain verified Indian pharma catalog entries', () => {
    expect(INDIAN_PHARMA_CATALOG.length).toBeGreaterThanOrEqual(10);
    const dolo = INDIAN_PHARMA_CATALOG.find(d => d.brandName === 'Dolo 650');
    expect(dolo).toBeDefined();
    expect(dolo.genericName).toBe('Paracetamol');
    expect(dolo.janAushadhiEquivalent).toContain('Paracetamol');
    expect(dolo.savingsPercentage).toBeDefined();
  });

  test('should search by brand name, generic name, or therapeutic tag', () => {
    const brandHits = searchIndianPharma('Dolo');
    expect(brandHits.length).toBeGreaterThanOrEqual(1);
    expect(brandHits[0].brandName).toBe('Dolo 650');

    const genericHits = searchIndianPharma('Telmisartan');
    expect(genericHits.length).toBeGreaterThanOrEqual(1);
    expect(genericHits[0].brandName).toContain('Telma');

    const tagHits = searchIndianPharma('diabetes');
    expect(tagHits.length).toBeGreaterThanOrEqual(1);
    expect(tagHits.some(m => m.brandName.includes('Glycomet'))).toBe(true);
  });

  test('should resolve Jan Aushadhi generic alternative for branded drug', () => {
    const res = getJanAushadhiAlternative('Augmentin 625 Duo');
    expect(res).not.toBeNull();
    expect(res.genericName).toContain('Amoxicillin');
    expect(res.janAushadhiEquivalent).toBeDefined();
    expect(res.approxJanAushadhiPriceInr).toBeLessThan(res.approxBrandedPriceInr);
  });

  test('should handle empty or invalid search inputs gracefully', () => {
    expect(searchIndianPharma('')).toEqual([]);
    expect(searchIndianPharma(null)).toEqual([]);
    expect(getJanAushadhiAlternative('')).toBeNull();
    expect(getJanAushadhiAlternative(null)).toBeNull();
  });
});
