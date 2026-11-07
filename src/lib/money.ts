/**
 * منطق المبالغ والأرصدة والتحويل بين العملات.
 *
 * كل المبالغ بتنحفظ كأعداد صحيحة بأصغر وحدة:
 * - الليرة (LBP): ليرة كاملة (ما في كسور)
 * - الدولار (USD): سنت (1 دولار = 100 سنت)
 * هيك منتجنّب أخطاء الفاصلة العشرية بالجمع والطرح.
 */

export type Currency = 'LBP' | 'USD';
export type TxType = 'debt' | 'payment';

export const CURRENCIES: Currency[] = ['LBP', 'USD'];

export const CURRENCY_LABEL: Record<Currency, string> = {
  LBP: 'ليرة',
  USD: 'دولار',
};

/** كم وحدة صغيرة بالوحدة الكبيرة */
const MINOR_FACTOR: Record<Currency, number> = { LBP: 1, USD: 100 };

/** رصيد زبون: موجب = الزبون عليه، سالب = إلو عند الدكان */
export interface Balance {
  LBP: number; // ليرة
  USD: number; // سنت
}

export const ZERO_BALANCE: Balance = Object.freeze({ LBP: 0, USD: 0 }) as Balance;

export interface TxLike {
  type: TxType;
  currency: Currency;
  amount: number; // بالوحدة الصغيرة، دايماً موجب
}

/** تحويل رقم عادي (مثلاً 12.5 دولار) لوحدة صغيرة (1250 سنت) */
export function toMinor(amount: number, currency: Currency): number {
  return Math.round(amount * MINOR_FACTOR[currency]);
}

/** تحويل من وحدة صغيرة لرقم عادي */
export function fromMinor(minor: number, currency: Currency): number {
  return minor / MINOR_FACTOR[currency];
}

const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

/** تحويل الأرقام العربية/الفارسية لأرقام لاتينية */
export function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS[d] ?? d);
}

/**
 * قراءة مبلغ كتبه المستخدم. بيقبل أرقام عربية، فواصل الآلاف، والفاصلة العشرية
 * (نقطة أو «٫»). بيرجّع null إذا المبلغ مش صالح أو صفر أو سالب.
 */
export function parseAmount(input: string, currency: Currency): number | null {
  let s = normalizeDigits(input).trim();
  s = s.replace(/[\s,،٬']/g, '').replace(/٫/g, '.');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const value = Number(s);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (currency === 'LBP' && !Number.isInteger(value)) {
    // الليرة ما فيها كسور: منقرّب لأقرب ليرة
    return Math.round(value) > 0 ? Math.round(value) : null;
  }
  const minor = toMinor(value, currency);
  return minor > 0 ? minor : null;
}

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** تنسيق رقم بأصغر وحدة: 150000000 LBP → "150,000,000" و 1250 USD → "12.50" */
export function formatNumber(minor: number, currency: Currency): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  let out: string;
  if (currency === 'USD') {
    const whole = Math.floor(abs / 100);
    const cents = abs % 100;
    out = groupThousands(String(whole)) + (cents ? '.' + String(cents).padStart(2, '0') : '');
  } else {
    out = groupThousands(String(abs));
  }
  return negative ? '-' + out : out;
}

/** تنسيق مع رمز العملة: "150,000 ل.ل" أو "$12.50" */
export function formatMoney(minor: number, currency: Currency): string {
  const num = formatNumber(minor, currency);
  return currency === 'USD' ? `$${num}` : `${num} ل.ل`;
}

/** حساب رصيد زبون من حركاته */
export function computeBalance(txs: readonly TxLike[]): Balance {
  const b: Balance = { LBP: 0, USD: 0 };
  for (const t of txs) {
    b[t.currency] += t.type === 'debt' ? t.amount : -t.amount;
  }
  return b;
}

export function addBalances(a: Balance, b: Balance): Balance {
  return { LBP: a.LBP + b.LBP, USD: a.USD + b.USD };
}

/** صف راجع من SQL: مجموع حسب الزبون والعملة والنوع */
export interface SumRow {
  customer_id: number;
  currency: Currency;
  type: TxType;
  total: number;
}

/** تجميع صفوف SQL لخريطة أرصدة لكل زبون */
export function aggregateBalances(rows: readonly SumRow[]): Map<number, Balance> {
  const map = new Map<number, Balance>();
  for (const r of rows) {
    const b = map.get(r.customer_id) ?? { LBP: 0, USD: 0 };
    b[r.currency] += r.type === 'debt' ? r.total : -r.total;
    map.set(r.customer_id, b);
  }
  return map;
}

/**
 * مجموع الديون بالدكان: بس الأرصدة الموجبة (يعني اللي على الزبائن).
 * إذا زبون إلو رصيد سالب (دافع زيادة) ما منطرحه من ديون غيره.
 */
export function totalReceivable(balances: Iterable<Balance>): Balance {
  const t: Balance = { LBP: 0, USD: 0 };
  for (const b of balances) {
    if (b.LBP > 0) t.LBP += b.LBP;
    if (b.USD > 0) t.USD += b.USD;
  }
  return t;
}

/**
 * تحويل رصيد (ليرة + دولار) لعملة وحدة كمرجع.
 * rate = كم ليرة بالدولار الواحد (مثلاً 89500).
 * بيرجّع المجموع بأصغر وحدة للعملة المطلوبة، أو null إذا ما في سعر صرف صالح.
 */
export function convertBalance(b: Balance, rate: number, target: Currency): number | null {
  if (!Number.isFinite(rate) || rate <= 0) return null;
  if (target === 'LBP') {
    // سنت → ليرة: (سنت / 100) × السعر
    return b.LBP + Math.round((b.USD * rate) / 100);
  }
  // ليرة → سنت: (ليرة / السعر) × 100
  return b.USD + Math.round((b.LBP * 100) / rate);
}

export function isZeroBalance(b: Balance): boolean {
  return b.LBP === 0 && b.USD === 0;
}

/** وصف الرصيد كنص: "عليه $12.50 و 150,000 ل.ل" */
export function describeBalance(b: Balance): string {
  const parts: string[] = [];
  if (b.USD !== 0) parts.push(formatMoney(Math.abs(b.USD), 'USD'));
  if (b.LBP !== 0) parts.push(formatMoney(Math.abs(b.LBP), 'LBP'));
  return parts.join(' و ');
}
