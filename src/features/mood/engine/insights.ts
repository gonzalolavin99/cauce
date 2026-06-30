import type { MoodValue } from "@/src/features/mood/data/options";
import type { MoodLog } from "@/src/types/database.types";

// ============================================================
// Mapeos: mood → score (1-5, más alto = mejor) y mood → color
// ============================================================

/**
 * Score de bienestar por estado. No es "puntaje de felicidad" ni un
 * diagnóstico: es solo una forma de poder graficar una tendencia.
 * Ansioso/agitado ≠ "peor que bajo" en términos clínicos; acá están
 * todos los estados desagradables en un rango similar (1.5-2.5) para
 * que la gráfica muestre "día difícil" vs "día más llevadero" sin
 * emitir juicios de valor.
 */
export const MOOD_SCORE: Record<MoodValue, number> = {
  bien: 5,
  neutral: 3.5,
  bajo: 1.5,
  ansioso: 2,
  sobrecargado: 1.5,
  agitado: 2,
};

/**
 * Paleta de colores por estado. Hex directo para poder usar en style
 * prop (Tailwind JIT no procesa nombres de clase dinámicos).
 */
export const MOOD_COLOR: Record<MoodValue, string> = {
  bien: "#65A766",        // verde suave
  neutral: "#8FA3A3",     // gris-azulado
  bajo: "#5F7A94",        // azul apagado
  ansioso: "#D99A3F",     // ámbar
  sobrecargado: "#C6553F", // alert (rojo)
  agitado: "#D97C5E",     // naranja-rojizo
};

export const MOOD_ORDER: MoodValue[] = [
  "bien",
  "neutral",
  "bajo",
  "ansioso",
  "agitado",
  "sobrecargado",
];

// ============================================================
// Utilidades de fecha
// ============================================================

/** ISO timestamp → "YYYY-MM-DD" en zona local del dispositivo. */
export function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Lista de "YYYY-MM-DD" para los últimos `n` días, hoy último. */
export function lastNDays(n: number): string[] {
  const keys: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${day}`);
  }
  return keys;
}

// ============================================================
// Buckets por día
// ============================================================

export interface DayBucket {
  /** "YYYY-MM-DD" local */
  dateKey: string;
  /** Entradas de mood de ese día, ordenadas de más antiguo a más nuevo. */
  entries: MoodLog[];
  /** Score promedio del día (1-5). Null si no hay entradas. */
  avgScore: number | null;
  /** Mood más frecuente del día. Null si no hay entradas. */
  dominantMood: MoodValue | null;
}

/**
 * Distribuye los logs en días consecutivos (últimos `days` días).
 * Si un día no tiene entradas, queda con `entries: []` y null en stats.
 */
export function bucketByDay(logs: MoodLog[], days: number): DayBucket[] {
  const keys = lastNDays(days);
  const byKey = new Map<string, MoodLog[]>();
  for (const key of keys) byKey.set(key, []);

  for (const log of logs) {
    if (!log.created_at) continue;
    const key = toLocalDateKey(log.created_at);
    const arr = byKey.get(key);
    if (arr) arr.push(log);
  }

  // Ordenar cada día cronológicamente
  for (const arr of byKey.values()) {
    arr.sort((a, b) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return at - bt;
    });
  }

  return keys.map((dateKey) => {
    const entries = byKey.get(dateKey) ?? [];
    return {
      dateKey,
      entries,
      avgScore: averageScore(entries),
      dominantMood: dominantMood(entries),
    };
  });
}

export function averageScore(logs: MoodLog[]): number | null {
  if (logs.length === 0) return null;
  let sum = 0;
  let count = 0;
  for (const log of logs) {
    const mood = log.mood as MoodValue | null;
    if (mood && MOOD_SCORE[mood] != null) {
      sum += MOOD_SCORE[mood];
      count++;
    }
  }
  if (count === 0) return null;
  return sum / count;
}

export function dominantMood(logs: MoodLog[]): MoodValue | null {
  if (logs.length === 0) return null;
  const counts: Partial<Record<MoodValue, number>> = {};
  for (const log of logs) {
    const mood = log.mood as MoodValue | null;
    if (!mood) continue;
    counts[mood] = (counts[mood] ?? 0) + 1;
  }
  let best: MoodValue | null = null;
  let bestCount = 0;
  for (const [mood, count] of Object.entries(counts) as [MoodValue, number][]) {
    if (count > bestCount) {
      best = mood;
      bestCount = count;
    }
  }
  return best;
}

// ============================================================
// Frecuencia global y streak
// ============================================================

export function moodFrequency(logs: MoodLog[]): Record<MoodValue, number> {
  const counts: Record<MoodValue, number> = {
    bien: 0,
    neutral: 0,
    bajo: 0,
    ansioso: 0,
    sobrecargado: 0,
    agitado: 0,
  };
  for (const log of logs) {
    const mood = log.mood as MoodValue | null;
    if (mood && counts[mood] != null) counts[mood]++;
  }
  return counts;
}

/**
 * Racha de días consecutivos con al menos un check-in, contando hacia
 * atrás desde hoy. Si hoy aún no hay check-in pero ayer sí, empezamos
 * a contar desde ayer (damos gracia al día actual).
 */
export function computeStreak(logs: MoodLog[]): number {
  if (logs.length === 0) return 0;
  const keysWithEntry = new Set(
    logs.filter((l) => l.created_at).map((l) => toLocalDateKey(l.created_at!))
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toKeyFromDate(today);

  const cursor = new Date(today);
  // Si hoy no hay entrada, empezar desde ayer
  if (!keysWithEntry.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const key = toKeyFromDate(cursor);
    if (keysWithEntry.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
    if (streak > 365) break; // safety
  }
  return streak;
}

function toKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ============================================================
// Etiquetas legibles de fecha
// ============================================================

const WEEKDAY_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

/** Iniciales de día de semana del dateKey local. */
export function weekdayShort(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  return WEEKDAY_SHORT[dt.getDay()] ?? "";
}

/** "Hoy", "Ayer", "Lunes 18 abr" etc. */
export function humanDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(y, m - 1, d);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(dt, today)) return "Hoy";
  if (sameDay(dt, yesterday)) return "Ayer";

  return dt.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}
