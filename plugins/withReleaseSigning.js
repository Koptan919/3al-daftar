/**
 * Config plugin: بيوقّع نسخة الـ release بمفتاح دائم إذا انبعتت متغيرات البيئة:
 *   DAFTAR_KEYSTORE_FILE, DAFTAR_KEYSTORE_PASSWORD, DAFTAR_KEY_ALIAS
 * (هيدول بيحطّهن workflow «Build APK» بعد ما يفك تشفير signing/daftar.jks.enc).
 * بلاهن، بيضل التوقيع متل ما هو (debug) للتجربة المحلية بس.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// daftar-release-signing';

const SIGNING_CONFIG = `
        release { ${MARKER}
            if (System.getenv('DAFTAR_KEYSTORE_FILE')) {
                storeFile file(System.getenv('DAFTAR_KEYSTORE_FILE'))
                storePassword System.getenv('DAFTAR_KEYSTORE_PASSWORD')
                keyAlias System.getenv('DAFTAR_KEY_ALIAS') ?: 'daftar'
                keyPassword System.getenv('DAFTAR_KEYSTORE_PASSWORD')
            }
        }`;

function applySigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;
  const debugBlock = /signingConfigs\s*\{\s*\n(\s*)debug\s*\{[^}]*\}/;
  if (!debugBlock.test(gradle)) throw new Error('withReleaseSigning: signingConfigs.debug not found');
  gradle = gradle.replace(debugBlock, (m) => m + SIGNING_CONFIG);

  const releaseUsesDebug = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseUsesDebug.test(gradle)) throw new Error('withReleaseSigning: release signingConfig not found');
  return gradle.replace(
    releaseUsesDebug,
    "$1signingConfig System.getenv('DAFTAR_KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug",
  );
}

const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applySigning(cfg.modResults.contents);
    return cfg;
  });

module.exports = withReleaseSigning;
module.exports.applySigning = applySigning;
