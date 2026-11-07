/**
 * منطق صافي لتحديث الـ APK من جوّا التطبيق (للتعديلات اللي ما بتوصل بـ OTA:
 * أيقونة، مكتبة native...). بيقرا آخر GitHub Release وبيقارن رقم النسخة.
 */
export const RELEASES_API = 'https://api.github.com/repos/Koptan919/3al-daftar/releases/latest';
export const APK_ASSET_NAME = 'daftar-al-dayn.apk';

export interface ApkRelease {
  version: string;
  url: string;
  size: number;
}

/** «v1.5.0-build.12» ← «1.5.0» */
export function versionFromTag(tag: string): string | null {
  const m = /^v?(\d+(?:\.\d+){0,2})(?:[-+].*)?$/.exec(tag.trim());
  return m ? m[1] : null;
}

/** مقارنة رقم برقم (1.10.0 أحدث من 1.9.9) */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = candidate.split('.').map((n) => Number(n) || 0);
  const b = current.split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(a.length, b.length, 3); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

interface GitHubRelease {
  tag_name?: unknown;
  draft?: unknown;
  prerelease?: unknown;
  assets?: { name?: unknown; browser_download_url?: unknown; size?: unknown }[];
}

/** بيطلّع النسخة ورابط الـ APK من رد GitHub، أو null إذا الرد مش مفهوم */
export function parseRelease(json: unknown): ApkRelease | null {
  if (!json || typeof json !== 'object') return null;
  const r = json as GitHubRelease;
  if (r.draft || r.prerelease || typeof r.tag_name !== 'string') return null;
  const version = versionFromTag(r.tag_name);
  const asset = r.assets?.find((a) => a.name === APK_ASSET_NAME);
  if (!version || !asset || typeof asset.browser_download_url !== 'string') return null;
  if (!asset.browser_download_url.startsWith('https://github.com/')) return null;
  return { version, url: asset.browser_download_url, size: typeof asset.size === 'number' ? asset.size : 0 };
}

/** «25.3 MB» */
export function formatSize(bytes: number): string {
  if (!bytes) return '';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
