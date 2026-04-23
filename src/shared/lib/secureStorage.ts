import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// ============================================================
// SecureStorage adapter para supabase-js
// ============================================================
// Cauce maneja datos sensibles de salud mental (Ley 19.628). El JWT
// de Supabase, guardado en AsyncStorage plano, puede ser extraído
// con acceso físico al device (adb backup en Android, backup sin
// cifrar en iOS). Este adapter lo migra a:
//
//   - iOS: Keychain Services (hardware-backed en devices modernos)
//   - Android: Keystore → EncryptedSharedPreferences
//
// expo-secure-store tiene una limitación: el valor máximo por key
// es ~2KB. Los JWT + refresh tokens de Supabase a veces rozan ese
// límite, así que hacemos chunking transparente: dividimos el valor
// en piezas de ~1.5KB cada una y las juntamos al leer.
//
// Fallback a AsyncStorage: en web (Expo web) y en casos raros donde
// SecureStore no está disponible, caemos a AsyncStorage — la app no
// queda rota, solo pierde el hardening. En native siempre funciona.

const CHUNK_SIZE = 1536; // bytes; deja margen sobre el límite de 2KB
const CHUNK_SUFFIX = "__chunk_count__";

/** Detecta si SecureStore está disponible (no es web). */
function isSecureStoreAvailable(): boolean {
  // SecureStore no existe en web; Platform.OS === 'web' → fallback
  if (Platform.OS === "web") return false;
  // En native, asumimos que sí. Si falla runtime, el try/catch más abajo
  // hace fallback.
  return true;
}

/** Valida que la key sea alfanumérica (SecureStore rechaza special chars). */
function sanitizeKey(key: string): string {
  // SecureStore permite [A-Za-z0-9._-]. Reemplazamos cualquier otro char.
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

async function setChunked(key: string, value: string): Promise<void> {
  const safe = sanitizeKey(key);
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  // Limpiamos posibles chunks viejos antes de escribir los nuevos,
  // por si el valor anterior tenía más piezas.
  const oldCountRaw = await SecureStore.getItemAsync(safe + CHUNK_SUFFIX);
  const oldCount = oldCountRaw ? parseInt(oldCountRaw, 10) : 0;
  if (oldCount > chunks.length) {
    for (let i = chunks.length; i < oldCount; i++) {
      await SecureStore.deleteItemAsync(`${safe}_${i}`);
    }
  }
  for (let i = 0; i < chunks.length; i++) {
    // i < chunks.length, así que chunks[i] siempre está definido.
    // TS con noUncheckedIndexedAccess no lo infiere, por eso el `!`.
    await SecureStore.setItemAsync(`${safe}_${i}`, chunks[i]!);
  }
  await SecureStore.setItemAsync(safe + CHUNK_SUFFIX, String(chunks.length));
}

async function getChunked(key: string): Promise<string | null> {
  const safe = sanitizeKey(key);
  const countRaw = await SecureStore.getItemAsync(safe + CHUNK_SUFFIX);
  if (!countRaw) return null;
  const count = parseInt(countRaw, 10);
  if (!Number.isFinite(count) || count <= 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(`${safe}_${i}`);
    if (part === null) {
      // Un chunk faltante invalida todo el valor — lo limpiamos y retornamos null.
      await removeChunked(key);
      return null;
    }
    parts.push(part);
  }
  return parts.join("");
}

async function removeChunked(key: string): Promise<void> {
  const safe = sanitizeKey(key);
  const countRaw = await SecureStore.getItemAsync(safe + CHUNK_SUFFIX);
  if (!countRaw) return;
  const count = parseInt(countRaw, 10);
  for (let i = 0; i < count; i++) {
    await SecureStore.deleteItemAsync(`${safe}_${i}`);
  }
  await SecureStore.deleteItemAsync(safe + CHUNK_SUFFIX);
}

/**
 * Storage adapter compatible con supabase-js:
 * - getItem(key) → string | null
 * - setItem(key, value) → void
 * - removeItem(key) → void
 *
 * Usa SecureStore (Keychain/Keystore) en iOS/Android,
 * AsyncStorage en web y como fallback si SecureStore falla.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!isSecureStoreAvailable()) {
      return AsyncStorage.getItem(key);
    }
    try {
      return await getChunked(key);
    } catch (err) {
      console.warn("SecureStore getItem failed, falling back:", err);
      return AsyncStorage.getItem(key);
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!isSecureStoreAvailable()) {
      return AsyncStorage.setItem(key, value);
    }
    try {
      await setChunked(key, value);
    } catch (err) {
      console.warn("SecureStore setItem failed, falling back:", err);
      await AsyncStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (!isSecureStoreAvailable()) {
      return AsyncStorage.removeItem(key);
    }
    try {
      await removeChunked(key);
    } catch (err) {
      console.warn("SecureStore removeItem failed, falling back:", err);
      await AsyncStorage.removeItem(key);
    }
  },
};

/**
 * Migración one-shot: si hay una session vieja en AsyncStorage (pre-SEC-3),
 * la copiamos a SecureStore y la borramos del storage plano. Se llama una
 * sola vez al startup desde supabase.ts.
 *
 * Idempotente: si no hay nada que migrar, no hace nada.
 */
export async function migrateSessionFromAsyncStorage(
  supabaseKey: string
): Promise<void> {
  if (!isSecureStoreAvailable()) return;
  try {
    const legacy = await AsyncStorage.getItem(supabaseKey);
    if (!legacy) return;
    // Solo migramos si SecureStore todavía no tiene la sesión
    const existing = await getChunked(supabaseKey);
    if (existing) {
      // Ya existe en secure store: borramos la copia legacy y listo
      await AsyncStorage.removeItem(supabaseKey);
      return;
    }
    await setChunked(supabaseKey, legacy);
    await AsyncStorage.removeItem(supabaseKey);
  } catch (err) {
    // No bloqueamos arranque por un fallo de migración
    console.warn("session migration failed:", err);
  }
}
