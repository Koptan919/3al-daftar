import { BackupError, makeBackup, parseBackup } from '../backup';

const customers = [{ id: 1, name: 'سمير', phone: '03123456', note: '', created_at: '2026-11-01 10:00:00' }];
const transactions = [
  {
    id: 1,
    customer_id: 1,
    type: 'debt' as const,
    amount: 1500,
    currency: 'USD' as const,
    date: '2026-11-01',
    note: 'x',
    created_at: '2026-11-01 10:00:00',
  },
];

describe('backup', () => {
  it('round-trips through JSON', () => {
    const b = makeBackup(customers, transactions, { exchangeRate: '89500' }, new Date('2026-11-07T00:00:00Z'));
    const parsed = parseBackup(JSON.stringify(b));
    expect(parsed.customers).toEqual(customers);
    expect(parsed.transactions).toEqual(transactions);
    expect(parsed.settings).toEqual({ exchangeRate: '89500' });
  });

  it('rejects foreign or broken files', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"other"}')).toThrow(BackupError);
    const future = { ...makeBackup([], [], {}), version: 99 };
    expect(() => parseBackup(JSON.stringify(future))).toThrow(/أحدث/);
  });

  it('rejects transactions pointing at missing customers or bad amounts', () => {
    const orphan = makeBackup(customers, [{ ...transactions[0], customer_id: 7 }], {});
    expect(() => parseBackup(JSON.stringify(orphan))).toThrow(BackupError);
    const bad = makeBackup(customers, [{ ...transactions[0], amount: 12.5 }], {});
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(BackupError);
  });
});
