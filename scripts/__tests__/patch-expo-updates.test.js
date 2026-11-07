const fs = require('fs');
const path = require('path');
const { patch, ORIGINAL, PATCHED } = require('../patch-expo-updates');

describe('patch-expo-updates', () => {
  it('patches the installed expo-updates source exactly once', () => {
    const file = path.join(
      __dirname,
      '../../node_modules/expo-updates/android/src/main/java/expo/modules/updates/loader/FileDownloader.kt',
    );
    const src = fs.readFileSync(file, 'utf8');
    // postinstall already ran: the patched line must be there
    expect(src).toContain(PATCHED);
    expect(patch(src).changed).toBe(false);
  });

  it('replaces the header line and is idempotent', () => {
    const r = patch(`a\n${ORIGINAL}\nb`);
    expect(r.changed).toBe(true);
    expect(r.source).toContain('?: "1"');
    expect(patch(r.source).changed).toBe(false);
  });

  it('fails loudly when the library code changed', () => {
    expect(() => patch('nothing here')).toThrow(/found 0/);
  });
});
