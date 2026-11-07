import { formatSize, isNewerVersion, parseRelease, versionFromTag } from '../apkUpdate';

describe('versionFromTag', () => {
  it('reads the version from the release tag', () => {
    expect(versionFromTag('v1.5.0-build.12')).toBe('1.5.0');
    expect(versionFromTag('1.4.0')).toBe('1.4.0');
    expect(versionFromTag('nightly')).toBeNull();
  });
});

describe('isNewerVersion', () => {
  it('compares number by number, not as text', () => {
    expect(isNewerVersion('1.10.0', '1.9.9')).toBe(true);
    expect(isNewerVersion('1.5.0', '1.4.0')).toBe(true);
    expect(isNewerVersion('1.4.0', '1.4.0')).toBe(false);
    expect(isNewerVersion('1.3.0', '1.4.0')).toBe(false);
    expect(isNewerVersion('2', '1.9.9')).toBe(true);
  });
});

describe('parseRelease', () => {
  const ok = {
    tag_name: 'v1.5.0-build.12',
    assets: [
      { name: 'other.txt', browser_download_url: 'https://github.com/x/other.txt', size: 1 },
      {
        name: 'daftar-al-dayn.apk',
        browser_download_url: 'https://github.com/Koptan919/3al-daftar/releases/download/v1.5.0-build.12/daftar-al-dayn.apk',
        size: 26_000_000,
      },
    ],
  };

  it('picks the APK asset', () => {
    expect(parseRelease(ok)).toEqual({ version: '1.5.0', url: ok.assets[1].browser_download_url, size: 26_000_000 });
  });

  it('rejects drafts, missing APKs, odd hosts and junk', () => {
    expect(parseRelease({ ...ok, draft: true })).toBeNull();
    expect(parseRelease({ ...ok, assets: [] })).toBeNull();
    expect(
      parseRelease({ ...ok, assets: [{ name: 'daftar-al-dayn.apk', browser_download_url: 'https://evil.example/a.apk' }] }),
    ).toBeNull();
    expect(parseRelease(null)).toBeNull();
    expect(parseRelease({ message: 'API rate limit exceeded' })).toBeNull();
  });
});

it('formatSize', () => {
  expect(formatSize(26_214_400)).toBe('25.0 MB');
  expect(formatSize(0)).toBe('');
});
