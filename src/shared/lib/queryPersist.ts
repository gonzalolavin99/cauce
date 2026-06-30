import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { defaultShouldDehydrateQuery, type Query } from "@tanstack/react-query";

// Persistencia del cache de React Query (mejora 2.2): la app abre con los
// últimos datos al instante y revalida en background, en vez de partir con
// cache frío esperando red.

/** Clave única en AsyncStorage/localStorage. La borra el signOut. */
export const QUERY_CACHE_KEY = "cauce-query-cache";

/**
 * Subir cuando cambie la forma de los datos cacheados de manera incompatible
 * (invalida todo el cache persistido de los clientes).
 */
export const QUERY_CACHE_BUSTER = "v1";

/** 24 h: pasado eso, el snapshot persistido se descarta al arrancar. */
export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_KEY,
  // Evita serializar en cada update; junta escrituras.
  throttleTime: 2000,
});

/**
 * Qué queries quedan en disco. Excluimos el contenido del chat con la IA
 * (`ai-*`): en web AsyncStorage es localStorage plano y las conversaciones
 * son el dato más íntimo de la app. El resto (moods, plan de crisis,
 * catálogo) aporta más disponible offline que el riesgo que agrega — y el
 * cache completo se purga al cerrar sesión.
 */
export function shouldPersistQuery(query: Query): boolean {
  if (!defaultShouldDehydrateQuery(query)) return false;
  const root = String(query.queryKey[0] ?? "");
  // "auth": la sesión la maneja supabase-js (staleTime Infinity — restaurarla
  // del disco podría mostrar sesión viva cuando ya expiró).
  return !root.startsWith("ai-") && root !== "auth";
}

/** Borra el snapshot persistido (usar al cerrar sesión). */
export async function clearPersistedQueryCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUERY_CACHE_KEY);
  } catch {
    // best-effort: si falla, el buster/maxAge lo invalidará igual
  }
}
