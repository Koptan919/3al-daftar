# ذاكرة مشروع «دفتر الدين»

> ملف ذاكرة للمشروع، تعطيه لـ Claude Code (أو لأي مطوّر) بأول الجلسة ليفهم شو انبنى، ليش، وكيف ما يكسر شي.
> آخر تحديث: 2026-11-07 — النسخة **1.2.0** (versionCode 3).
> الريبو: `Koptan919/3al-daftar` · الفرع الأساسي: `main`.

---

## 1. شو هو التطبيق

تطبيق أندرويد لأصحاب الدكاكين بلبنان لتسجيل ديون الزبائن ودفعاتن بالليرة والدولار.
**كل البيانات على التلفون** (SQLite) وبيشتغل بلا إنترنت. عربي بالكامل ومن اليمين لليسار، خط وأزرار كبيرة.

| الميزة | وين بالكود |
|---|---|
| زبائن (اسم، تلفون، ملاحظة) + بحث بالاسم أو الرقم | `src/app/index.tsx`, `src/app/customer/new.tsx`, `src/lib/search.ts` |
| حركات: دين / دفعة، ليرة / دولار، تاريخ، ملاحظة | `src/app/transaction/new.tsx` |
| رصيدين منفصلين لكل زبون + مجموع الديون بالرئيسية | `src/lib/money.ts` |
| سعر صرف يدوي، والمجموع المحوّل **للمرجع بس** | `src/app/settings.tsx`, `convertBalance()` |
| تذكير واتساب (wa.me) برسالة جاهزة | `src/lib/whatsapp.ts`, `src/components/CustomerActions.tsx` |
| كشف حساب نص أو PDF | `src/lib/statement.ts` (+ expo-print) |
| نسخ احتياطي JSON (تصدير/استيراد) | `src/lib/backup.ts`, `src/services/backup.ts` |
| قفل PIN أو بصمة | `src/state/lock.tsx`, `src/components/LockScreen.tsx` |
| تحديثات تلقائية OTA | `src/components/UpdateBanner.tsx`, `scripts/ota.js` |

## 2. التقنيات

- **Expo SDK 58** (React Native 0.88، New Architecture) + TypeScript + **Expo Router** (`src/app/`).
- `expo-sqlite` للبيانات، `expo-secure-store` للـ PIN، `expo-local-authentication` للبصمة.
- `expo-updates` للتحديثات، بس **بلا سيرفر Expo وبلا حساب Expo** (شوف القسم 6).
- البناء: **GitHub Actions** (`expo prebuild` + `gradlew`)، **مش EAS** (انشال `eas.json`).
- الثيم: `expo-blur`، `react-native-svg`، `lucide-react-native`، خط `@expo-google-fonts/tajawal`.

## 3. هيكل الملفات

```
src/app/          الشاشات (Expo Router). _layout.tsx: الخط، SQLite، الإعدادات، القفل، فحص التحديثات
src/components/   ui.tsx (T, Button, Field, Card, Segmented, IconBox)، Glass.tsx (GlassScreen, GradientText)،
                  icons.tsx (Lucide + شعار واتساب)، PinPad، LockScreen، UpdateBanner، BalanceView، CustomerActions
src/db/           schema.ts (الترحيلات)، repo.ts (كل الاستعلامات)
src/lib/          منطق صافي ومختبر: money, search, date, whatsapp, statement, backup, bidi
src/services/     backup.ts (ملفات + مشاركة)
src/state/        settings.tsx (سعر الصرف، اسم الدكان، وضع الأداء)، lock.tsx (PIN/بصمة)
src/theme/        colors.ts (ألوان الثيم، fx للتدرّجات والظلال، الخطوط)
plugins/          withReleaseSigning.js — config plugin بيوقّع الـ release من متغيرات البيئة
scripts/ota.js    بيحوّل ناتج `expo export` لـ manifest تحديث متوافق مع expo-updates
app.config.js     بيحط رابط التحديثات حسب رقم النسخة
signing/          daftar.jks.enc (مفتاح التوقيع مشفّر) + fingerprint-sha256.txt
.github/workflows ota-update.yml, build-apk.yml
```

## 4. البيانات — لا تكسرها أبداً

- قاعدة `daftar.db`، الإصدار بـ `PRAGMA user_version`. الترحيلات بـ `MIGRATIONS` بـ `src/db/schema.ts`:
  **بس بتزيد بالآخر، ما بتعدّل القديمة.** أي عمود جديد يكون له `DEFAULT`.
- الجداول:
  - `customers(id, name, phone, note, created_at)`
  - `transactions(id, customer_id, type 'debt'|'payment', amount INTEGER >0, currency 'LBP'|'USD', date 'YYYY-MM-DD', note, created_at)`
  - `settings(key, value)` — `exchangeRate`, `referenceCurrency`, `shopName`, `perfMode` ('1'/'0')
- **المبالغ أعداد صحيحة بأصغر وحدة**: الليرة كاملة، الدولار **بالسنت**. هيك ما في أخطاء كسور.
- **الرصيد = مجموع الديون − مجموع الدفعات، لكل عملة لحالها.** موجب = عليه، سالب = إلو.
- **مجموع الديون بالرئيسية بياخد الأرصدة الموجبة بس** (`totalReceivable`) — زبون دافع زيادة ما بينطرح من غيره.
- **التحويل بين العملات للعرض بس**، ما بيتخزّن ولا بيغيّر الأرصدة.
- الـ PIN بـ SecureStore (SHA-256 مع salt)، **مش بقاعدة البيانات**، فما بيطلع بالنسخة الاحتياطية.
- ملف النسخة الاحتياطية: `{app:'daftar-al-dayn', version:1, exportedAt, customers, transactions, settings}`.
  `parseBackup` بيرفض الملفات الغريبة أو الأحدث من التطبيق. الاستيراد بيمحي الموجود (بـ transaction وحدة).

## 5. العربي والاتجاه

- RTL مفروض من الـ native: `extra.forcesRTL: true` + plugin `expo-localization` بـ `app.json`
  (و `I18nManager.forceRTL` احتياط لـ Expo Go).
- بـ RTL، `flexDirection: 'row'` بينقلب لحالو: **أول عنصر بيطلع عاليمين**.
- **أرقام التلفون** بتنقلب جوّا نص عربي ("03 123 456" ← "456 123 03"). الحل: `ltr()` من `src/lib/bidi.ts`
  (LEFT-TO-RIGHT ISOLATE ‎U+2066…U+2069) **للعرض بس**. بالـ PDF: `<span dir="ltr">`. خانة الإدخال: `direction:'ltr'`.
- قراءة الأرقام بتقبل أرقام عربية (٠-٩) و«٫» و«٬» (`normalizeDigits`, `parseAmount`).
- البحث بيتجاهل الهمزات والتاء المربوطة والتشكيل (`normalizeArabic`).
- أرقام لبنان لواتساب: `03 123 456` ← `9613123456` (`toWhatsAppNumber`).

## 6. التحديث التلقائي (OTA) — بلا Expo

```
push على main
  └─ workflow «OTA Update»: lint + tsc + jest
       └─ expo export --platform android  →  dist/
       └─ expo config --type public --json  →  expo-config.json
       └─ node scripts/ota.js dist expo-config.json ota-branch
            → android/<version>/manifest.json + files/<sha256>.<ext>
       └─ force-push لفرع `ota` (commit وحيد دايماً حتى ما يكبر الريبو)

التطبيق (expo-updates):
  updates.url = https://raw.githubusercontent.com/Koptan919/3al-daftar/ota/android/<version>/manifest.json
  checkAutomatically: ON_LOAD, fallbackToCacheTimeout: 0
  + useAutoUpdateCheck(): checkForUpdateAsync + fetchUpdateAsync عند الفتح وعند الرجوع من الخلفية (مرة كل دقيقتين كحد أقصى)
  + UpdateBanner بالرئيسية: «تحديث الآن» → Updates.reloadAsync()
  + بيتطبّق لحالو: بالفتحة الجاية، أو لما يرجع للتطبيق بعد ≥ دقيقة وهو عالشاشة الرئيسية
    (`shouldApplyOnResume` بـ `src/lib/updates.ts`، ما منعيد التحميل وهو بنص نموذج)
  + فحص فاشل (بلا إنترنت) → منجرّب كمان مرة بالرجعة الجاية بلا انتظار الدقيقتين.
```

- ⚠️ **غلطة قديمة انصلحت بـ 1.2.0**: `expo-updates` (Android `FileDownloader.kt`) **بيرفض** أي manifest ما معو header
  `expo-protocol-version` («Legacy manifests are no longer supported»)، و raw.githubusercontent ما بيبعتو.
  يعني لحد 1.1.0 **ولا تحديث OTA وصل**، و«افحص التحديثات» كان يطلع «ما قدرنا نفحص» دايماً.
  الحل: `scripts/patch-expo-updates.js` (postinstall) بيخلّي الـ header الناقص = `"1"`. تعديل native → بدو APK.
  «Build APK» بيتأكد إنو التعديل موجود قبل gradle. إذا ترقّيت Expo والسكربت فشل، صلّحو قبل أي build.
- غير هيك بيقبل **JSON عادي** (`text/plain` كمان)،
  وبيتحقق من كل ملف بـ **SHA-256 base64url**، واسم الملف `key + fileExtension` لازم يكون آمن (بلا `/`).
- `id` الـ manifest بيعتمد على المحتوى بس (UUID من hash)، فإذا ما تغيّر الكود ما بينبعت تحديث.
- `runtimeVersion` بسياسة `appVersion` = رقم `version` بـ `app.json`، وكل نسخة إلها مجلد. فالـ APK القديم ما بيوصلو تحديث مش متوافق.
- raw.githubusercontent بيعمل cache ~5 دقايق، فالتحديث ممكن يتأخر شوي.

### مقارنة مع نظام KOPT X (Capacitor + PWA، `AUTO-UPDATE.md`)
| KOPT X | هون (Expo) |
|---|---|
| `version.json` + `newer()` بيقارن الأرقام | `manifest.json` بـ `id` من المحتوى؛ expo-updates بيقارن بنفسو |
| zip + `download → next → set` | `fetchUpdateAsync` (بيتحقق SHA-256 لكل ملف) → الفتحة الجاية أو `reloadAsync` |
| `whenIdle()` ما يعيد التحميل بنص نموذج | `shouldApplyOnResume`: بس عالشاشة الرئيسية |
| `notifyAppReady` + `appReadyTimeout` (رجوع للنسخة القديمة) | مدموج بـ expo-updates (error recovery) |
| `resetWhenUpdate` لما ينزل APK جديد | مجلد لكل `version` (runtimeVersion) |
| ما تنشر نسخة أقدم فوق أحدث | كل نسخة إلها مجلد، والـ workflow بينشر من `main` بس |
| **تغيير اسم الريبو وقّف التحديثات** | ⚠️ نفس الخطر: الرابط `Koptan919/3al-daftar` محفور بالـ APK. **لا تغيّر اسم الريبو ولا اسم فرع `ota`** (expo-updates بياخد رابط واحد بس) |
| Service Worker للويب | ما في نسخة ويب |

### إيمتا بدّك APK جديد بدل OTA
أي شي native: مكتبة فيها كود native (`npx expo install`)، أذونات، أيقونة، splash، اسم، أي شي بـ `app.json` غير الكود.
ساعتها: **كبّر `version` و `android.versionCode`** بـ `app.json` واعمل push على main → «Build APK» بيشتغل لحالو.
⚠️ إضافة مكتبة كـ dependency مباشر بنفس النسخة الموجودة جوّا expo (متل `expo-font@58.0.11`) **ما بتعتبر تغيير native**.

## 7. بناء الـ APK والتوقيع

- workflow «Build APK» (`.github/workflows/build-apk.yml`): يدوي أو لما يتغيّر `app.json` على main.
  1. يتأكد من `KEYSTORE_PASSWORD` (secret بالريبو، ≥6 أحرف).
  2. lint/tsc/jest.
  3. **أول مرة بس**: `keytool` بيعمل مفتاح RSA-4096 (alias `daftar`)، بيتشفّر بـ `openssl aes-256-cbc -pbkdf2 -iter 200000`
     بكلمة السر، وبينحفظ `signing/daftar.jks.enc` + `signing/fingerprint-sha256.txt` وبيعمل commit لـ main.
     بعدها كل مرة بيفك التشفير بس.
  4. `expo prebuild` + `gradlew assembleRelease` مع:
     `-PreactNativeArchitectures=armeabi-v7a,arm64-v8a -Pexpo.useLegacyPackaging=true -Pandroid.enableMinifyInReleaseBuilds=true -Pandroid.enableShrinkResourcesInReleaseBuilds=true`
  5. **يتأكد إنو بصمة الـ APK (apksigner) = البصمة المحفوظة**، وإلا بيفشل.
  6. GitHub Release باسم `v<version>-build.<run>`.
- رابط ثابت لآخر نسخة: **https://github.com/Koptan919/3al-daftar/releases/latest/download/daftar-al-dayn.apk**
- التوقيع بيصير بـ `plugins/withReleaseSigning.js` من متغيرات `DAFTAR_KEYSTORE_FILE/PASSWORD/KEY_ALIAS`.
- 🚫 **لا تمحي ولا تبدّل `signing/` ولا `KEYSTORE_PASSWORD` أبداً** — التلفون بيرفض تحديث APK بتوقيع مختلف، والحل الوحيد مسح التطبيق (وضياع البيانات).
- البصمة الحالية (SHA-256) بتبلّش بـ `b54f42937bf6b8d96a1f…`.

## 8. الثيم: Titanium Gray × Burgundy Liquid Glass (من KOPT X)

- **داكن دايماً** (`isDark: true`، `userInterfaceStyle: dark`). ما في وضع فاتح.
- ألوان وتدرّجات بـ `src/theme/colors.ts`: `fx.burg`، `fx.glass`، `fx.ambient`، ظلال `cardShadow`/`burgShadow`.
  RN 0.88 بيدعم `backgroundImage` (linear/radial) و `boxShadow` (مع inset) بلا مكتبات.
- **العنابي بس للفعل الرئيسي والحالة النشطة**؛ أخضر `#42d293` للدفعات؛ عنابي فاتح `#e8829f` لنص الديون؛ واتساب `#25D366`.
- **GlassScreen** (`src/components/Glass.tsx`): كل شاشة بتلفّ محتواها فيه. فيه `BlurTargetView` (عليه الإضاءة الخلفية)،
  شريط علوي وسفلي `BlurView` (`dimezisBlurViewSdk31Plus`). المحتوى لازم `paddingTop: useGlassTop() + 16`.
  شريط الـ Stack مخفي (`headerShown: false`).
- blur حقيقي بس على **أندرويد 12+**. عالأقدم أو بـ «وضع الأداء» → خلفية `.lite` معتمة `rgba(22,23,28,0.97)`.
- **GradientText**: نص بلون معدني/عنابي صلب + ظل (كان SVG بتدرّج، بس طلع غلط عالتلفون). الشعار: «دفتر» معدني + «الدين» عنابي.
- أيقونات Lucide (stroke 2، 22px)، **IconBox** (`.th`) ملوّن حسب المعنى: `r` دين، `g` دفعة، `o` تنبيه، `tn` محايد.
- خط **Tajawal** 400/500/700/800 محمّل بـ `useFonts`. عأندرويد `fontWeight` ما بيشتغل مع خط مخصّص،
  فاستعمل `family('bold')` إلخ، **مش** `fontWeight`.
- زوايا: بطاقات 20، أزرار 15، أيقونات 14، كبسولات 99. أهداف لمس ≥ 44px.

## 9. الاختبارات والفحص

```bash
npm test            # 47 اختبار: money, search, date, whatsapp+statement+bidi, backup, updates, scripts/ota, patch-expo-updates
npx tsc --noEmit
npx expo lint
```
- الـ CI («OTA Update») بيشغّلهن على كل PR وكل push.
- **معاينة بصرية بلا تلفون**: نسخة مؤقتة من المشروع + `react-native-web` + `@expo/metro-runtime`،
  `metro.config.js` فيه `wasm` بالـ assetExts و headers `COEP/COOP` (لـ expo-sqlite عالويب)، بيانات تجريبية بـ `migrateDb`،
  و `SecureStore` بـ `.catch(() => null)`. التصوير بـ Playwright بقياس Pixel 7.
  ⚠️ لازم `dir="rtl"` ينحط **قبل** ما تحمّل الصفحة (`addInitScript`)، وإلا الترتيب بيطلع LTR بالمعاينة بس.
  **هيدي التعديلات بالنسخة المؤقتة بس، مش بالريبو.**

## 10. مشاكل واجهناها وحلولها

| المشكلة | الحل |
|---|---|
| `docs.expo.dev` و API تبع Expo مسكّرين من بيئة Claude | `EXPO_OFFLINE=1 npx expo install …` (بياخد النسخ من `bundledNativeModules.json`)، وقراءة الـ types/الكود من `node_modules` |
| `create-expo-app` نسخ `.git` تبعو فوق الريبو | فرع orphan جديد + `git remote add origin` |
| تعارض peer لـ `react-dom` | تثبيت `react-dom@19.3.0` (نفس نسخة react) |
| `EXPO_TOKEN` ما كان يوصل للـ Actions (انضاف بمكان غلط) | تركنا EAS كلياً وصار كل شي من GitHub |
| `android-actions/setup-android@v3` فشل (`Failed to find package 'tools'`) | الـ runner فيه Android SDK جاهز؛ شلنا الخطوة |
| `git checkout package.json` بعد `expo prebuild` شال تعديلات بـ package.json (مرتين!) | بعد prebuild رجّع **بس** سطور `scripts` اللي غيّرها، أو اعمل prebuild بنسخة مؤقتة |
| `tar --exclude=android` شال كمان مجلدات `android` جوّا `node_modules` | استعمل `--exclude=./android` (مسار من الجذر) |
| `npm ci` بيفشل إذا `package.json` و الـ lock مش متطابقين | `npm install --package-lock-only` بعد أي تعديل يدوي |
| setState داخل useEffect (lint `react-hooks/set-state-in-effect`) | `.then()` مع علم `cancelled` |
| «ما قدرنا نفحص» + ولا OTA وصل | header `expo-protocol-version` ناقص من GitHub → `scripts/patch-expo-updates.js` (1.2.0) |
| العنوان بالشريط العلوي غامق ومكرّر، والنص تحتو بيبيّن من خلالو (عالتلفون) | `GradientText` صار نص عادي بلون صلب (بلا SVG)، وطبقة الشريط أغمق `rgba(14,15,19,0.78)` |
| الرصيد السالب كان يطلع «10-$» | بلائحة الزبائن: «إلو $10» (`BalanceView.tsx`) |
| الكيبورد بيغطي الخانات عأندرويد (edge-to-edge) | `KeyboardAvoidingView behavior="padding"` عكل المنصات |
| الـ APK كان 99 MB | معالجات ARM بس + ضغط المكتبات + minify/shrink (نسخة 1.1.0) → **25 MB** |

## 11. التاريخ

| PR | شو صار |
|---|---|
| #1 | النسخة الأولى: كل الميزات + README + workflow لـ EAS |
| #3 | محاولة بناء APK عبر EAS من GitHub (انلغت بعدين) |
| #4 | التحويل لـ GitHub بالكامل: Build APK بمفتاح مشفّر، OTA عبر فرع `ota`، lint بالـ CI |
| #5 | تصليح setup-android → **أول APK نجح** (1.0.0، build 4، 99 MB) |
| #6 | ثيم KOPT X (OTA، بلا مكتبات native) |
| #7 | تصليح أرقام التلفون المقلوبة (OTA) |
| #8 | **1.1.0**: blur حقيقي، Lucide، نص معدني، شعار واتساب، وضع الأداء، splash داكن، APK أصغر → build 5 نجح، **25 MB** (كان 99 MB) |

| (هالفرع) | **1.2.0**: تصليح OTA (header)، عنوان الشريط، «إلو» بدل الناقص، الكيبورد، رسائل بزر «تمام»، سبب الخطأ بفحص التحديثات، حفظ اسم الدكان لحالو، تطبيق التحديث لحالو عالرئيسية بعد الغياب |

## 12. لسّا ما انجرّب / ناقص

- ما في شي انجرّب على **تلفون حقيقي** من قبل Claude (ما في emulator بالبيئة). كل الصور من معاينة ويب.
  خصوصاً: الـ blur، النص المعدني بـ SVG، خانة رقم التلفون (`direction:'ltr'`)، وصول OTA أول مرة.
- أيقونة التطبيق لسّا أيقونة Expo الافتراضية (`assets/`).
- ما في iOS (الـ OTA path والبناء لأندرويد بس).
- آخر APK: `v1.1.0-build.5` (25 MB). **ما بيوصلو OTA** (شوف القسم 6) — لازم ينزّل APK 1.2.0 فوقو (نفس التوقيع، البيانات بتضل).
- وصول OTA أول مرة على 1.2.0 لسّا لازم ينجرّب على تلفون.

## 13. خطوات أي تعديل (بالترتيب)

1. فرع من `main` (`git fetch origin main && git checkout -B <فرع> origin/main`).
2. التعديل. بلا مكتبات native إلا إذا لازم (وساعتها كبّر `version` + `versionCode`).
3. `npm test && npx tsc --noEmit && npx expo lint`.
4. معاينة بصرية إذا التعديل بالواجهة.
5. commit، PR، دمج بـ `main`.
6. راقب «OTA Update» (وإذا تغيّر `app.json`، «Build APK»).
7. حدّث هالملف.
