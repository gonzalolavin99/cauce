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

/** Normaliza el input: strings vacíos → null, para BD y cache consistentes. */
function normalizeCrisisInput(
  input: CrisisPlanInput
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "string") {
      const trimmed = v.trim();
      out[k] = trimmed.length === 0 ? null : trimmed;
    } else {
      out[k] = v ?? null;
    }
  }
  return out;
}

interface CrisisPlanMutationContext {
  previous: Array<[readonly unknown[], CrisisPlanQueryResult | undefined]>;
}

/**
 * Crea o actualiza el plan de crisis del usuario. Upsert sobre user_id.
 * Optimistic: el plan se refleja al instante; onSettled refetch reescribe el
 * cache local desde el server. Ante error, rollback con el snapshot.
 */
export function useUpsertCrisisPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, CrisisPlanInput, CrisisPlanMutationContext>({
    mutationFn: async (input) => {
      if (!user) throw new Error("No autenticado");

      const payload = { user_id: user.id, ...normalizeCrisisInput(input) };

      const { error } = await (supabase.from("crisis_plans") as any).upsert(
        payload,
        { onConflict: "user_id" }
      );
      if (error) throw error;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["crisis-plan"] });

      const previous = queryClient.getQueriesData<CrisisPlanQueryResult>({
        queryKey: ["crisis-plan"],
      });

      const normalized = normalizeCrisisInput(input);
      queryClient.setQueriesData<CrisisPlanQueryResult>(
        { queryKey: ["crisis-plan"] },
        (old) => {
          const prevPlan = old?.plan ?? null;
          const mergedPlan = {
            ...(prevPlan ?? { user_id: user?.id ?? null }),
            ...normalized,
          } as CrisisPlan;
          return {
            plan: mergedPlan,
            fromCache: false,
            lastSyncedAt: old?.lastSyncedAt ?? null,
          };
        }
      );

      return { previous };
    },
    onError: (_err, _input, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      // El refetch reescribirá el cache local desde el server (id/timestamps).
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

// Pura: extraída a `lib/isCrisisPlanUseful` para poder testearla sin
// arrastrar supabase + react-query. Se re-exporta acá por compatibilidad
// con los imports existentes.
export { isCrisisPlanUseful } from "@/src/features/crisis/lib/isCrisisPlanUseful";
