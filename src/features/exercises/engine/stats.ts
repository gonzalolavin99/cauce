/**
 * Estadísticas de ejercicios (9.2.2): tiempo total dedicado y desglose por
 * categoría, a partir de las sesiones completadas y el catálogo. Lógica pura.
 */

export interface StatSession {
  exercise_id: string | null;
  completed_at?: string | null;
}

export interface StatExercise {
  id: string;
  category: string | null;
  duration_seconds: number;
}

export interface ExerciseStats {
  /** Sesiones completadas. */
  completed: number;
  /** Minutos totales dedicados (estimados por la duración del ejercicio). */
  totalMinutes: number;
  /** Conteo por categoría, ordenado desc. */
  byCategory: Array<{ category: string; count: number }>;
}

export function computeExerciseStats(
  sessions: StatSession[],
  exercises: StatExercise[]
): ExerciseStats {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const completed = sessions.filter((s) => !!s.completed_at);

  let totalSeconds = 0;
  const catCounts: Record<string, number> = {};

  for (const s of completed) {
    if (!s.exercise_id) continue;
    const ex = byId.get(s.exercise_id);
    if (!ex) continue;
    totalSeconds += ex.duration_seconds ?? 0;
    const cat = ex.category ?? "otros";
    catCounts[cat] = (catCounts[cat] ?? 0) + 1;
  }

  const byCategory = Object.entries(catCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return {
    completed: completed.length,
    totalMinutes: Math.round(totalSeconds / 60),
    byCategory,
  };
}
