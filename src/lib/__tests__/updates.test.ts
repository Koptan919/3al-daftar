import { APPLY_AFTER_AWAY_MS, shouldApplyOnResume } from '../updates';

describe('shouldApplyOnResume', () => {
  const base = { pending: true, pathname: '/', awayMs: APPLY_AFTER_AWAY_MS };

  it('applies a ready update on the home screen after being away', () => {
    expect(shouldApplyOnResume(base)).toBe(true);
  });

  it('does nothing without a downloaded update', () => {
    expect(shouldApplyOnResume({ ...base, pending: false })).toBe(false);
  });

  it('never reloads while the user is in a form or another screen', () => {
    expect(shouldApplyOnResume({ ...base, pathname: '/transaction/new' })).toBe(false);
    expect(shouldApplyOnResume({ ...base, pathname: '/customer/3' })).toBe(false);
  });

  it('waits until the user was away long enough', () => {
    expect(shouldApplyOnResume({ ...base, awayMs: 5_000 })).toBe(false);
  });
});
