import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import { useQuery } from "@tanstack/react-query";

/** Conteo de efectividad por ejercicio, derivado de regulation_sessions. */
export interface ExerciseEffectiveness {
  /** Veces que la persona marcó que le ayudó (was_helpful = yes | somewhat). */
  helped: number;
  /** Total de sesiones completadas con valoración. */
  total: number;
}

export type EffectivenessMap = Record<string, ExerciseEffectiveness>;

/**
 * 6.2 — Efectividad personal por ejercicio. No usa una tabla nueva: agrega las
 * sesiones existentes (`regulation_sessions.was_helpful`). Alimenta el scoring
 * de recomendaciones y el "te ha ayudado X veces".
 */
export function useExerciseEffectiveness() {
  const { user } = useAuth();

  return useQuery<EffectivenessMap>({
    queryKey: ["exercise-effectiveness", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regulation_sessions")
        .select("exercise_id, was_helpful")
        .not("was_helpful", "is", null);
      if (error) throw error;

      const map: EffectivenessMap = {};
      for (const row of data ?? []) {
        const id = (row as { exercise_id: string | null }).exercise_id;
        const helpful = (row as { was_helpful: string | null }).was_helpful;
        if (!id) continue;
        const entry = map[id] ?? { helped: 0, total: 0 };
        entry.total += 1;
        if (helpful === "yes" || helpful === "somewhat") entry.helped += 1;
        map[id] = entry;
      }
      return map;
    },
  });
}
