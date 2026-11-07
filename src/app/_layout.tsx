import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { I18nManager, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LockScreen } from '@/components/LockScreen';
import { useAutoUpdateCheck } from '@/components/UpdateBanner';
import { DATABASE_NAME, migrateDb } from '@/db/schema';
import { LockProvider, useLock } from '@/state/lock';
import { SettingsProvider, useSettings } from '@/state/settings';
import { FONT } from '@/theme/colors';

// الإعداد الأساسي بيصير بـ app.json (expo-localization → forcesRTL).
// هيدا احتياط لـ Expo Go، بيمشي من الفتحة التانية.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

function AppStack() {
  const { colors, isDark, loaded } = useSettings();
  const lock = useLock();
  useAutoUpdateCheck();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  if (!loaded || !lock.ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: FONT.large, fontWeight: '700' },
          headerTitleAlign: 'center',
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'دفتر الدين' }} />
        <Stack.Screen name="customer/new" options={{ title: 'زبون جديد' }} />
        <Stack.Screen name="customer/[id]" options={{ title: '' }} />
        <Stack.Screen name="transaction/new" options={{ title: '' }} />
        <Stack.Screen name="settings" options={{ title: 'الإعدادات' }} />
        <Stack.Screen name="pin-setup" options={{ title: 'رمز القفل' }} />
      </Stack>
      {lock.locked && (
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
          <LockScreen />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDb}>
        <SettingsProvider>
          <LockProvider>
            <AppStack />
          </LockProvider>
        </SettingsProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
