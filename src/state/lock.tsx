import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

// الـ PIN بينحفظ بـ SecureStore (مش بقاعدة البيانات) حتى ما يطلع بالنسخة الاحتياطية
const K_HASH = 'lock_pin_hash';
const K_SALT = 'lock_pin_salt';
const K_BIO = 'lock_biometric';
const K_LEN = 'lock_pin_length';

/** بعد كم ثانية بالخلفية بيرجع ينقفل التطبيق */
const RELOCK_AFTER_MS = 60_000;

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

interface LockCtx {
  ready: boolean;
  locked: boolean;
  pinEnabled: boolean;
  pinLength: number;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  setBiometric: (on: boolean) => Promise<void>;
}

const Ctx = createContext<LockCtx | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinLength, setPinLength] = useState(4);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const [hash, bio, len, hasHw, enrolled] = await Promise.all([
        SecureStore.getItemAsync(K_HASH),
        SecureStore.getItemAsync(K_BIO),
        SecureStore.getItemAsync(K_LEN),
        LocalAuthentication.hasHardwareAsync().catch(() => false),
        LocalAuthentication.isEnrolledAsync().catch(() => false),
      ]);
      setPinEnabled(!!hash);
      setPinLength(Number(len) || 4);
      setBiometricEnabled(!!hash && bio === '1');
      setBiometricAvailable(hasHw && enrolled);
      setLocked(!!hash);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundAt.current = Date.now();
      } else if (state === 'active' && backgroundAt.current != null) {
        const away = Date.now() - backgroundAt.current;
        backgroundAt.current = null;
        if (pinEnabled && away > RELOCK_AFTER_MS) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [pinEnabled]);

  const unlockWithPin = useCallback(async (pin: string) => {
    const [hash, salt] = await Promise.all([SecureStore.getItemAsync(K_HASH), SecureStore.getItemAsync(K_SALT)]);
    if (!hash || !salt) {
      setLocked(false);
      return true;
    }
    const ok = (await hashPin(pin, salt)) === hash;
    if (ok) setLocked(false);
    return ok;
  }, []);

  const unlockWithBiometric = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'افتح دفتر الدين',
      cancelLabel: 'استعمل الرمز',
      disableDeviceFallback: true,
    });
    if (res.success) setLocked(false);
    return res.success;
  }, []);

  const setPin = useCallback(async (pin: string) => {
    if (!isValidPin(pin)) throw new Error('invalid pin');
    const salt = Crypto.randomUUID();
    await SecureStore.setItemAsync(K_SALT, salt);
    await SecureStore.setItemAsync(K_HASH, await hashPin(pin, salt));
    await SecureStore.setItemAsync(K_LEN, String(pin.length));
    setPinLength(pin.length);
    setPinEnabled(true);
  }, []);

  const removePin = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(K_HASH),
      SecureStore.deleteItemAsync(K_SALT),
      SecureStore.deleteItemAsync(K_BIO),
      SecureStore.deleteItemAsync(K_LEN),
    ]);
    setPinEnabled(false);
    setBiometricEnabled(false);
  }, []);

  const setBiometric = useCallback(async (on: boolean) => {
    if (on) {
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'تأكيد البصمة' });
      if (!res.success) return;
    }
    await SecureStore.setItemAsync(K_BIO, on ? '1' : '0');
    setBiometricEnabled(on);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      locked,
      pinEnabled,
      pinLength,
      biometricEnabled,
      biometricAvailable,
      unlockWithPin,
      unlockWithBiometric,
      setPin,
      removePin,
      setBiometric,
    }),
    [ready, locked, pinEnabled, pinLength, biometricEnabled, biometricAvailable, unlockWithPin, unlockWithBiometric, setPin, removePin, setBiometric],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLock(): LockCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLock outside LockProvider');
  return c;
}
