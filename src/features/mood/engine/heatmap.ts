import type { MoodValue } from "@/src/features/mood/data/options";

/**
 * Construcción del heatmap de calendario (9.2.1) a partir de los mood_logs.
 * Lógica pura y testeable: agrupa por día local, calcula el mood dominante y
 * arma una grilla estilo GitHub (columnas = semanas, filas = días, lunes a
 * domingo) que termina en la semana actual.
 */

export interface HeatmapLog {
  mood: string | null;
  created_at: string | null;
}

export interface HeatmapCell {
  key: string; // YYYY-MM-DD local
  /** Mood dominante del día, o null si no hubo check-in. */
  mood: MoodValue | null;
  count: number;
  /** Día futuro dentro de la grilla (no se pinta). */
  future: boolean;
}

const MOODS: MoodValue[] = [
  "bien",
  "neutral",
  "bajo",
  "ansioso",
  "sobrecargado",
  "agitado",
];

/** Clave de día local YYYY-MM-DD. */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Mapa dayKey → mood dominante (moda; empate → el último registrado). */
export function dominantMoodByDay(
  logs: HeatmapLog[]
): Record<string, { mood: MoodValue | null; count: number }> {
  // Por día acumulamos conteo por mood y recordamos el último visto.
  const perDay: Record<
    string,
    { counts: Record<string, number>; last: MoodValue | null; total: number }
  > = {};

  // Orden cronológico ascendente para que "último" sea realmente el más nuevo.
  const sorted = [...logs]
    .filter((l) => l.created_at)
    .sort(
      (a, b) =>
        new Date(a.created_at as string).getTime() -
        new Date(b.created_at as string).getTime()
    );

  for (const log of sorted) {
    const d = new Date(log.created_at as string);
    if (Number.isNaN(d.getTime())) continue;
    const key = localDayKey(d);
    const entry = perDay[key] ?? { counts: {}, last: null, total: 0 };
    entry.total += 1;
    const mood = (MOODS as string[]).includes(log.mood ?? "")
      ? (log.mood as MoodValue)
      : null;
    if (mood) {
      entry.counts[mood] = (entry.counts[mood] ?? 0) + 1;
      entry.last = mood;
    }
    perDay[key] = entry;
  }

  const out: Record<string, { mood: MoodValue | null; count: number }> = {};
  for (const [key, entry] of Object.entries(perDay)) {
    let best: MoodValue | null = null;
    let bestCount = 0;
    for (const [mood, count] of Object.entries(entry.counts)) {
      if (count > bestCount) {
        best = mood as MoodValue;
        bestCount = count;
      }
    }
    // Empate por la moda → preferimos el último registrado del día.
    if (best && entry.last && entry.counts[entry.last] === bestCount) {
      best = entry.last;
    }
    out[key] = { mood: best, count: entry.total };
  }
  return out;
}

/** Lunes de la semana de `d` (semana lunes→domingo). */
function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (r.getDay() + 6) % 7; // 0 = lunes
  r.setDate(r.getDate() - dow);
  return r;
}

/**
 * Grilla de `weeks` columnas (semanas), cada una con 7 celdas (lun→dom),
 * terminando en la semana que contiene a `now`.
 */
export function buildHeatmap(
  logs: HeatmapLog[],
  now: Date = new Date(),
  weeks = 13
): HeatmapCell[][] {
  const byDay = dominantMoodByDay(logs);
  const todayKey = localDayKey(now);

  const startMonday = mondayOf(now);
  startMonday.setDate(startMonday.getDate() - (weeks - 1) * 7);

  const columns: HeatmapCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatmapCell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const date = new Date(startMonday);
      date.setDate(startMonday.getDate() + w * 7 + dow);
      const key = localDayKey(date);
      const hit = byDay[key];
      col.push({
        key,
        mood: hit?.mood ?? null,
        count: hit?.count ?? 0,
        future: key > todayKey,
      });
    }
    columns.push(col);
  }
  return columns;
}
