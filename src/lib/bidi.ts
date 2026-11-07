/**
 * أرقام التلفون فيها فراغات ("03 123 456"). جوّا نص عربي (RTL)
 * كل مجموعة أرقام بتنعرض لحالها وبيتقلب ترتيبها ("456 123 03").
 * الحل: نلفّ الرقم بـ LEFT-TO-RIGHT ISOLATE (U+2066 … U+2069)
 * حتى ينعرض كقطعة وحدة من الشمال لليمين. هيدا للعرض بس، مش للتخزين.
 */
export const LRI = '⁦';
export const PDI = '⁩';

export function ltr(text: string): string {
  return text ? `${LRI}${text}${PDI}` : text;
}
