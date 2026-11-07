import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, View } from 'react-native';

import { Button, T } from '@/components/ui';
import { useColors } from '@/state/settings';

/**
 * فحص التحديثات (expo-updates، من فرع ota على GitHub):
 * - كل ما ينفتح التطبيق أو يرجع من الخلفية، منفحص إذا في تحديث وبننزّلو بالخلفية.
 * - التحديث المنزّل بيتطبّق لحالو بالفتحة الجاية (متل ما بيعمل expo-updates)،
 *   أو فوراً إذا كبس المستخدم «تحديث الآن».
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

  const run = useCallback(async () => {
    // ما منفحص أكتر من مرة كل دقيقتين
    if (busy.current || Date.now() - lastCheck.current < 120_000) return;
    busy.current = true;
    lastCheck.current = Date.now();
    try {
      await checkAndFetchUpdate();
    } catch {
      // بلا إنترنت أو السيرفر مش ردّان: عادي، التطبيق بيكمّل شغل
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    run();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') run();
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
          بيتطبّق لحالو بالفتحة الجاية
        </T>
      </View>
      <Button title="تحديث الآن" onPress={() => Updates.reloadAsync()} style={{ minHeight: 46 }} />
    </View>
  );
}
