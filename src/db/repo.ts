import type { SQLiteDatabase } from 'expo-sqlite';

import {
  aggregateBalances,
  computeBalance,
  type Balance,
  type Currency,
  type SumRow,
  type TxType,
} from '@/lib/money';

export interface Customer {
  id: number;
  name: string;
  phone: string;
  note: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  customer_id: number;
  type: TxType;
  amount: number;
  currency: Currency;
  date: string; // YYYY-MM-DD
  note: string;
  created_at: string;
}

export interface CustomerWithBalance extends Customer {
  balance: Balance;
}

// ───────────── الزبائن ─────────────

export async function listCustomersWithBalances(db: SQLiteDatabase): Promise<CustomerWithBalance[]> {
  const customers = await db.getAllAsync<Customer>(
    'SELECT * FROM customers ORDER BY name COLLATE NOCASE',
  );
  const sums = await db.getAllAsync<SumRow>(
    `SELECT customer_id, currency, type, SUM(amount) AS total
     FROM transactions GROUP BY customer_id, currency, type`,
  );
  const balances = aggregateBalances(sums);
  return customers.map((c) => ({ ...c, balance: balances.get(c.id) ?? { LBP: 0, USD: 0 } }));
}

export async function getCustomer(db: SQLiteDatabase, id: number): Promise<Customer | null> {
  return db.getFirstAsync<Customer>('SELECT * FROM customers WHERE id = ?', id);
}

export interface CustomerInput {
  name: string;
  phone: string;
  note: string;
}

export async function addCustomer(db: SQLiteDatabase, c: CustomerInput): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO customers (name, phone, note) VALUES (?, ?, ?)',
    c.name.trim(),
    c.phone.trim(),
    c.note.trim(),
  );
  return r.lastInsertRowId;
}

export async function updateCustomer(db: SQLiteDatabase, id: number, c: CustomerInput): Promise<void> {
  await db.runAsync(
    'UPDATE customers SET name = ?, phone = ?, note = ? WHERE id = ?',
    c.name.trim(),
    c.phone.trim(),
    c.note.trim(),
    id,
  );
}

export async function deleteCustomer(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transactions WHERE customer_id = ?', id);
    await db.runAsync('DELETE FROM customers WHERE id = ?', id);
  });
}

// ───────────── الحركات ─────────────

export async function listTransactions(db: SQLiteDatabase, customerId: number): Promise<Transaction[]> {
  return db.getAllAsync<Transaction>(
    'SELECT * FROM transactions WHERE customer_id = ? ORDER BY date DESC, id DESC',
    customerId,
  );
}

export async function getCustomerBalance(db: SQLiteDatabase, customerId: number): Promise<Balance> {
  return computeBalance(await listTransactions(db, customerId));
}

export interface TransactionInput {
  customer_id: number;
  type: TxType;
  amount: number;
  currency: Currency;
  date: string;
  note: string;
}

export async function addTransaction(db: SQLiteDatabase, t: TransactionInput): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO transactions (customer_id, type, amount, currency, date, note) VALUES (?, ?, ?, ?, ?, ?)',
    t.customer_id,
    t.type,
    t.amount,
    t.currency,
    t.date,
    t.note.trim(),
  );
  return r.lastInsertRowId;
}

export async function deleteTransaction(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
}

// ───────────── الإعدادات ─────────────

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function getAllSettings(db: SQLiteDatabase): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

// ───────────── النسخ الاحتياطي ─────────────

export async function exportAll(db: SQLiteDatabase) {
  const customers = await db.getAllAsync<Customer>('SELECT * FROM customers ORDER BY id');
  const transactions = await db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY id');
  const settings = await getAllSettings(db);
  return { customers, transactions, settings };
}

/** بيمسح كل البيانات الحالية وبيحط محلها بيانات النسخة الاحتياطية (كلو أو ولا شي) */
export async function replaceAll(
  db: SQLiteDatabase,
  data: { customers: Customer[]; transactions: Transaction[]; settings: Record<string, string> },
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM transactions');
    await txn.runAsync('DELETE FROM customers');
    for (const c of data.customers) {
      await txn.runAsync(
        'INSERT INTO customers (id, name, phone, note, created_at) VALUES (?, ?, ?, ?, ?)',
        c.id,
        c.name,
        c.phone,
        c.note,
        c.created_at,
      );
    }
    for (const t of data.transactions) {
      await txn.runAsync(
        'INSERT INTO transactions (id, customer_id, type, amount, currency, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        t.id,
        t.customer_id,
        t.type,
        t.amount,
        t.currency,
        t.date,
        t.note,
        t.created_at,
      );
    }
    for (const [k, v] of Object.entries(data.settings)) {
      await txn.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        k,
        v,
      );
    }
  });
}
