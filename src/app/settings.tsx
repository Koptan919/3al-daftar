import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Updates from 'expo-updates';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassScreen, useGlassTop } from '@/components/Glass';
import { ArrowLeftRight, Download, Gauge, HardDriveDownload, Lock, Store } from '@/components/icons';
import { Button, Card, Field, IconBox, Row, Segmented, T, type IconType } from '@/components/ui';
import { checkAndFetchUpdate } from '@/components/UpdateBanner';
import { BackupError } from '@/lib/backup';
import { formatMoney, parseAmount, type Currency } from '@/lib/money';
import { exportBackup, pickBackup, restoreBackup } from '@/services/backup';
import { useLock } from '@/state/lock';
import { useSettings } from '@/state/settings';
import { notify } from '@/lib/notify';

function Section({ title, icon, kind = 'tn', children }: { title: string; icon: IconType; kind?: 'g' | 'o' | 'r' | 'tn'; children: ReactNode }) {
  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ alignItems: 'center', gap: 12 }}>
        <IconBox kind={kind} icon={icon} />
        <T size="large" bold title>
          {title}
        </T>
      </Row>
      {children}
    </Card>
  );
}

export default function Settings() {
  const db = useSQLiteContext();
  const settings = useSettings();
  const lock = useLock();
  const insets = useSafeAreaInsets();
  const top = useGlassTop();
  const { colors } = settings;

  const [shopName, setShopName] = useState(settings.shopName);
  const [rateText, setRateText] = useState(settings.exchangeRate ? String(settings.exchangeRate) : '');
  const [rateError, setRateError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'export' | 'import' | 'update'>(null);

  function saveShopName() {
    if (shopName.trim() !== settings.shopName) settings.update({ shopName: shopName.trim() });
  }

  // إذا طلع من الشاشة والكيبورد مفتوح، onEndEditing ما بيشتغل دايماً، فمنحفظ لحالنا بعد ما يوقف كتابة
  useEffect(() => {
    const t = setTimeout(saveShopName, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopName]);

  async function saveRate() {
    if (!rateText.trim()) {
      await settings.update({ exchangeRate: null });
      setRateError(null);
      return;
    }
    const rate = parseAmount(rateText, 'LBP');
    if (rate == null) {
      setRateError('اكتب رقم صحيح، مثلاً 89500');
      return;
    }
    setRateError(null);
    setRateText(String(rate));
    await settings.update({ exchangeRate: rate });
    notify('انحفظ ✓', `سعر الصرف: ${formatMoney(rate, 'LBP')} للدولار`);
  }

  async function doExport() {
    setBusy('export');
    try {
      await exportBackup(db);
    } catch (e) {
      notify('ما زبط التصدير', String(e));
    } finally {
      setBusy(null);
    }
  }

  async function doImport() {
    setBusy('import');
    try {
      const backup = await pickBackup();
      if (!backup) return;
      Alert.alert(
        'استرجاع نسخة احتياطية؟',
        `الملف فيه ${backup.customers.length} زبون و${backup.transactions.length} حركة.\n\n⚠️ كل البيانات الحالية رح تنمحى وتنحط محلها بيانات الملف.`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'استرجع',
            style: 'destructive',
            onPress: async () => {
              try {
                await restoreBackup(db, backup);
                await settings.reload();
                notify('تم ✓', 'رجعت البيانات من النسخة الاحتياطية');
              } catch (e) {
                notify('ما زبط الاسترجاع', String(e));
              }
            },
          },
        ],
      );
    } catch (e) {
      notify('ما زبط الاستيراد', e instanceof BackupError ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function checkUpdates() {
    setBusy('update');
    try {
      const r = await checkAndFetchUpdate();
      if (r === 'disabled') notify('التحديثات مش مفعّلة بهالنسخة (نسخة تطوير)');
      else if (r === 'none') notify('عندك آخر نسخة ✓');
      else
        Alert.alert('نزل تحديث جديد', 'بدك تطبّقو هلّق؟', [
          { text: 'بعدين', style: 'cancel' },
          { text: 'تحديث الآن', onPress: () => Updates.reloadAsync() },
        ]);
    } catch (e) {
      // منبيّن سبب الخطأ الحقيقي حتى نعرف شو المشكلة إذا تكرّرت
      notify('ما قدرنا نفحص', `تأكد من الإنترنت وجرّب كمان مرة.\n\n${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  function togglePin(on: boolean) {
    if (on) {
      router.push('/pin-setup');
      return;
    }
    Alert.alert('إلغاء القفل؟', 'التطبيق رح ينفتح بلا رمز.', [
      { text: 'لا', style: 'cancel' },
      { text: 'ألغِ القفل', style: 'destructive', onPress: () => lock.removePin() },
    ]);
  }

  return (
    <GlassScreen title="الإعدادات">
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingTop: top + 16, gap: 16, paddingBottom: 32 + insets.bottom }}
      keyboardShouldPersistTaps="handled"
    >
      <Section title="الدكان" icon={Store}>
        <Field
          label="اسم الدكان (بيطلع بالكشف ورسالة واتساب)"
          value={shopName}
          onChangeText={setShopName}
          onEndEditing={saveShopName}
          placeholder="مثلاً: دكان أبو أحمد"
        />
      </Section>

      <Section title="سعر الصرف" icon={ArrowLeftRight} kind="o">
        <T muted size="small">
          كم ليرة بالدولار. بيُستعمل بس لعرض المجموع بعملة وحدة كمرجع — الأرصدة بتضل منفصلة.
        </T>
        <Field
          label="ليرة لكل 1 دولار"
          value={rateText}
          onChangeText={(t) => {
            setRateText(t);
            setRateError(null);
          }}
          error={rateError}
          keyboardType="number-pad"
          placeholder="89500"
        />
        <View style={{ gap: 6 }}>
          <T size="small" muted bold>
            اعرض المجموع المحوّل بـ
          </T>
          <Segmented<Currency>
            options={[
              { value: 'USD', label: 'دولار' },
              { value: 'LBP', label: 'ليرة' },
            ]}
            value={settings.referenceCurrency}
            onChange={(v) => settings.update({ referenceCurrency: v })}
          />
        </View>
        <Button title="احفظ سعر الصرف" onPress={saveRate} />
      </Section>

      <Section title="الحماية" icon={Lock} kind="r">
        <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <T>قفل برمز (PIN)</T>
          <Switch
            value={lock.pinEnabled}
            onValueChange={togglePin}
            trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.14)' }}
            thumbColor="#f4f4f6"
          />
        </Row>
        {lock.pinEnabled && (
          <>
            <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T>فتح بالبصمة</T>
                {!lock.biometricAvailable && (
                  <T size="small" muted>
                    ما في بصمة مسجّلة على هالتلفون
                  </T>
                )}
              </View>
              <Switch
                value={lock.biometricEnabled}
                disabled={!lock.biometricAvailable}
                onValueChange={(v) => lock.setBiometric(v)}
                trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.14)' }}
            thumbColor="#f4f4f6"
              />
            </Row>
            <Button title="غيّر الرمز" variant="secondary" onPress={() => router.push('/pin-setup')} />
          </>
        )}
      </Section>

      <Section title="نسخة احتياطية" icon={HardDriveDownload} kind="g">
        <T muted size="small">
          صدّر كل الزبائن والحركات كملف JSON وابعتو لحالك على واتساب أو Google Drive. اعملها كل فترة!
        </T>
        <Button title="تصدير نسخة احتياطية" onPress={doExport} loading={busy === 'export'} />
        <Button
          title="استيراد من ملف"
          variant="secondary"
          onPress={doImport}
          loading={busy === 'import'}
        />
      </Section>

      <Section title="وضع الأداء" icon={Gauge}>
        <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T>بلا تأثير الزجاج (blur)</T>
            <T size="small" muted>
              فعّلو إذا التلفون بطيء. عأندرويد 11 وأقدم بيشتغل لحالو.
            </T>
          </View>
          <Switch
            value={settings.perfMode}
            onValueChange={(v) => settings.update({ perfMode: v })}
            trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.14)' }}
            thumbColor="#f4f4f6"
          />
        </Row>
      </Section>

      <Section title="التحديثات" icon={Download}>
        <T muted size="small">
          التطبيق بيفحص التحديثات لحالو كل ما ينفتح، وبينزّلها بالخلفية.
        </T>
        <Button
          title="افحص التحديثات هلّق"
          variant="secondary"
          onPress={checkUpdates}
          loading={busy === 'update'}
        />
        <T size="small" muted>
          النسخة {Constants.expoConfig?.version ?? '?'}
          {Updates.channel ? ` · القناة ${Updates.channel}` : ''}
          {Updates.isEmbeddedLaunch || !Updates.updateId ? ' · الأصلية (بلا تحديث)' : ` · تحديث ${Updates.updateId.slice(0, 8)}`}
        </T>
      </Section>
    </ScrollView>
    </GlassScreen>
  );
}
