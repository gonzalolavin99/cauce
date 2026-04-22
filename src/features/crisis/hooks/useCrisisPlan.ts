import { useAuth } from "@/src/features/auth/hooks/useAuth";
import {
  clearCachedPlan,
  readCachedPlan,
  writeCachedPlan,
} from "@/src/features/crisis/lib/offlineCache";
import { supabase } from "@/src/shared/lib/supabase";
import type { CrisisPlan } from "@/src/types/database.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Resultado del query del plan de crisis, con metadata de offline-safety:
 * - `plan` es lo que se muestra (del server o del cache local).
 * - `fromCache` = true cuando la red falló y caímos a AsyncStorage.
 * - `lastSyncedAt` es el timestamp ISO de la última sincronización exitosa.
 */
export interface CrisisPlanQueryResult {
  plan: CrisisPlan | null;
  fromCache: boolean;
  lastSyncedAt: string | null;
}

/**
 * Devuelve el plan de crisis del usuario, con fallback a cache local si
 * la red falla. Un plan por usuario (PK = user_id).
 *
 * Flujo:
 *   1. Intenta fetch desde Supabase
 *   2. Si OK → guarda en cache local, retorna con fromCache=false
 *   3. Si falla → lee cache local, si existe retorna con fromCache=true
 *   4. Si falla y no hay cache → lanza el error original
 */
export function useCrisisPlan() {
  const { user } = useAuth();

  return useQuery<CrisisPlanQueryResult>({
    queryKey: ["crisis-plan", user?.id],
    enabled: !!user,
    // Manejamos fallback a cache nosotros mismos; no necesitamos retry.
    retry: false,
    queryFn: async () => {
      if (!user) {
        return { plan: null, fromCache: false, lastSyncedAt: null };
      }

      try {
        const { data, error } = await supabase
          .from("crisis_plans")
          .select("*")
          .maybeSingle();
        if (error) throw error;

        const plan = (data as CrisisPlan) ?? null;
        // Best-effort write to cache; no bloquea la respuesta.
        await writeCachedPlan(user.id, plan);
        return {
          plan,
          fromCache: false,
          lastSyncedAt: new Date().toISOString(),
        };
      } catch (err) {
        // Red falló: intentamos servir desde cache local.
        const cached = await readCachedPlan(user.id);
        if (cached) {
          return {
            plan: cached.plan,
            fromCache: true,
            lastSyncedAt: cached.lastSyncedAt,
          };
        }
        // Sin cache: propagamos el error para que la UI muestre estado vacío.
        throw err;
      }
    },
  });
}

export interface CrisisPlanInput {
  warning_signs?: string | null;
  what_helps?: string | null;
  anchor_phrase?: string | null;
  safe_place?: string | null;
  trusted_contact_name?: string | null;
  trusted_contact_phone?: string | null;
  trusted_contact_relation?: string | null;
  reasons_to_stay?: string | null;
  avoid_list?: string | null;
  notes?: string | null;
}

/**
 * Crea o actualiza el plan de crisis del usuario. Upsert sobre user_id.
 * Tras éxito, el invalidate fuerza un refetch que reescribe el cache local.
 */
export function useUpsertCrisisPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, CrisisPlanInput>({
    mutationFn: async (input) => {
      if (!user) throw new Error("No autenticado");

      // Normalizamos strings vacíos a null para mantener la BD limpia.
      const payload: Record<string, string | null> = {
        user_id: user.id,
      };
      for (const [k, v] of Object.entries(input)) {
        if (typeof v === "string") {
          const trimmed = v.trim();
          payload[k] = trimmed.length === 0 ? null : trimmed;
        } else {
          payload[k] = v ?? null;
        }
      }

      const { error } = await (supabase.from("crisis_plans") as any).upsert(
        payload,
        { onConflict: "user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      // El refetch subsiguiente reescribirá el cache local desde el server.
      queryClient.invalidateQueries({ queryKey: ["crisis-plan"] });
    },
  });
}

/**
 * Borra el plan de crisis del usuario (si existe) y limpia el cache local.
 */
export function useDeleteCrisisPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase
        .from("crisis_plans")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      if (user) {
        await clearCachedPlan(user.id);
      }
      queryClient.invalidateQueries({ queryKey: ["crisis-plan"] });
    },
  });
}

/**
 * True si el plan tiene al menos un campo llenado (algo útil que mostrar).
 */
export function isCrisisPlanUseful(plan: CrisisPlan | null | undefined): boolean {
  if (!plan) return false;
  const fields: (keyof CrisisPlan)[] = [
    "warning_signs",
    "what_helps",
    "anchor_phrase",
    "safe_place",
    "trusted_contact_name",
    "trusted_contact_phone",
    "reasons_to_stay",
    "avoid_list",
    "notes",
  ];
  return fields.some((f) => {
    const v = plan[f];
    return typeof v === "string" && v.trim().length > 0;
  });
}
