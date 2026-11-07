import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, migrateDb } from '@/db/schema';
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

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  if (!loaded) return null;

  return (
    <>
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
        <Stack.Screen name="customer/new" options={{ title: 'زبون جديد', presentation: 'modal' }} />
        <Stack.Screen name="customer/[id]" options={{ title: '' }} />
        <Stack.Screen name="transaction/new" options={{ title: '', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'الإعدادات' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDb}>
        <SettingsProvider>
          <AppStack />
        </SettingsProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
