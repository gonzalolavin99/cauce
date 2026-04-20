import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import type { CrisisPlan } from "@/src/types/database.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Devuelve el plan de crisis del usuario, o null si todavía no existe.
 * Un plan por usuario (PK = user_id).
 */
export function useCrisisPlan() {
  const { user } = useAuth();

  return useQuery<CrisisPlan | null>({
    queryKey: ["crisis-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crisis_plans")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data as CrisisPlan) ?? null;
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
      queryClient.invalidateQueries({ queryKey: ["crisis-plan"] });
    },
  });
}

/**
 * Borra el plan de crisis del usuario (si existe).
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
    onSuccess: () => {
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
