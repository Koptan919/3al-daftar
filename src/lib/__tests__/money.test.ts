import {
  aggregateBalances,
  computeBalance,
  convertBalance,
  describeBalance,
  formatMoney,
  formatNumber,
  fromMinor,
  normalizeDigits,
  parseAmount,
  toMinor,
  totalReceivable,
  type TxLike,
} from '../money';

describe('toMinor / fromMinor', () => {
  it('converts dollars to cents without float drift', () => {
    expect(toMinor(12.5, 'USD')).toBe(1250);
    expect(toMinor(0.1 + 0.2, 'USD')).toBe(30);
    expect(toMinor(19.99, 'USD')).toBe(1999);
  });
  it('keeps lira as whole units', () => {
    expect(toMinor(150000, 'LBP')).toBe(150000);
    expect(fromMinor(150000, 'LBP')).toBe(150000);
    expect(fromMinor(1999, 'USD')).toBe(19.99);
  });
});

describe('parseAmount', () => {
  it('accepts arabic-indic digits and thousand separators', () => {
    expect(normalizeDigits('١٢٣')).toBe('123');
    expect(parseAmount('١٥٠٬٠٠٠', 'LBP')).toBe(150000);
    expect(parseAmount('1,500,000', 'LBP')).toBe(1500000);
    expect(parseAmount('١٢٫٥', 'USD')).toBe(1250);
    expect(parseAmount(' 7.25 ', 'USD')).toBe(725);
  });
  it('rejects invalid, zero and negative input', () => {
    expect(parseAmount('', 'USD')).toBeNull();
    expect(parseAmount('abc', 'USD')).toBeNull();
    expect(parseAmount('0', 'LBP')).toBeNull();
    expect(parseAmount('-5', 'USD')).toBeNull();
    expect(parseAmount('1.2.3', 'USD')).toBeNull();
  });
  it('rounds lira fractions', () => {
    expect(parseAmount('1000.6', 'LBP')).toBe(1001);
  });
});

describe('formatting', () => {
  it('formats with grouping', () => {
    expect(formatNumber(150000000, 'LBP')).toBe('150,000,000');
    expect(formatNumber(1250, 'USD')).toBe('12.50');
    expect(formatNumber(1200, 'USD')).toBe('12');
    expect(formatNumber(123456705, 'USD')).toBe('1,234,567.05');
    expect(formatNumber(-500, 'USD')).toBe('-5');
  });
  it('adds currency symbol', () => {
    expect(formatMoney(1250, 'USD')).toBe('$12.50');
    expect(formatMoney(90000, 'LBP')).toBe('90,000 ل.ل');
  });
});

describe('computeBalance', () => {
  const txs: TxLike[] = [
    { type: 'debt', currency: 'USD', amount: 2000 },
    { type: 'debt', currency: 'LBP', amount: 500000 },
    { type: 'payment', currency: 'USD', amount: 750 },
    { type: 'debt', currency: 'USD', amount: 125 },
    { type: 'payment', currency: 'LBP', amount: 200000 },
  ];
  it('keeps the two currencies separate', () => {
    expect(computeBalance(txs)).toEqual({ USD: 1375, LBP: 300000 });
  });
  it('returns zero for no transactions', () => {
    expect(computeBalance([])).toEqual({ USD: 0, LBP: 0 });
  });
  it('allows negative balance (customer overpaid)', () => {
    expect(
      computeBalance([
        { type: 'debt', currency: 'USD', amount: 1000 },
        { type: 'payment', currency: 'USD', amount: 1500 },
      ]),
    ).toEqual({ USD: -500, LBP: 0 });
  });
});

describe('aggregateBalances + totalReceivable', () => {
  const rows = [
    { customer_id: 1, currency: 'USD' as const, type: 'debt' as const, total: 5000 },
    { customer_id: 1, currency: 'USD' as const, type: 'payment' as const, total: 1000 },
    { customer_id: 1, currency: 'LBP' as const, type: 'debt' as const, total: 900000 },
    { customer_id: 2, currency: 'USD' as const, type: 'debt' as const, total: 1000 },
    { customer_id: 2, currency: 'USD' as const, type: 'payment' as const, total: 3000 },
    { customer_id: 3, currency: 'LBP' as const, type: 'debt' as const, total: 100000 },
  ];
  it('aggregates per customer', () => {
    const m = aggregateBalances(rows);
    expect(m.get(1)).toEqual({ USD: 4000, LBP: 900000 });
    expect(m.get(2)).toEqual({ USD: -2000, LBP: 0 });
    expect(m.get(3)).toEqual({ USD: 0, LBP: 100000 });
  });
  it('totals only what customers owe (ignores credit balances)', () => {
    const total = totalReceivable(aggregateBalances(rows).values());
    expect(total).toEqual({ USD: 4000, LBP: 1000000 });
  });
});

describe('convertBalance', () => {
  const rate = 89500; // ليرة بالدولار
  it('converts everything to USD', () => {
    // $40 + 895,000 ل.ل = $40 + $10 = $50
    expect(convertBalance({ USD: 4000, LBP: 895000 }, rate, 'USD')).toBe(5000);
  });
  it('converts everything to LBP', () => {
    // $10.50 = 939,750 ل.ل + 50,000
    expect(convertBalance({ USD: 1050, LBP: 50000 }, rate, 'LBP')).toBe(989750);
  });
  it('rounds to the nearest minor unit', () => {
    // 100,000 ل.ل / 89,500 = 1.11731... $ → 112 سنت
    expect(convertBalance({ USD: 0, LBP: 100000 }, rate, 'USD')).toBe(112);
  });
  it('handles negative parts', () => {
    expect(convertBalance({ USD: -1000, LBP: 1790000 }, rate, 'USD')).toBe(1000);
  });
  it('returns null for invalid rate', () => {
    expect(convertBalance({ USD: 100, LBP: 0 }, 0, 'LBP')).toBeNull();
    expect(convertBalance({ USD: 100, LBP: 0 }, NaN, 'LBP')).toBeNull();
    expect(convertBalance({ USD: 100, LBP: 0 }, -1, 'USD')).toBeNull();
  });
});

describe('describeBalance', () => {
  it('describes both currencies', () => {
    expect(describeBalance({ USD: 1250, LBP: 150000 })).toBe('$12.50 و 150,000 ل.ل');
    expect(describeBalance({ USD: 0, LBP: 150000 })).toBe('150,000 ل.ل');
  });
});
