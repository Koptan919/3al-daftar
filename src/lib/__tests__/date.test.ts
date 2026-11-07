import { formatDate, friendlyDate, isValidISODate, shiftDate } from '../date';

describe('date helpers', () => {
  it('validates ISO dates', () => {
    expect(isValidISODate('2026-11-07')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('7/11/2026')).toBe(false);
  });
  it('shifts across month and year boundaries', () => {
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('formats friendly', () => {
    expect(formatDate('2026-11-07')).toBe('07/11/2026');
    expect(friendlyDate('2026-11-07', '2026-11-07')).toBe('اليوم');
    expect(friendlyDate('2026-11-06', '2026-11-07')).toBe('مبارح');
    expect(friendlyDate('2026-10-01', '2026-11-07')).toBe('01/10/2026');
  });
});
