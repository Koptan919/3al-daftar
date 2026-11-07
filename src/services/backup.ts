import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { exportAll, replaceAll } from '@/db/repo';
import { backupFileName, makeBackup, parseBackup, type BackupFile } from '@/lib/backup';

/** بيكتب ملف JSON وبيفتح شاشة المشاركة (واتساب، Drive، إيميل...) */
export async function exportBackup(db: SQLiteDatabase): Promise<void> {
  const { customers, transactions, settings } = await exportAll(db);
  const backup = makeBackup(customers, transactions, settings);
  const file = new File(Paths.cache, backupFileName());
  if (file.exists) file.delete();
  file.create();
  await file.write(JSON.stringify(backup, null, 2));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'نسخة احتياطية لدفتر الدين',
    UTI: 'public.json',
  });
}

/** بيختار ملف وبيتحقق منو. بيرجّع null إذا المستخدم لغى. */
export async function pickBackup(): Promise<BackupFile | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const text = await new File(res.assets[0].uri).text();
  return parseBackup(text);
}

export async function restoreBackup(db: SQLiteDatabase, backup: BackupFile): Promise<void> {
  await replaceAll(db, backup);
}
