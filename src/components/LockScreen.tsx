import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinPad, PinTitle } from '@/components/PinPad';
import { useLock } from '@/state/lock';
import { useColors } from '@/state/settings';
import { fx } from '@/theme/colors';

export function LockScreen() {
  const c = useColors();
  const lock = useLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  // البصمة بتطلع لحالها أول ما تنفتح الشاشة
  useEffect(() => {
    if (lock.biometricEnabled && lock.biometricAvailable) lock.unlockWithBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onChange(v: string) {
    setPin(v);
    setError(null);
    if (v.length === lock.pinLength) {
      const ok = await lock.unlockWithPin(v);
      if (!ok) {
        setError('الرمز غلط، جرّب كمان مرة');
        setPin('');
      }
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background, backgroundImage: fx.ambient, justifyContent: 'center' }}>
      <View style={{ gap: 24, alignItems: 'center', padding: 16 }}>
        <PinTitle title="🔒 دفتر الدين" subtitle="اكتب الرمز لتفتح" error={error} />
        <PinPad
          value={pin}
          onChange={onChange}
          maxLength={lock.pinLength}
          onBiometric={
            lock.biometricEnabled && lock.biometricAvailable ? () => lock.unlockWithBiometric() : undefined
          }
        />
      </View>
    </SafeAreaView>
  );
}
