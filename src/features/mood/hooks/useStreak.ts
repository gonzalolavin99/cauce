import { useAuth } from "@/src/features/auth/hooks/useAuth";
import {
  computeStreak,
  type StreakResult,
} from "@/src/features/mood/engine/streak";
import { supabase } from "@/src/shared/lib/supabase";
import { useQuery } from "@tanstack/react-query";

/**
 * Racha de check-ins (9.1), derivada de las fechas de mood_logs. No usa tabla
 * nueva. Trae hasta 400 fechas (suficiente para rachas largas) y delega el
 * cálculo a `computeStreak`.
 */
export function useStreak(): { streak: StreakResult; isLoading: boolean } {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<StreakResult>({
    queryKey: ["mood-streak", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mood_logs")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(400);
      if (error) throw error;
      const dates = (data ?? []).map(
        (r) => (r as { created_at: string | null }).created_at
      );
      return computeStreak(dates);
    },
  });

  return {
    streak: data ?? { current: 0, longest: 0 },
    isLoading,
  };
}
