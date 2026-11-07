/**
 * ثيم "Titanium Gray × Burgundy Liquid Glass" (من KOPT X — docs/THEME.md).
 * داكن دايماً. العنابي بس للفعل المهم والحالة النشطة،
 * والأخضر/الأحمر للمعنى (دفعة / خطأ) بس.
 *
 * ملاحظة: ما في blur حقيقي (بدو مكتبة native)، فالطبقات العائمة
 * بتستعمل خلفية "وضع الأداء" (.lite) شبه المعتمة.
 */

export interface Palette {
  background: string;
  surface: string; // خلفية الحقول والأسطح الصغيرة
  surfaceAlt: string; // زر ثانوي / مفاتيح
  border: string;
  text: string;
  textMuted: string;
  titanium: string; // عناوين
  primary: string; // عنابي (لون صلب، للحالات اللي ما بتقبل تدرّج)
  primaryText: string;
  debt: string; // دين (عليه) — عنابي فاتح للنص
  debtSoft: string;
  payment: string; // دفعة — أخضر
  paymentSoft: string;
  whatsapp: string;
  danger: string;
  header: string; // الشريط العلوي (زجاج عائم بوضع الأداء)
}

export const colors: Palette = {
  background: '#0b0c0f',
  surface: 'rgba(255,255,255,0.05)',
  surfaceAlt: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.1)',
  text: '#f4f4f6',
  textMuted: '#a6aab3',
  titanium: '#cfd3da',
  primary: '#9b2546',
  primaryText: '#ffffff',
  debt: '#e8829f',
  debtSoft: 'rgba(201,65,106,0.16)',
  payment: '#42d293',
  paymentSoft: 'rgba(66,210,147,0.12)',
  whatsapp: '#25D366',
  danger: '#ff6178',
  header: 'rgba(18,19,24,0.97)',
};

/** تدرّجات وظلال (RN 0.76+ بيدعم backgroundImage و boxShadow بلا مكتبات) */
export const fx = {
  burg: 'linear-gradient(140deg, #c9416a 0%, #9b2546 45%, #6e1730 100%)',
  glass:
    'linear-gradient(150deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.012) 55%, rgba(255,255,255,0.03) 100%)',
  /** الإضاءة الخلفية (.amb) — بتنحط على خلفية كل شاشة */
  ambient: [
    'radial-gradient(60% 40% at 92% -4%, rgba(155,37,70,0.55), transparent 70%)',
    'radial-gradient(55% 38% at -6% 30%, rgba(130,28,58,0.4), transparent 72%)',
    'radial-gradient(70% 45% at 100% 78%, rgba(170,178,192,0.18), transparent 70%)',
    'radial-gradient(60% 40% at 0% 105%, rgba(155,37,70,0.3), transparent 70%)',
    'linear-gradient(180deg, #0d0e12, #0a0b0e)',
  ].join(', '),
  cardShadow:
    'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.03), 0 6px 18px rgba(0,0,0,0.22)',
  btnShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
  burgShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), 0 6px 16px rgba(110,23,48,0.45)',
  burgBorder: 'rgba(232,130,159,0.35)',
};

export const RADIUS = { card: 20, button: 15, icon: 14, sheet: 28, pill: 99 };

export const FONT = {
  small: 15,
  body: 18,
  large: 22,
  title: 26,
  huge: 32,
};

/** خط Tajawal — عأندرويد لازم اسم عائلة لكل وزن */
export const FAMILY = {
  regular: 'Tajawal_400Regular',
  medium: 'Tajawal_500Medium',
  bold: 'Tajawal_700Bold',
  heavy: 'Tajawal_800ExtraBold',
};
