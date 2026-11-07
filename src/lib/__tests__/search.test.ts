import { matchesCustomer, normalizeArabic } from '../search';

describe('normalizeArabic', () => {
  it('unifies alef, ya and taa marbuta and strips tashkeel', () => {
    expect(normalizeArabic('أحمد')).toBe('احمد');
    expect(normalizeArabic('فاطمة')).toBe('فاطمه');
    expect(normalizeArabic('مُصطفى')).toBe('مصطفي');
  });
});

describe('matchesCustomer', () => {
  const c = { name: 'أبو علي الحاج', phone: '03 123 456' };
  it('matches by name ignoring hamza', () => {
    expect(matchesCustomer('ابو علي', c)).toBe(true);
    expect(matchesCustomer('الحاج', c)).toBe(true);
    expect(matchesCustomer('سمير', c)).toBe(false);
  });
  it('matches by phone in any format', () => {
    expect(matchesCustomer('03123', c)).toBe(true);
    expect(matchesCustomer('٠٣١٢٣٤٥٦', c)).toBe(true);
    expect(matchesCustomer('3123456', { name: 'x', phone: '+961 3 123456' })).toBe(true);
  });
  it('empty query matches everything', () => {
    expect(matchesCustomer('  ', c)).toBe(true);
  });
});
