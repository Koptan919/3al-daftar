/** قدّيش لازم يغيب المستخدم حتى نطبّق التحديث لحالنا (نفس مدة القفل) */
export const APPLY_AFTER_AWAY_MS = 60_000;

/**
 * منطبّق التحديث المنزّل هلّق (لما يرجع المستخدم للتطبيق)؟
 * بس إذا في تحديث جاهز، وهو عالشاشة الرئيسية (مش بنص نموذج)، وغاب دقيقة أو أكتر.
 */
export function shouldApplyOnResume(opts: { pending: boolean; pathname: string; awayMs: number }): boolean {
  return opts.pending && opts.pathname === '/' && opts.awayMs >= APPLY_AFTER_AWAY_MS;
}
