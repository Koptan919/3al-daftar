import { usePathname } from 'expo-router';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, View } from 'react-native';

import { Button, T } from '@/components/ui';
import { formatSize } from '@/lib/apkUpdate';
import { haptic } from '@/lib/haptics';
import { shouldApplyOnResume } from '@/lib/updates';
import { checkApkUpdate, downloadAndInstall, useApkUpdate } from '@/services/apkUpdate';
import { useColors } from '@/state/settings';

/**
 * فحص وتطبيق التحديثات (expo-updates، من فرع ota على GitHub) — متل KOPT X:
 * - كل ما ينفتح التطبيق أو يرجع من الخلفية، منفحص إذا في تحديث وبننزّلو بالخلفية
 *   (مرة كل دقيقتين كحد أقصى؛ إذا فشل، منرجع منجرّب بالمرة الجاية بلا انتظار).
 * - التحديث المنزّل بيتطبّق لحالو:
 *     • بالفتحة الجاية للتطبيق (expo-updates)، أو
 *     • لما يرجع المستخدم للتطبيق بعد ما غاب دقيقة أو أكتر وهو عالشاشة الرئيسية
 *       (متل whenIdle بـ KOPT X: ما منعيد التحميل وهو بنص نموذج عم يكتب فيه)، أو
 *     • فوراً إذا كبس «تحديث الآن».
 * - إذا التحديث الجديد معطوب وما فتح، expo-updates بيرجع للنسخة اللي قبلو لحالو.
 * - النسخ ما بتختلط: كل APK بياخد بس تحديثات نفس رقم النسخة (runtimeVersion).
 */
export async function checkAndFetchUpdate(): Promise<'none' | 'downloaded' | 'disabled'> {
  if (__DEV__ || !Updates.isEnabled) return 'disabled';
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return 'none';
  const res = await Updates.fetchUpdateAsync();
  return res.isNew ? 'downloaded' : 'none';
}

export function useAutoUpdateCheck() {
  const busy = useRef(false);
  const lastCheck = useRef(0);
  const backgroundAt = useRef<number | null>(null);
  const pathname = usePathname();
  const { isUpdatePending } = Updates.useUpdates();
  const latest = useRef({ pathname, isUpdatePending });
  useEffect(() => {
    latest.current = { pathname, isUpdatePending };
  }, [pathname, isUpdatePending]);

  const run = useCallback(async () => {
    if (busy.current || Date.now() - lastCheck.current < 120_000) return;
    busy.current = true;
    lastCheck.current = Date.now();
    checkApkUpdate();
    try {
      await checkAndFetchUpdate();
    } catch {
      // بلا إنترنت أو GitHub مش ردّان: عادي، التطبيق بيكمّل، ومنجرّب كمان مرة بالرجعة الجاية
      lastCheck.current = 0;
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    run();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') {
        backgroundAt.current = Date.now();
        return;
      }
      if (s !== 'active') return;
      const awayMs = backgroundAt.current == null ? 0 : Date.now() - backgroundAt.current;
      backgroundAt.current = null;
      if (shouldApplyOnResume({ pending: latest.current.isUpdatePending, pathname: latest.current.pathname, awayMs })) {
        Updates.reloadAsync().catch(() => run());
      } else {
        run();
      }
    });
    return () => sub.remove();
  }, [run]);
}

/** شريط بيطلع لما يكون في تحديث منزّل وجاهز */
export function UpdateBanner() {
  const c = useColors();
  const { isUpdatePending } = Updates.useUpdates();

  if (!isUpdatePending) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 16,
        backgroundColor: c.paymentSoft,
      }}
    >
      <View style={{ flex: 1 }}>
        <T bold>في تحديث جديد جاهز</T>
        <T size="small" muted>
          بيتطبّق لحالو بالفتحة الجاية، أو كبوس «تحديث الآن»
        </T>
      </View>
      <Button title="تحديث الآن" onPress={() => Updates.reloadAsync()} style={{ minHeight: 46 }} />
    </View>
  );
}

/**
 * شريط «نسخة جديدة من التطبيق» (APK): للتعديلات اللي ما بتوصل بالتحديث التلقائي.
 * كبسة وحدة بتنزّل الـ APK وبتفتح شاشة التثبيت.
 */
export function ApkUpdateBanner() {
  const c = useColors();
  const apk = useApkUpdate();
  if (!apk.release || (apk.status !== 'available' && apk.status !== 'downloading' && apk.status !== 'installing')) {
    return null;
  }
  const downloading = apk.status === 'downloading';
  return (
    <View
      style={{
        gap: 10,
        padding: 14,
        borderRadius: 16,
        backgroundColor: 'rgba(155,37,70,0.22)',
        borderWidth: 1,
        borderColor: 'rgba(232,130,159,0.3)',
      }}
    >
      <View>
        <T bold>نسخة جديدة من التطبيق ({apk.release.version})</T>
        <T size="small" muted>
          {downloading
            ? `عم ينزّل… ${Math.round(apk.progress * 100)}%`
            : apk.status === 'installing'
              ? 'كبوس «تثبيت» بالشاشة اللي طلعت'
              : `كبسة وحدة بتنزّلها وبتثبّتها. بياناتك بتضل. ${formatSize(apk.release.size)}`}
        </T>
        {apk.error ? (
          <T size="small" color={c.danger}>
            ما زبط التنزيل من هون، فتحنالك الرابط بالمتصفح ({apk.error})
          </T>
        ) : null}
      </View>
      {downloading && (
        <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(apk.progress * 100)}%`, height: 6, backgroundColor: c.debt }} />
        </View>
      )}
      <Button
        title={downloading ? 'عم ينزّل…' : 'نزّلها وثبّتها'}
        loading={downloading}
        onPress={() => {
          haptic.press();
          downloadAndInstall();
        }}
        haptics={false}
      />
    </View>
  );
}
