import { normalizeDigits } from './money';

/**
 * تطبيع النص العربي للبحث: بيشيل التشكيل، وبيوحّد الألف والياء والتاء المربوطة،
 * حتى «احمد» تلاقي «أحمد» و«فاطمه» تلاقي «فاطمة».
 */
export function normalizeArabic(s: string): string {
  return normalizeDigits(s)
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '') // تشكيل وتطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

export function digitsOnly(s: string): string {
  return normalizeDigits(s).replace(/\D/g, '');
}

export function matchesCustomer(query: string, c: { name: string; phone: string }): boolean {
  const q = normalizeArabic(query);
  if (!q) return true;
  if (normalizeArabic(c.name).includes(q)) return true;
  const qd = digitsOnly(query);
  if (qd.length >= 2) {
    const pd = digitsOnly(c.phone);
    // بيلاقي الرقم سواء انكتب 03xxxxxx أو 9613xxxxxx
    if (pd.includes(qd) || pd.includes(qd.replace(/^0+/, ''))) return true;
  }
  return false;
}
