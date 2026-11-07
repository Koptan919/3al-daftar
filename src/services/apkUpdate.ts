import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Updates from 'expo-updates';
import { useSyncExternalStore } from 'react';
import { Linking, Platform } from 'react-native';

import { isNewerVersion, parseRelease, RELEASES_API, type ApkRelease } from '@/lib/apkUpdate';

/**
 * تحديث الـ APK من جوّا التطبيق (للتعديلات native اللي ما بتوصل بـ OTA):
 * بيفحص آخر GitHub Release، وإذا في نسخة أحدث من المركّبة بيعرض «نزّلها»،
 * بينزّل الـ APK لمجلد الكاش وبيفتح شاشة التثبيت تبع أندرويد (المستخدم بيكبس «تثبيت»).
 * إذا فشل شي، بيفتح رابط التحميل بالمتصفح كحل احتياطي.
 */
export type ApkStatus = 'idle' | 'checking' | 'none' | 'available' | 'downloading' | 'installing' | 'error';

export interface ApkState {
  status: ApkStatus;
  release: ApkRelease | null;
  progress: number; // 0..1
  error: string | null;
}

let state: ApkState = { status: 'idle', release: null, progress: 0, error: null };
const listeners = new Set<() => void>();
let lastCheck = 0;

function set(patch: Partial<ApkState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useApkUpdate(): ApkState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

/** رقم نسخة الـ APK المركّب (مش رقم تحديث OTA) */
export function installedVersion(): string {
  return Updates.runtimeVersion ?? Constants.expoConfig?.version ?? '0';
}

/** فحص آخر نسخة APK. التلقائي مرة كل 6 ساعات كحد أقصى (GitHub بيسمح 60 طلب بالساعة) */
export async function checkApkUpdate(manual = false): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (state.status === 'checking' || state.status === 'downloading' || state.status === 'installing') return;
  if (!manual && Date.now() - lastCheck < 6 * 3600_000) return;
  set({ status: 'checking', error: null });
  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const release = parseRelease(await res.json());
    lastCheck = Date.now();
    if (release && isNewerVersion(release.version, installedVersion())) set({ status: 'available', release });
    else set({ status: 'none', release: null });
  } catch (e) {
    set({ status: state.release ? 'available' : 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

/** بينزّل الـ APK وبيفتح شاشة التثبيت */
export async function downloadAndInstall(): Promise<void> {
  const release = state.release;
  if (!release || state.status === 'downloading') return;
  set({ status: 'downloading', progress: 0, error: null });
  try {
    const file = new File(Paths.cache, `daftar-${release.version}.apk`);
    if (file.exists) file.delete();
    await File.downloadFileAsync(release.url, file, {
      idempotent: true,
      onProgress: ({ bytesWritten, totalBytes }) => {
        const total = totalBytes > 0 ? totalBytes : release.size;
        if (total > 0) set({ progress: Math.min(1, bytesWritten / total) });
      },
    });
    set({ status: 'installing', progress: 1 });
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: file.contentUri,
      type: 'application/vnd.android.package-archive',
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    });
    // رجع من شاشة التثبيت بلا ما يثبّت: منخلّي الزر حتى يجرّب كمان مرة
    set({ status: 'available' });
  } catch (e) {
    set({ status: 'available', error: e instanceof Error ? e.message : String(e) });
    // حل احتياطي: التنزيل بالمتصفح
    Linking.openURL(release.url).catch(() => {});
  }
}
