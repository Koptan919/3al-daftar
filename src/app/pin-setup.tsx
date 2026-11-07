import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { GlassScreen } from '@/components/Glass';
import { PinPad, PinTitle } from '@/components/PinPad';
import { haptic } from '@/lib/haptics';
import { useLock } from '@/state/lock';

const LENGTH = 4;

export default function PinSetup() {
  const lock = useLock();
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onChange(v: string) {
    setPin(v);
    setError(null);
    if (v.length < LENGTH) return;
    if (first == null) {
      setFirst(v);
      setPin('');
      return;
    }
    if (v !== first) {
      haptic.error();
      setError('الرمزين مش متل بعض، عيد من الأول');
      setFirst(null);
      setPin('');
      return;
    }
    await lock.setPin(v);
    haptic.success();
    router.back();
  }

  return (
    <GlassScreen title="رمز القفل">
    <View style={{ flex: 1, justifyContent: 'center', gap: 24, alignItems: 'center', padding: 16 }}>
      <PinTitle
        title={first == null ? 'اختار رمز من 4 أرقام' : 'عيد كتابة الرمز'}
        subtitle="ما تنساه! إذا نسيته لازم تمسح التطبيق"
        error={error}
      />
      <PinPad value={pin} onChange={onChange} maxLength={LENGTH} />
    </View>
    </GlassScreen>
  );
}
