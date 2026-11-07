import { describeBalance, type Balance } from './money';
import { digitsOnly } from './search';

/**
 * تحويل رقم لبناني لصيغة دولية بلا + (متل ما بدو wa.me):
 * 03 123 456 → 9613123456 ، 70123456 → 96170123456 ، +961 3 123456 → 9613123456
 * بيرجّع null إذا ما في رقم.
 */
export function toWhatsAppNumber(phone: string): string | null {
  let d = digitsOnly(phone);
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('961')) return d;
  if (d.length === 8 && d.startsWith('0')) return '961' + d.slice(1); // 03xxxxxx
  if (d.length === 8 || d.length === 7) return '961' + d; // 70xxxxxx أو 3xxxxxx
  return d; // رقم دولي تاني
}

/** بس الأجزاء اللي فعلاً على الزبون */
export function owedPart(b: Balance): Balance {
  return { LBP: Math.max(0, b.LBP), USD: Math.max(0, b.USD) };
}

export function reminderMessage(customerName: string, balance: Balance, shopName?: string): string {
  const owed = owedPart(balance);
  const from = shopName?.trim() ? ` من ${shopName.trim()}` : '';
  return (
    `مرحبا ${customerName}،\n` +
    `تذكير لطيف${from}: المبلغ اللي عليك هو ${describeBalance(owed)}.\n` +
    `شكراً إلك 🙏`
  );
}

export function whatsappUrl(phone: string, message: string): string {
  const num = toWhatsAppNumber(phone);
  const text = encodeURIComponent(message);
  return num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
}
