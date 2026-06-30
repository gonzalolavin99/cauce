import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { computeExerciseStats } from "@/src/features/exercises/engine/stats";
import {
  detectTemporalPatterns,
  type TemporalInsight,
} from "@/src/features/mood/engine/patterns";
import { supabase } from "@/src/shared/lib/supabase";
import type {
  Exercise,
  MoodLog,
  RegulationSession,
} from "@/src/types/database.types";
import { useQuery } from "@tanstack/react-query";

// ============================================================
// useInsights
// ============================================================
//
// Agrega mood logs + regulation sessions + catálogo de ejercicios
// en un único query paralelo para alimentar la pantalla /insights.
//
// Principios:
// - Todo read-only, no muta.
// - Cálculos simples, client-side. Poca data (30d, limit 200 mood /
//   100 sesiones), no amerita RPC.
// - Devolvemos objetos "listos para mostrar" — la UI no calcula nada.
// - Sin streaks, sin rachas. Contamos lo que hay, sin juicio.

const WINDOW_DAYS = 30;

export interface MoodCount {
  mood: string;
  count: number;
  /** 0..100 */
  percent: number;
}

export interface InsightsData {
  /** Cantidad de check-ins en los últimos 30 días */
  checkinCount: number;
  /** Horas desde el último check-in, null si no hay */
  hoursSinceLastCheckin: number | null;
  /** Distribución por mood, ordenada descendentemente por count */
  moodDistribution: MoodCount[];
  /** Mood más frecuente (null si no hay logs o empate insignificante) */
  dominantMood: string | null;
  /** Energía promedio 1..5 (null si no hay datos) */
  avgEnergy: number | null;
  /** Sesiones de regulación completadas en los últimos 30 días */
  completedSessions: number;
  /** Sesiones marcadas "sí me ayudó" en los últimos 30 días */
  helpfulSessions: number;
  /** Top ejercicios usados en los últimos 30 días */
  topExercises: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  /** true si la data tiene suficiente volumen para mostrar algo útil */
  hasData: boolean;
  /** Patrones temporales detectados (6.1); puede venir vacío. */
  temporalPatterns: TemporalInsight[];
  /** Minutos totales dedicados a ejercicios en la ventana (9.2.2). */
  exerciseMinutes: number;
  /** Sesiones completadas por categoría (9.2.2). */
  exercisesByCategory: Array<{ category: string; count: number }>;
}

function windowStartIso(): string {
  return new Date(
    Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
}

/**
 * Suma y mapea una lista de mood logs en distribuciones + agregados.
 */
function summarize(
  moodLogs: MoodLog[],
  sessions: RegulationSession[],
  exercises: Exercise[]
): InsightsData {
  // --- Mood distribution ---
  const moodCounts: Record<string, number> = {};
  let energySum = 0;
  let energyCount = 0;
  for (const log of moodLogs) {
    if (log.mood) {
      moodCounts[log.mood] = (moodCounts[log.mood] ?? 0) + 1;
    }
    if (typeof log.energy === "number" && Number.isFinite(log.energy)) {
      energySum += log.energy;
      energyCount += 1;
    }
  }

  const total = Object.values(moodCounts).reduce((a, b) => a + b, 0);

  const moodDistribution: MoodCount[] = Object.entries(moodCounts)
    .map(([mood, count]) => ({
      mood,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const dominantMood = moodDistribution[0]?.mood ?? null;

  // --- Last checkin ---
  let hoursSinceLastCheckin: number | null = null;
  const sorted = [...moodLogs].sort((a, b) => {
    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bt - at;
  });
  const latest = sorted[0];
  if (latest?.created_at) {
    const ms = Date.now() - new Date(latest.created_at).getTime();
    if (Number.isFinite(ms) && ms >= 0) {
      hoursSinceLastCheckin = Math.floor(ms / (1000 * 60 * 60));
    }
  }

  // --- Regulation sessions ---
  const completed = sessions.filter((s) => !!s.completed_at);
  const helpful = completed.filter((s) => s.was_helpful === "yes");

  const byExercise: Record<string, number> = {};
  for (const s of completed) {
    if (!s.exercise_id) continue;
    byExercise[s.exercise_id] = (byExercise[s.exercise_id] ?? 0) + 1;
  }
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const topExercises = Object.entries(byExercise)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({
      id,
      name: exerciseById.get(id)?.name_es ?? "Ejercicio",
      count,
    }));

  const avgEnergy =
    energyCount === 0 ? null : Number((energySum / energyCount).toFixed(1));

  const hasData = moodLogs.length > 0 || completed.length > 0;

  const exStats = computeExerciseStats(sessions, exercises);

  return {
    checkinCount: moodLogs.length,
    hoursSinceLastCheckin,
    moodDistribution,
    dominantMood,
    avgEnergy,
    completedSessions: completed.length,
    helpfulSessions: helpful.length,
    topExercises,
    hasData,
    temporalPatterns: detectTemporalPatterns(moodLogs),
    exerciseMinutes: exStats.totalMinutes,
    exercisesByCategory: exStats.byCategory,
  };
}

export function useInsights() {
  const { user } = useAuth();

  return useQuery<InsightsData>({
    queryKey: ["insights", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = windowStartIso();

      const [moodRes, sessionsRes, exercisesRes] = await Promise.all([
        supabase
          .from("mood_logs")
          .select("mood, energy, created_at, note, user_id, id")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("regulation_sessions")
          .select(
            "id, exercise_id, started_at, completed_at, feeling_intensity_before, feeling_intensity_after, was_helpful, user_id, notes, created_at, feeling_before"
          )
          .gte("started_at", since)
          .order("started_at", { ascending: false })
          .limit(100),
        supabase.from("exercises").select("*").eq("active", true),
      ]);

      if (moodRes.error) throw moodRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      if (exercisesRes.error) throw exercisesRes.error;

      return summarize(
        (moodRes.data ?? []) as MoodLog[],
        (sessionsRes.data ?? []) as RegulationSession[],
        (exercisesRes.data ?? []) as Exercise[]
      );
    },
  });
}

/**
 * Categorías de mood consideradas "difíciles" para mostrar un disclaimer
 * amable cuando predominan. NO es un diagnóstico, es solo cuidado.
 */
export const HARD_MOODS = new Set([
  "bajo",
  "ansioso",
  "sobrecargado",
  "agitado",
]);
