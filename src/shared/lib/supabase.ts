import { env } from "@/src/shared/env";
import type { Database } from "@/src/types/database.types";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import {
  secureStorage,
  migrateSessionFromAsyncStorage,
} from "./secureStorage";

// Storage key que usa supabase-js internamente: `sb-<project-ref>-auth-token`.
// Lo derivamos del host (https://<ref>.supabase.co) para la migración one-shot
// desde AsyncStorage → SecureStore (ver secureStorage.ts).
function deriveStorageKey(url: string): string | null {
  try {
    const host = new URL(url).host; // <ref>.supabase.co
    const ref = host.split(".")[0];
    if (!ref) return null;
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

export const supabase = createClient<Database>(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      // SEC-3 H1: JWT guardado en Keychain/Keystore, no en AsyncStorage plano.
      // Protege datos sensibles de salud mental (Ley 19.628) de extracción por
      // backup o acceso físico al device.
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Migración one-shot: si hay sesión vieja en AsyncStorage de versiones previas,
// la movemos a SecureStore al arranque. Fire-and-forget: si falla, el usuario
// simplemente tendrá que volver a loguearse, no bloqueamos la app.
const storageKey = deriveStorageKey(env.EXPO_PUBLIC_SUPABASE_URL);
if (storageKey) {
  void migrateSessionFromAsyncStorage(storageKey);
}
