import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Delete, Fingerprint, ICON } from '@/components/icons';
import { family, T } from '@/components/ui';
import { useColors } from '@/state/settings';
import { fx } from '@/theme/colors';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'] as const;

/** لوحة أرقام كبيرة لإدخال الـ PIN */
export function PinPad({
  value,
  onChange,
  maxLength = 6,
  onBiometric,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  onBiometric?: () => void;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 18, alignItems: 'center' }}>
      <View style={styles.dots}>
        {Array.from({ length: Math.max(4, value.length) }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { borderColor: c.debt, backgroundColor: i < value.length ? c.debt : 'transparent' }]}
          />
        ))}
      </View>
      {/* الأرقام بتبقى من الشمال لليمين متل لوحة التلفون */}
      <View style={[styles.grid, { direction: 'ltr' }]}>
        {KEYS.map((k) => {
          if (k === 'bio' && !onBiometric) return <View key={k} style={styles.key} />;
          return (
            <Pressable
              key={k}
              accessibilityLabel={k === 'del' ? 'امسح' : k === 'bio' ? 'البصمة' : k}
              onPress={() => {
                if (k === 'del') onChange(value.slice(0, -1));
                else if (k === 'bio') onBiometric?.();
                else if (value.length < maxLength) onChange(value + k);
              }}
              style={({ pressed }) => [
                styles.key,
                {
                  backgroundColor: pressed ? 'rgba(255,255,255,0.14)' : c.surfaceAlt,
                  borderColor: c.border,
                  boxShadow: fx.btnShadow,
                },
              ]}
            >
              {k === 'del' ? (
                <Delete size={26} strokeWidth={ICON.strokeWidth} color={c.titanium} />
              ) : k === 'bio' ? (
                <Fingerprint size={28} strokeWidth={ICON.strokeWidth} color={c.debt} />
              ) : (
                <Text style={[{ fontSize: 30, color: c.text }, family('bold')]}>{k}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function PinTitle({
  title,
  subtitle,
  error,
}: {
  title: string;
  subtitle?: string;
  error?: string | null;
}) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', gap: 6, minHeight: 70 }}>
      <T size="title" heavy title>
        {title}
      </T>
      {error ? <T color={c.danger}>{error}</T> : subtitle ? <T muted>{subtitle}</T> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 14, direction: 'ltr' },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  grid: { width: 300, flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'center' },
  key: { width: 85, height: 72, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
