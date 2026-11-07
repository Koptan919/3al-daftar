import { LRI, ltr, PDI } from '../bidi';
import { buildStatementRows, statementHtml, statementText, type StatementTx } from '../statement';
import { reminderMessage, toWhatsAppNumber, whatsappUrl } from '../whatsapp';

describe('toWhatsAppNumber', () => {
  it('normalizes lebanese numbers', () => {
    expect(toWhatsAppNumber('03 123 456')).toBe('9613123456');
    expect(toWhatsAppNumber('70123456')).toBe('96170123456');
    expect(toWhatsAppNumber('+961 3 123456')).toBe('9613123456');
    expect(toWhatsAppNumber('00961 71 123 456')).toBe('96171123456');
    expect(toWhatsAppNumber('٠٣١٢٣٤٥٦')).toBe('9613123456');
    expect(toWhatsAppNumber('')).toBeNull();
  });
});

describe('reminder', () => {
  it('only mentions owed amounts', () => {
    const msg = reminderMessage('أبو علي', { USD: 1250, LBP: -5000 }, 'دكان السعادة');
    expect(msg).toContain('أبو علي');
    expect(msg).toContain('دكان السعادة');
    expect(msg).toContain('$12.50');
    expect(msg).not.toContain('5,000');
  });
  it('builds wa.me url', () => {
    const url = whatsappUrl('03123456', 'مرحبا');
    expect(url).toBe('https://wa.me/9613123456?text=' + encodeURIComponent('مرحبا'));
    expect(whatsappUrl('', 'x')).toBe('https://wa.me/?text=x');
  });
});

describe('statement', () => {
  const txs: StatementTx[] = [
    { type: 'payment', amount: 500, currency: 'USD', date: '2026-11-05', note: '' },
    { type: 'debt', amount: 2000, currency: 'USD', date: '2026-11-01', note: 'غراض' },
    { type: 'debt', amount: 300000, currency: 'LBP', date: '2026-11-03', note: '' },
  ];
  it('sorts chronologically with running balances per currency', () => {
    const rows = buildStatementRows(txs);
    expect(rows.map((r) => r.date)).toEqual(['2026-11-01', '2026-11-03', '2026-11-05']);
    expect(rows.map((r) => r.running)).toEqual([
      { USD: 2000, LBP: 0 },
      { USD: 2000, LBP: 300000 },
      { USD: 1500, LBP: 300000 },
    ]);
  });
  it('renders text and html', () => {
    const input = {
      shopName: 'دكان',
      customerName: 'سمير <x>',
      phone: '',
      transactions: txs,
      exchangeRate: 100000,
      referenceCurrency: 'USD' as const,
      generatedOn: '2026-11-07',
    };
    const text = statementText(input);
    expect(text).toContain('الرصيد بالدولار: $15 (عليه)');
    expect(text).toContain('الرصيد بالليرة: 300,000 ل.ل (عليه)');
    expect(text).toContain('المجموع التقريبي: $18');
    const html = statementHtml(input);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('سمير &lt;x&gt;');
  });
});

describe('phone display (bidi)', () => {
  it('wraps phones in an LTR isolate for display only', () => {
    expect(ltr('03 123 456')).toBe(`${LRI}03 123 456${PDI}`);
    expect(ltr('')).toBe('');
  });
  it('isolates the phone inside the statement', () => {
    const input = {
      shopName: '',
      customerName: 'سمير',
      phone: '03 123 456',
      transactions: [],
      exchangeRate: null,
      referenceCurrency: 'USD' as const,
      generatedOn: '2026-11-07',
    };
    expect(statementText(input)).toContain(`(${LRI}03 123 456${PDI})`);
    expect(statementHtml(input)).toContain('<span dir="ltr">03 123 456</span>');
  });
  it('does not change what is sent to WhatsApp', () => {
    expect(whatsappUrl('03 123 456', 'x')).toBe('https://wa.me/9613123456?text=x');
  });
});
