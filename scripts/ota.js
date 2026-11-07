#!/usr/bin/env node
/**
 * بيحضّر تحديث OTA كملفات ثابتة (بلا سيرفر Expo):
 *
 *   npx expo export --platform android --output-dir dist
 *   npx expo config --type public --json > expo-config.json
 *   node scripts/ota.js dist expo-config.json <مجلد فرع ota>
 *
 * النتيجة: <ota>/android/<version>/manifest.json + files/…
 * expo-updates بالتطبيق بيقرا manifest.json من raw.githubusercontent.com
 * (رابطو محطوط بـ app.config.js) وبيتحقق من SHA-256 لكل ملف قبل ما يطبّقه.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONTENT_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  otf: 'font/otf',
  json: 'application/json',
};

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest();
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** UUID ثابت من hash، حتى نفس المحتوى يعطي نفس الـ id */
function hashToUUID(hex) {
  const h = hex.slice(0, 32).split('');
  h[12] = '5'; // version
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16); // variant
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

/** رقم النسخة اللي التطبيق بيطلب فيها تحديثات (سياسة appVersion أو قيمة ثابتة) */
function resolveRuntimeVersion(expoConfig) {
  const rv = expoConfig.runtimeVersion;
  if (typeof rv === 'string') return rv;
  if (!rv || rv.policy === 'appVersion') return expoConfig.version;
  throw new Error(`runtimeVersion policy "${rv.policy}" not supported`);
}

/**
 * منطق صافي: بياخد الملفات (بمحتواها) وبيرجّع الـ manifest ولائحة الملفات اللي لازم تنكتب.
 * @param {{bundle: {data: Buffer}, assets: {data: Buffer, ext: string}[]}} input
 * @param {object} expoConfig
 * @param {Date} now
 */
function buildManifest(input, expoConfig, now = new Date()) {
  const updateUrl = expoConfig.updates && expoConfig.updates.url;
  if (!updateUrl || !updateUrl.endsWith('/manifest.json')) {
    throw new Error('expo config updates.url must end with /manifest.json');
  }
  const baseUrl = updateUrl.slice(0, -'manifest.json'.length);

  const describe = (data, ext, isLaunch) => {
    const digest = sha256(data);
    const key = digest.toString('hex');
    const fileExtension = isLaunch ? '.bundle' : ext ? `.${ext}` : '';
    const fileName = key + fileExtension;
    return {
      fileName,
      data,
      entry: {
        hash: base64url(digest),
        key,
        fileExtension,
        contentType: isLaunch ? 'application/javascript' : CONTENT_TYPES[ext] || 'application/octet-stream',
        url: `${baseUrl}files/${fileName}`,
      },
    };
  };

  const launch = describe(input.bundle.data, null, true);
  const assets = input.assets.map((a) => describe(a.data, a.ext, false));
  const runtimeVersion = resolveRuntimeVersion(expoConfig);

  // الـ id بيعتمد على المحتوى ورقم النسخة بس: إذا ما تغيّر شي، ما في تحديث جديد
  const fingerprint = crypto
    .createHash('sha256')
    .update([runtimeVersion, launch.entry.hash, ...assets.map((a) => a.entry.hash).sort()].join('|'))
    .digest('hex');

  const manifest = {
    id: hashToUUID(fingerprint),
    createdAt: now.toISOString(),
    runtimeVersion,
    launchAsset: launch.entry,
    assets: assets.map((a) => a.entry),
    metadata: {},
    extra: { expoClient: expoConfig },
  };
  return { manifest, files: [launch, ...assets] };
}

function main() {
  const [exportDir, configPath, otaRoot] = process.argv.slice(2);
  if (!exportDir || !configPath || !otaRoot) {
    console.error('usage: node scripts/ota.js <exportDir> <expo-config.json> <otaRoot>');
    process.exit(2);
  }
  const expoConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const metadata = JSON.parse(fs.readFileSync(path.join(exportDir, 'metadata.json'), 'utf8'));
  const android = metadata.fileMetadata.android;
  const input = {
    bundle: { data: fs.readFileSync(path.join(exportDir, android.bundle)) },
    assets: android.assets.map((a) => ({ data: fs.readFileSync(path.join(exportDir, a.path)), ext: a.ext })),
  };

  const { manifest, files } = buildManifest(input, expoConfig);
  const outDir = path.join(otaRoot, 'android', manifest.runtimeVersion);
  const manifestPath = path.join(outDir, 'manifest.json');

  if (fs.existsSync(manifestPath)) {
    const previous = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (previous.id === manifest.id) {
      console.log(`unchanged: ${manifest.id} (runtime ${manifest.runtimeVersion})`);
      return;
    }
  }

  const filesDir = path.join(outDir, 'files');
  fs.rmSync(filesDir, { recursive: true, force: true });
  fs.mkdirSync(filesDir, { recursive: true });
  for (const f of files) fs.writeFileSync(path.join(filesDir, f.fileName), f.data);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`published: ${manifest.id} (runtime ${manifest.runtimeVersion}, ${files.length} files)`);
}

module.exports = { buildManifest, hashToUUID, base64url, resolveRuntimeVersion };

if (require.main === module) main();
