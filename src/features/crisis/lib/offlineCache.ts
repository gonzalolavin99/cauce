// ============================================================
// Cache offline del plan de crisis
// ============================================================
//
// El plan de crisis es el dato más crítico para que funcione offline:
// si alguien está mal y sin señal, necesita poder abrir la app y ver
// su frase ancla, su contacto de confianza, lo que le ayudó antes.
//
// Estrategia: tras cada fetch exitoso lo guardamos en AsyncStorage
// junto con un timestamp. Cuando la red falla, `useCrisisPlan` cae
// a esta lectura local.
//
// Llaveado por `userId`: si cambia de cuenta, no se filtra el plan
// de otra sesión. No encriptamos en reposo (iOS/Android ya cifran el
// storage de la app por el OS), pero sí scopeamos por usuario.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CrisisPlan } from "@/src/types/database.types";

const CACHE_KEY_PREFIX = "cauce.offline.crisis_plan.";

function keyFor(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

export interface CachedCrisisPlan {
  plan: CrisisPlan | null;
  /** ISO timestamp de la última vez que se sincronizó desde el server */
  lastSyncedAt: string;
}

/**
 * Lee el plan guardado localmente, si existe.
 * Devuelve null si no hay cache o si el JSON está corrupto.
 */
export async function readCachedPlan(
  userId: string
): Promise<CachedCrisisPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCrisisPlan;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.lastSyncedAt !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Escribe el plan en cache con timestamp actual.
 * Si `plan` es null, también lo guardamos (para reflejar "no hay plan").
 */
export async function writeCachedPlan(
  userId: string,
  plan: CrisisPlan | null
): Promise<void> {
  try {
    const payload: CachedCrisisPlan = {
      plan,
      lastSyncedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(payload));
  } catch {
    // Silencioso: la cache es "best effort", no debe romper la UX.
  }
}

/**
 * Borra el cache del usuario. Llamar al logout o al borrar el plan.
 */
export async function clearCachedPlan(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(userId));
  } catch {
    // Silencioso.
  }
}
