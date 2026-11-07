const crypto = require('crypto');

const { base64url, buildManifest, hashToUUID, resolveRuntimeVersion } = require('../ota');

const config = {
  version: '1.0.0',
  runtimeVersion: { policy: 'appVersion' },
  updates: { url: 'https://raw.githubusercontent.com/o/r/ota/android/1.0.0/manifest.json' },
};

const input = {
  bundle: { data: Buffer.from('console.log(1)') },
  assets: [{ data: Buffer.from('PNGDATA'), ext: 'png' }],
};

describe('ota manifest', () => {
  it('produces an expo-updates manifest with verifiable hashes', () => {
    const { manifest, files } = buildManifest(input, config, new Date('2026-11-07T00:00:00Z'));
    expect(manifest.runtimeVersion).toBe('1.0.0');
    expect(manifest.createdAt).toBe('2026-11-07T00:00:00.000Z');
    expect(manifest.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    const expectedHash = base64url(crypto.createHash('sha256').update('console.log(1)').digest());
    expect(manifest.launchAsset.hash).toBe(expectedHash);
    expect(manifest.launchAsset.hash).not.toMatch(/[+/=]/);
    expect(manifest.launchAsset.contentType).toBe('application/javascript');
    expect(manifest.launchAsset.url).toBe(
      `https://raw.githubusercontent.com/o/r/ota/android/1.0.0/files/${manifest.launchAsset.key}.bundle`,
    );
    expect(manifest.assets[0]).toMatchObject({ fileExtension: '.png', contentType: 'image/png' });
    expect(manifest.extra.expoClient).toBe(config);
    expect(files.map((f) => f.fileName)).toEqual([
      `${manifest.launchAsset.key}.bundle`,
      `${manifest.assets[0].key}.png`,
    ]);
    // اسم الملف لازم يكون آمن (expo-updates بيرفض أي فاصل مسار)
    for (const f of files) expect(f.fileName).toMatch(/^[0-9a-f]{64}(\.[a-z]+)?$/);
  });

  it('id depends only on content, not on time', () => {
    const a = buildManifest(input, config, new Date(1)).manifest.id;
    const b = buildManifest(input, config, new Date(2)).manifest.id;
    const c = buildManifest({ ...input, bundle: { data: Buffer.from('console.log(2)') } }, config).manifest.id;
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it('rejects a config without a manifest url', () => {
    expect(() => buildManifest(input, { ...config, updates: {} })).toThrow(/updates.url/);
  });

  it('resolves runtime version', () => {
    expect(resolveRuntimeVersion(config)).toBe('1.0.0');
    expect(resolveRuntimeVersion({ version: '2.0.0', runtimeVersion: '7' })).toBe('7');
    expect(hashToUUID('f'.repeat(64))).toBe('ffffffff-ffff-5fff-bfff-ffffffffffff');
  });
});
