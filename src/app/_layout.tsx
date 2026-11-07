import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/tajawal';
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
import { FAMILY, FONT, fx } from '@/theme/colors';

// الإعداد الأساسي بيصير بـ app.json (expo-localization → forcesRTL).
// هيدا احتياط لـ Expo Go، بيمشي من الفتحة التانية.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

function AppStack() {
  const { colors, loaded } = useSettings();
  const lock = useLock();
  // الخط بينحمّل من ملفات التطبيق (بلا إنترنت). إذا فشل، منكمّل بخط النظام.
  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });
  useAutoUpdateCheck();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  if (!loaded || !lock.ready || (!fontsLoaded && !fontError)) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: colors.titanium,
          headerTitleStyle: { fontSize: FONT.large, fontFamily: fontError ? undefined : FAMILY.heavy },
          headerTitleAlign: 'center',
          // الإضاءة الخلفية (.amb): زجاج البطاقات بيبيّن فوقها
          contentStyle: { backgroundColor: colors.background, backgroundImage: fx.ambient },
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
