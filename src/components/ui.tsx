import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useColors } from '@/state/settings';
import { FONT } from '@/theme/colors';

export function T({
  children,
  size = 'body',
  muted,
  bold,
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: keyof typeof FONT;
  muted?: boolean;
  bold?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: FONT[size],
          lineHeight: Math.round(FONT[size] * 1.45),
          color: color ?? (muted ? c.textMuted : c.text),
          fontWeight: bold ? '700' : '400',
          writingDirection: 'rtl',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'debt' | 'payment' | 'whatsapp' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: string;
}) {
  const c = useColors();
  const bg: Record<ButtonVariant, string> = {
    primary: c.primary,
    secondary: c.surfaceAlt,
    debt: c.debt,
    payment: c.payment,
    whatsapp: c.whatsapp,
    danger: c.danger,
  };
  const fg = variant === 'secondary' ? c.text : variant === 'primary' ? c.primaryText : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg[variant], opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>
          {icon ? `${icon}  ` : ''}
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label: string; error?: string | null }) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <T size="small" muted bold>
        {label}
      </T>
      <TextInput
        placeholderTextColor={c.textMuted}
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: c.surface,
            borderColor: error ? c.danger : c.border,
            color: c.text,
          },
          props.multiline && { minHeight: 90, textAlignVertical: 'top' },
          style,
        ]}
      />
      {error ? (
        <T size="small" color={c.danger}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

/** أزرار اختيار متلاصقة (مثلاً: ليرة / دولار) */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: c.primary }]}
          >
            <Text
              style={{
                fontSize: FONT.body,
                fontWeight: '700',
                color: active ? c.primaryText : c.text,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: FONT.body,
    fontWeight: '700',
  },
  field: {
    gap: 6,
  },
  input: {
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: FONT.large,
    writingDirection: 'rtl',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
});
