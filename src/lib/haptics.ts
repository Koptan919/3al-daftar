import * as Haptics from 'expo-haptics';

/**
 * اهتزازات خفيفة (expo-haptics). بتنطفى من الإعدادات («الاهتزازات»).
 * كل الاستدعاءات بلا await وما بتكسر شي إذا الجهاز ما بيدعمها.
 */
let enabled = true;

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

function safe(p: () => Promise<void>): void {
  if (!enabled) return;
  try {
    p().catch(() => {});
  } catch {
    // الجهاز ما بيدعم الاهتزاز: عادي
  }
}

export const haptic = {
  /** كبسة زر عادية */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** زر رئيسي (حفظ، دين، دفعة) */
  press: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** تغيير اختيار (عملة، فلتر، مفتاح) */
  select: () => safe(() => Haptics.selectionAsync()),
  /** نجح (انحفظ، تحديث جاهز) */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** تنبيه (تأكيد حذف) */
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** غلط (رمز غلط، مبلغ غلط) */
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** كبسة طويلة */
  long: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
};
