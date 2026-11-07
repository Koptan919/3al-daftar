import { formatDate, todayISO } from './date';
import { convertBalance, formatMoney, type Balance, type Currency, type TxType } from './money';

export interface StatementTx {
  type: TxType;
  amount: number;
  currency: Currency;
  date: string;
  note: string;
}

export interface StatementInput {
  shopName: string;
  customerName: string;
  phone: string;
  transactions: StatementTx[];
  exchangeRate: number | null;
  referenceCurrency: Currency;
  generatedOn?: string;
}

export interface StatementRow extends StatementTx {
  running: Balance;
}

/** ترتيب الحركات من الأقدم للأحدث مع الرصيد التراكمي لكل عملة */
export function buildStatementRows(txs: readonly StatementTx[]): StatementRow[] {
  const sorted = [...txs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const running: Balance = { LBP: 0, USD: 0 };
  return sorted.map((t) => {
    running[t.currency] += t.type === 'debt' ? t.amount : -t.amount;
    return { ...t, running: { ...running } };
  });
}

function balanceLabel(amount: number, currency: Currency): string {
  if (amount === 0) return `${formatMoney(0, currency)} (خالص)`;
  return `${formatMoney(Math.abs(amount), currency)} ${amount > 0 ? '(عليه)' : '(إلو)'}`;
}

export function finalBalance(rows: readonly StatementRow[]): Balance {
  return rows.length ? rows[rows.length - 1].running : { LBP: 0, USD: 0 };
}

export function statementText(input: StatementInput): string {
  const rows = buildStatementRows(input.transactions);
  const bal = finalBalance(rows);
  const lines: string[] = [];
  lines.push(`كشف حساب${input.shopName ? ` — ${input.shopName}` : ''}`);
  lines.push(`الزبون: ${input.customerName}${input.phone ? ` (${input.phone})` : ''}`);
  lines.push(`التاريخ: ${formatDate(input.generatedOn ?? todayISO())}`);
  lines.push('────────────');
  if (rows.length === 0) lines.push('ما في حركات');
  for (const r of rows) {
    const kind = r.type === 'debt' ? 'دين' : 'دفعة';
    const sign = r.type === 'debt' ? '+' : '-';
    lines.push(
      `${formatDate(r.date)} | ${kind} ${sign}${formatMoney(r.amount, r.currency)}${r.note ? ` | ${r.note}` : ''}`,
    );
  }
  lines.push('────────────');
  lines.push(`الرصيد بالدولار: ${balanceLabel(bal.USD, 'USD')}`);
  lines.push(`الرصيد بالليرة: ${balanceLabel(bal.LBP, 'LBP')}`);
  const conv = input.exchangeRate ? convertBalance(bal, input.exchangeRate, input.referenceCurrency) : null;
  if (conv != null) {
    lines.push(
      `المجموع التقريبي: ${formatMoney(conv, input.referenceCurrency)} (سعر الصرف ${formatMoney(input.exchangeRate!, 'LBP')})`,
    );
  }
  return lines.join('\n');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** HTML لملف PDF (expo-print) */
export function statementHtml(input: StatementInput): string {
  const rows = buildStatementRows(input.transactions);
  const bal = finalBalance(rows);
  const conv = input.exchangeRate ? convertBalance(bal, input.exchangeRate, input.referenceCurrency) : null;
  const body = rows
    .map(
      (r) => `<tr class="${r.type}">
        <td>${formatDate(r.date)}</td>
        <td>${r.type === 'debt' ? 'دين' : 'دفعة'}</td>
        <td class="num">${r.currency === 'USD' ? (r.type === 'debt' ? '+' : '−') + formatMoney(r.amount, 'USD') : ''}</td>
        <td class="num">${r.currency === 'LBP' ? (r.type === 'debt' ? '+' : '−') + formatMoney(r.amount, 'LBP') : ''}</td>
        <td class="num">${formatMoney(r.running.USD, 'USD')}</td>
        <td class="num">${formatMoney(r.running.LBP, 'LBP')}</td>
        <td>${esc(r.note)}</td>
      </tr>`,
    )
    .join('');
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: -apple-system, 'Noto Naskh Arabic', 'Noto Sans Arabic', Tahoma, sans-serif; color: #23282B; padding: 24px; }
  h1 { margin: 0 0 4px; font-size: 24px; color: #3E6B5A; }
  .meta { color: #6B6F72; margin-bottom: 16px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border-bottom: 1px solid #DDD6C8; padding: 6px 8px; text-align: right; }
  th { background: #ECE7DC; }
  td.num { direction: ltr; text-align: left; white-space: nowrap; }
  tr.debt td:nth-child(2) { color: #B5543C; font-weight: bold; }
  tr.payment td:nth-child(2) { color: #3E7A57; font-weight: bold; }
  .total { margin-top: 18px; padding: 12px 16px; background: #F6E3DC; border-radius: 10px; font-size: 16px; }
  .total div { margin: 4px 0; }
  .ref { color: #6B6F72; font-size: 13px; }
</style></head><body>
  <h1>كشف حساب${input.shopName ? ` — ${esc(input.shopName)}` : ''}</h1>
  <div class="meta">الزبون: <b>${esc(input.customerName)}</b>${input.phone ? ` · ${esc(input.phone)}` : ''} · التاريخ: ${formatDate(input.generatedOn ?? todayISO())}</div>
  <table>
    <thead><tr><th>التاريخ</th><th>النوع</th><th>دولار</th><th>ليرة</th><th>الرصيد $</th><th>الرصيد ل.ل</th><th>ملاحظة</th></tr></thead>
    <tbody>${body || '<tr><td colspan="7">ما في حركات</td></tr>'}</tbody>
  </table>
  <div class="total">
    <div>الرصيد بالدولار: <b>${balanceLabel(bal.USD, 'USD')}</b></div>
    <div>الرصيد بالليرة: <b>${balanceLabel(bal.LBP, 'LBP')}</b></div>
    ${conv != null ? `<div class="ref">المجموع التقريبي: ${formatMoney(conv, input.referenceCurrency)} — على سعر ${formatMoney(input.exchangeRate!, 'LBP')} للدولار (للمرجع بس)</div>` : ''}
  </div>
</body></html>`;
}
