import type { Currency, TxType } from './money';

export const BACKUP_APP_ID = 'daftar-al-dayn';
export const BACKUP_VERSION = 1;

export interface BackupCustomer {
  id: number;
  name: string;
  phone: string;
  note: string;
  created_at: string;
}

export interface BackupTransaction {
  id: number;
  customer_id: number;
  type: TxType;
  amount: number;
  currency: Currency;
  date: string;
  note: string;
  created_at: string;
}

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  version: number;
  exportedAt: string;
  customers: BackupCustomer[];
  transactions: BackupTransaction[];
  settings: Record<string, string>;
}

/** إعدادات ما لازم تنتقل مع النسخة الاحتياطية */
const PRIVATE_SETTINGS = new Set<string>([]);

export function makeBackup(
  customers: BackupCustomer[],
  transactions: BackupTransaction[],
  settings: Record<string, string>,
  now: Date = new Date(),
): BackupFile {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    customers,
    transactions,
    settings: Object.fromEntries(Object.entries(settings).filter(([k]) => !PRIVATE_SETTINGS.has(k))),
  };
}

export class BackupError extends Error {}

const isStr = (v: unknown): v is string => typeof v === 'string';
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** التحقق من ملف نسخة احتياطية قبل الاستيراد. بيرمي BackupError برسالة عربية. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('الملف مش JSON صالح');
  }
  if (typeof data !== 'object' || data === null) throw new BackupError('الملف فاضي أو غلط');
  const d = data as Record<string, unknown>;
  if (d.app !== BACKUP_APP_ID) throw new BackupError('هيدا الملف مش نسخة احتياطية من دفتر الدين');
  if (!isInt(d.version) || d.version > BACKUP_VERSION) {
    throw new BackupError('نسخة الملف أحدث من التطبيق. حدّث التطبيق أول.');
  }
  if (!Array.isArray(d.customers) || !Array.isArray(d.transactions)) {
    throw new BackupError('الملف ناقص');
  }

  const customerIds = new Set<number>();
  const customers: BackupCustomer[] = d.customers.map((raw, i) => {
    const c = raw as Record<string, unknown>;
    if (!isInt(c.id) || !isStr(c.name) || !c.name.trim()) {
      throw new BackupError(`زبون رقم ${i + 1} ناقص`);
    }
    if (customerIds.has(c.id)) throw new BackupError(`زبون مكرر (${c.id})`);
    customerIds.add(c.id);
    return {
      id: c.id,
      name: c.name,
      phone: isStr(c.phone) ? c.phone : '',
      note: isStr(c.note) ? c.note : '',
      created_at: isStr(c.created_at) ? c.created_at : new Date().toISOString(),
    };
  });

  const transactions: BackupTransaction[] = d.transactions.map((raw, i) => {
    const t = raw as Record<string, unknown>;
    const ok =
      isInt(t.id) &&
      isInt(t.customer_id) &&
      customerIds.has(t.customer_id) &&
      (t.type === 'debt' || t.type === 'payment') &&
      isInt(t.amount) &&
      t.amount > 0 &&
      (t.currency === 'LBP' || t.currency === 'USD') &&
      isStr(t.date) &&
      /^\d{4}-\d{2}-\d{2}$/.test(t.date);
    if (!ok) throw new BackupError(`حركة رقم ${i + 1} فيها خطأ`);
    return {
      id: t.id as number,
      customer_id: t.customer_id as number,
      type: t.type as TxType,
      amount: t.amount as number,
      currency: t.currency as Currency,
      date: t.date as string,
      note: isStr(t.note) ? t.note : '',
      created_at: isStr(t.created_at) ? t.created_at : new Date().toISOString(),
    };
  });

  const settings: Record<string, string> = {};
  if (d.settings && typeof d.settings === 'object') {
    for (const [k, v] of Object.entries(d.settings as Record<string, unknown>)) {
      if (isStr(v) && !PRIVATE_SETTINGS.has(k)) settings[k] = v;
    }
  }

  return {
    app: BACKUP_APP_ID,
    version: d.version,
    exportedAt: isStr(d.exportedAt) ? d.exportedAt : '',
    customers,
    transactions,
    settings,
  };
}

export function backupFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `daftar-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}
