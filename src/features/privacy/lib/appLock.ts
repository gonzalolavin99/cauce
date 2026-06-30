import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import * as ScreenCapture from "expo-screen-capture";
import { Platform } from "react-native";

// ============================================================
// Bloqueo de app + privacidad de pantalla (mejora 1.7)
// ============================================================
// Datos de salud mental visibles con acceso físico al teléfono.
// Dos protecciones opt-in, solo nativas (en web son no-op):
//
//  - App lock: Face ID / huella / PIN del sistema al abrir la app
//    o tras volver de background después de RELOCK_AFTER_MS.
//  - Privacidad de pantalla: FLAG_SECURE en Android (bloquea
//    screenshots y la miniatura en recientes); en iOS es best-effort
//    (bloquea grabación/mirroring, no el screenshot puntual).
//
// Las preferencias son POR DISPOSITIVO (AsyncStorage local, no DB):
// que el teléfono pida huella no es un atributo de la cuenta.

const LOCK_KEY = "cauce-app-lock-enabled";
const SCREEN_PRIVACY_KEY = "cauce-screen-privacy-enabled";

/** Tiempo en background tras el cual se vuelve a pedir biometría. */
export const RELOCK_AFTER_MS = 2 * 60 * 1000;

const isNative = Platform.OS !== "web";

/** Hay hardware biométrico/PIN configurado en el dispositivo. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNative) return false;
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) return false;
    // isEnrolledAsync: hay huella/cara/PIN registrado. Sin enrolar,
    // authenticateAsync fallaría siempre y dejaría al usuario fuera.
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

export async function isAppLockEnabled(): Promise<boolean> {
  if (!isNative) return false;
  return (await AsyncStorage.getItem(LOCK_KEY)) === "1";
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  if (enabled) await AsyncStorage.setItem(LOCK_KEY, "1");
  else await AsyncStorage.removeItem(LOCK_KEY);
}

/**
 * Pide biometría (o PIN del sistema como fallback). `false` si el usuario
 * cancela o falla; nunca lanza.
 */
export async function authenticate(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Desbloquea Cauce",
      cancelLabel: "Cancelar",
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function isScreenPrivacyEnabled(): Promise<boolean> {
  if (!isNative) return false;
  return (await AsyncStorage.getItem(SCREEN_PRIVACY_KEY)) === "1";
}

/** Activa/desactiva FLAG_SECURE y persiste la preferencia. */
export async function setScreenPrivacyEnabled(enabled: boolean): Promise<void> {
  if (enabled) await AsyncStorage.setItem(SCREEN_PRIVACY_KEY, "1");
  else await AsyncStorage.removeItem(SCREEN_PRIVACY_KEY);
  await applyScreenPrivacy(enabled);
}

/** Aplica el estado actual (llamar al arrancar y al cambiar el toggle). */
export async function applyScreenPrivacy(enabled?: boolean): Promise<void> {
  if (!isNative) return;
  try {
    const on = enabled ?? (await isScreenPrivacyEnabled());
    if (on) await ScreenCapture.preventScreenCaptureAsync();
    else await ScreenCapture.allowScreenCaptureAsync();
  } catch {
    // expo-screen-capture no disponible (p. ej. web build raro): no-op
  }
}
