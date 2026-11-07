import { BlurTargetView, BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useId, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowRight, ICON } from '@/components/icons';
import { useSettings } from '@/state/settings';
import { FAMILY, fx } from '@/theme/colors';

export const HEADER_HEIGHT = 60;

type RNView = ComponentRef<typeof View>;

/**
 * blur حقيقي بس على أندرويد 12+ (SDK 31). عالأقدم، أو إذا وضع الأداء مفعّل،
 * منستعمل خلفية شبه معتمة (.lite بثيم KOPT X) حتى يضل النص مقروء.
 */
function useRealBlur(): boolean {
  const { perfMode } = useSettings();
  if (perfMode) return false;
  if (Platform.OS === 'android') return Number(Platform.Version) >= 31;
  return true;
}

/** طبقة زجاج عائم (.gl): blur(22px) فوق المحتوى */
export function Glass({
  target,
  style,
  children,
}: {
  target: RefObject<RNView | null>;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const real = useRealBlur();
  if (!real) {
    return <View style={[{ backgroundColor: 'rgba(22,23,28,0.97)' }, style]}>{children}</View>;
  }
  return (
    <BlurView
      blurTarget={target}
      blurMethod="dimezisBlurViewSdk31Plus"
      intensity={70}
      tint="dark"
      style={[{ overflow: 'hidden', backgroundColor: 'rgba(20,21,26,0.34)' }, style]}
    >
      {children}
    </BlurView>
  );
}

const GRADIENTS = {
  metal: [
    ['0', '#eef0f3'],
    ['0.4', '#b9bec6'],
    ['1', '#7f858e'],
  ],
  burg: [
    ['0', '#e8829f'],
    ['0.45', '#c9416a'],
    ['1', '#9b2546'],
  ],
} as const;

/** نص بتدرّج (معدني للعناوين، عنابي للتمييز) — بديل background-clip:text */
export function GradientText({
  text,
  size,
  kind = 'metal',
}: {
  text: string;
  size: number;
  kind?: keyof typeof GRADIENTS;
}) {
  const id = 'g' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const fallback = kind === 'metal' ? '#cfd3da' : '#e8829f';
  return (
    <View>
      {/* نص حقيقي للقياس والوصول (accessibility)؛ بيصير شفاف لما يجهز الـ SVG */}
      <Text
        onLayout={(e) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        style={{ fontSize: size, fontFamily: FAMILY.heavy, color: box ? 'transparent' : fallback }}
      >
        {text}
      </Text>
      {box && (
        <Svg style={StyleSheet.absoluteFill} width={box.width} height={box.height} pointerEvents="none">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              {GRADIENTS[kind].map(([offset, color]) => (
                <Stop key={offset} offset={offset} stopColor={color} />
              ))}
            </LinearGradient>
          </Defs>
          <SvgText
            fill={`url(#${id})`}
            fontSize={size}
            fontFamily={FAMILY.heavy}
            x={box.width / 2}
            y={box.height / 2}
            textAnchor="middle"
            alignmentBaseline="central"
          >
            {text}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}

/**
 * شاشة بثيم KOPT X: إضاءة خلفية + شريط علوي زجاجي + شريط سفلي زجاجي اختياري.
 * المحتوى لازم يزيد padding من فوق بـ useGlassTop().
 */
export function GlassScreen({
  title,
  titleNode,
  right,
  bottom,
  back = true,
  children,
}: {
  title?: string;
  titleNode?: ReactNode;
  right?: ReactNode;
  bottom?: ReactNode;
  back?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const target = useRef<RNView>(null);
  const { colors } = useSettings();
  const canBack = back && router.canGoBack();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <BlurTargetView ref={target} style={styles.target}>
        {children}
      </BlurTargetView>

      <Glass target={target} style={[styles.header, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT }]}>
        <View style={styles.headerRow}>
          <View style={styles.side}>
            {canBack && (
              <Pressable accessibilityLabel="رجوع" hitSlop={14} onPress={() => router.back()} style={styles.iconBtn}>
                {/* بالعربي الرجوع لليمين */}
                <ArrowRight size={ICON.size} strokeWidth={ICON.strokeWidth} color={colors.titanium} />
              </Pressable>
            )}
          </View>
          <View style={styles.titleWrap}>{titleNode ?? (title ? <GradientText text={title} size={21} /> : null)}</View>
          <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
        </View>
      </Glass>

      {bottom && (
        <Glass target={target} style={[styles.bottom, { paddingBottom: 14 + insets.bottom }]}>
          <View style={styles.bottomRow}>{bottom}</View>
        </Glass>
      )}
    </View>
  );
}

/** المسافة اللي لازم يبلّش منها المحتوى تحت الشريط العلوي */
export function useGlassTop(): number {
  return useSafeAreaInsets().top + HEADER_HEIGHT;
}

const styles = StyleSheet.create({
  target: {
    flex: 1,
    backgroundColor: '#0b0c0f',
    backgroundImage: fx.ambient,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.38)',
  },
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  side: {
    width: 72,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.17)',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
