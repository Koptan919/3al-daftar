import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { getAllSettings, setSetting } from '@/db/repo';
import type { Currency } from '@/lib/money';
import { dark, light, type Palette } from '@/theme/colors';

export type ThemePref = 'system' | 'light' | 'dark';

export interface AppSettings {
  /** كم ليرة بالدولار، أو null إذا ما انحط بعد */
  exchangeRate: number | null;
  /** العملة اللي بينعرض فيها المجموع المحوّل كمرجع */
  referenceCurrency: Currency;
  themePref: ThemePref;
  /** اسم الدكان، بيطلع بكشف الحساب ورسالة واتساب */
  shopName: string;
}

const DEFAULTS: AppSettings = {
  exchangeRate: null,
  referenceCurrency: 'USD',
  themePref: 'system',
  shopName: '',
};

interface Ctx extends AppSettings {
  loaded: boolean;
  colors: Palette;
  isDark: boolean;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<Ctx | null>(null);

function parse(raw: Record<string, string>): AppSettings {
  const rate = Number(raw.exchangeRate);
  return {
    exchangeRate: Number.isFinite(rate) && rate > 0 ? rate : null,
    referenceCurrency: raw.referenceCurrency === 'LBP' ? 'LBP' : 'USD',
    themePref: raw.themePref === 'light' || raw.themePref === 'dark' ? raw.themePref : 'system',
    shopName: raw.shopName ?? '',
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const system = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    setSettings(parse(await getAllSettings(db)));
    setLoaded(true);
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    getAllSettings(db).then((raw) => {
      if (cancelled) return;
      setSettings(parse(raw));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      for (const [k, v] of Object.entries(patch)) {
        await setSetting(db, k, v == null ? '' : String(v));
      }
      setSettings((s) => ({ ...s, ...patch }));
    },
    [db],
  );

  const isDark = settings.themePref === 'system' ? system === 'dark' : settings.themePref === 'dark';

  const value = useMemo<Ctx>(
    () => ({ ...settings, loaded, isDark, colors: isDark ? dark : light, update, reload }),
    [settings, loaded, isDark, update, reload],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings outside SettingsProvider');
  return ctx;
}

export function useColors(): Palette {
  return useSettings().colors;
}
