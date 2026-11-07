#!/usr/bin/env node
/**
 * بيشتغل لحالو بعد `npm install` / `npm ci` (postinstall).
 *
 * المشكلة: expo-updates (أندرويد) بيرفض أي manifest ما معو header
 * `expo-protocol-version` («Legacy manifests are no longer supported»).
 * raw.githubusercontent.com ما بيسمح نحط headers، فالفحص كان يفشل دايماً
 * («ما قدرنا نفحص») والتحديثات OTA ما كانت توصل أبداً.
 *
 * الحل: إذا الـ header مش موجود، منعتبرو "1" (نفس البروتوكول اللي الـ manifest تبعنا ماشي عليه).
 * هيدا تعديل native، فبيلزمو APK جديد (ما بيوصل بـ OTA).
 *
 * بيفشل بصوت عالي إذا تغيّر كود المكتبة (مثلاً بعد ترقية Expo) حتى ما ننسى.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(
  __dirname,
  '..',
  'node_modules/expo-updates/android/src/main/java/expo/modules/updates/loader/FileDownloader.kt',
);
const ORIGINAL = 'protocolVersionRaw = responseHeaders["expo-protocol-version"],';
const PATCHED =
  'protocolVersionRaw = responseHeaders["expo-protocol-version"] ?: "1", // daftar: static hosting (GitHub) can\'t send headers';

function patch(source) {
  if (source.includes(PATCHED)) return { changed: false, source };
  const count = source.split(ORIGINAL).length - 1;
  if (count !== 1) {
    throw new Error(`expected 1 occurrence of the expo-protocol-version line, found ${count}`);
  }
  return { changed: true, source: source.replace(ORIGINAL, PATCHED) };
}

function main() {
  if (!fs.existsSync(FILE)) {
    console.warn('[patch-expo-updates] expo-updates not installed, skipping');
    return;
  }
  const { changed, source } = patch(fs.readFileSync(FILE, 'utf8'));
  if (changed) fs.writeFileSync(FILE, source);
  console.log(`[patch-expo-updates] ${changed ? 'patched' : 'already patched'}`);
}

module.exports = { patch, ORIGINAL, PATCHED };

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('[patch-expo-updates] FAILED:', e.message);
    process.exit(1);
  }
}
