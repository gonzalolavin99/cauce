import { useAuth } from "@/src/features/auth/hooks/useAuth";
import {
  activeNudge,
  detectTemporalPatterns,
  type TemporalInsight,
} from "@/src/features/mood/engine/patterns";
import { supabase } from "@/src/shared/lib/supabase";
import type { MoodLog } from "@/src/types/database.types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * 6.1.3 — Sugerencia proactiva in-app. Si los patrones temporales muestran que
 * el día/franja actual suele costar, devuelve ese patrón para ofrecer un
 * momento de regulación. Calcula contra la hora actual en render (no en fetch)
 * para que el nudge sea fiel al momento. Solo nudgea momentos "difíciles".
 */
export function useProactiveNudge(): { nudge: TemporalInsight | null } {
  const { user } = useAuth();

  const { data: logs } = useQuery<MoodLog[]>({
    queryKey: ["mood-nudge-logs", user?.id],
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // patrones cambian lento
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mood_logs")
        .select("mood, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as MoodLog[];
    },
  });

  const nudge = useMemo(() => {
    const patterns = detectTemporalPatterns((logs ?? []) as MoodLog[]);
    return activeNudge(patterns, new Date());
  }, [logs]);

  return { nudge };
}
