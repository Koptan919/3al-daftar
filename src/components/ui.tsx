import type { ComponentType, ReactNode } from 'react';
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


import { ICON } from '@/components/icons';
import { haptic } from '@/lib/haptics';
import { useColors } from '@/state/settings';
import { colors as C, FAMILY, FONT, fx, RADIUS } from '@/theme/colors';

/** أيقونة Lucide أو أي أيقونة بنفس الـ props (متل شعار واتساب) */
export type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/** اسم عائلة الخط حسب الوزن (عأندرويد fontWeight ما بيشتغل مع خطوط مخصّصة) */
export function family(weight: 'regular' | 'medium' | 'bold' | 'heavy' = 'regular'): TextStyle {
  return { fontFamily: FAMILY[weight] };
}

export function T({
  children,
  size = 'body',
  muted,
  bold,
  heavy,
  title,
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: keyof typeof FONT;
  muted?: boolean;
  bold?: boolean;
  /** وزن 800 للأرقام الكبيرة */
  heavy?: boolean;
  /** عنوان بلون التيتانيوم */
  title?: boolean;
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
          color: color ?? (title ? c.titanium : muted ? c.textMuted : c.text),
          writingDirection: 'rtl',
        },
        family(heavy ? 'heavy' : bold ? 'bold' : 'medium'),
        style,
      ]}
    >
      {children}
    </Text>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'debt' | 'payment' | 'whatsapp' | 'danger';

/** شكل كل نوع زر: العنابي للفعل الرئيسي بس، والباقي زجاج ملوّن حسب المعنى */
const BUTTON: Record<ButtonVariant, { box: ViewStyle; fg: string }> = {
  primary: {
    box: { backgroundImage: fx.burg, borderColor: fx.burgBorder, boxShadow: fx.burgShadow },
    fg: '#ffffff',
  },
  debt: {
    box: { backgroundImage: fx.burg, borderColor: fx.burgBorder, boxShadow: fx.burgShadow },
    fg: '#ffffff',
  },
  secondary: {
    box: { backgroundColor: C.surfaceAlt, borderColor: C.border, boxShadow: fx.btnShadow },
    fg: C.text,
  },
  payment: {
    box: { backgroundColor: C.paymentSoft, borderColor: 'rgba(66,210,147,0.35)', boxShadow: fx.btnShadow },
    fg: C.payment,
  },
  whatsapp: {
    box: { backgroundColor: 'rgba(37,211,102,0.14)', borderColor: 'rgba(37,211,102,0.4)', boxShadow: fx.btnShadow },
    fg: C.whatsapp,
  },
  danger: {
    box: { backgroundColor: 'rgba(255,97,120,0.14)', borderColor: 'rgba(255,97,120,0.4)', boxShadow: fx.btnShadow },
    fg: C.danger,
  },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
  haptics = true,
}: {
  title: string;
  onPress: () => void;
  /** اهتزاز مع الكبسة (افتراضياً إي) */
  haptics?: boolean;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /** أيقونة Lucide (بتاخد لون الزر) */
  icon?: IconType;
}) {
  const { box, fg } = BUTTON[variant];
  const Icon = icon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        if (haptics) (variant === 'secondary' ? haptic.tap : haptic.press)();
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        box,
        { opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonRow}>
          {Icon && <Icon size={ICON.size} strokeWidth={ICON.strokeWidth} color={fg} />}
          <Text style={[styles.buttonText, family('bold'), { color: fg }]}>{title}</Text>
        </View>
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
        placeholderTextColor={'#767a84'}
        selectionColor={c.debt}
        {...props}
        style={[
          styles.input,
          family('medium'),
          {
            backgroundColor: 'rgba(0,0,0,0.28)',
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

/** بطاقة زجاج ثابت: تدرّج شفاف + حافة 1px + لمعة علوية (بلا blur، للأداء) */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** أزرار اختيار متلاصقة (مثلاً: ليرة / دولار) — المختار عنابي */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (o.value !== value) {
                haptic.select();
                onChange(o.value);
              }
            }}
            style={[styles.segment, active && { backgroundImage: fx.burg, boxShadow: fx.burgShadow }]}
          >
            <Text style={[{ fontSize: FONT.body, color: active ? '#ffffff' : c.textMuted }, family('bold')]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type ThKind = 'g' | 'o' | 'r' | 'tn';
const TH: Record<ThKind, { bg: string; fg: string }> = {
  g: { bg: 'rgba(66,210,147,0.13)', fg: '#42d293' },
  o: { bg: 'rgba(243,171,85,0.14)', fg: '#f3ab55' },
  r: { bg: 'rgba(201,65,106,0.2)', fg: '#e8829f' },
  tn: { bg: 'rgba(207,211,218,0.1)', fg: '#cfd3da' },
};

/** مربع الأيقونة الملوّن (.th) — اللون حسب المعنى */
export function IconBox({ kind = 'tn', icon, text }: { kind?: ThKind; icon?: IconType; text?: string }) {
  const { bg, fg } = TH[kind];
  const Icon = icon;
  return (
    <View style={[styles.th, { backgroundColor: bg }]}>
      {Icon ? (
        <Icon size={ICON.size} strokeWidth={ICON.strokeWidth} color={fg} />
      ) : (
        <Text style={[{ fontSize: 19, color: fg }, family('heavy')]}>{text}</Text>
      )}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: FONT.body,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  field: {
    gap: 6,
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: RADIUS.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: FONT.large,
    writingDirection: 'rtl',
  },
  card: {
    backgroundImage: fx.glass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.card,
    boxShadow: fx.cardShadow,
    padding: 16,
    gap: 8,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderRadius: 13,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    minHeight: 50,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  th: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.icon,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
