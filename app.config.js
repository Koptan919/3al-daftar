/**
 * بيكمّل app.json: رابط التحديثات (OTA) بيشاور على فرع `ota` بنفس الريبو على GitHub.
 * كل نسخة (version) إلها مجلد خاص، فالـ APK القديم ما بيوصلو تحديث مش متوافق معو.
 */
const OTA_REPO = process.env.OTA_REPO || 'Koptan919/3al-daftar';
const OTA_BRANCH = process.env.OTA_BRANCH || 'ota';

module.exports = ({ config }) => ({
  ...config,
  updates: {
    ...config.updates,
    url: `https://raw.githubusercontent.com/${OTA_REPO}/${OTA_BRANCH}/android/${config.version}/manifest.json`,
  },
});
