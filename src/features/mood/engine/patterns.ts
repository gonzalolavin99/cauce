import type { MoodValue } from "@/src/features/mood/data/options";
import { MOOD_SCORE } from "@/src/features/mood/engine/insights";
import type { MoodLog } from "@/src/types/database.types";

/**
 * Detección de patrones temporales (6.1) sobre mood_logs.
 *
 * Busca, de forma conservadora, si algún día de la semana o franja horaria se
 * desvía notablemente del promedio general de bienestar. Pensado para "notar",
 * no para diagnosticar: requiere volumen mínimo y una desviación clara antes
 * de afirmar algo, para evitar falsos patrones.
 */

export type PatternKind = "weekday" | "timeOfDay";
export type PatternDirection = "harder" | "better";

export interface TemporalInsight {
  kind: PatternKind;
  direction: PatternDirection;
  /** Etiqueta lista para mostrar: "los lunes", "las tardes", etc. */
  label: string;
  /** Índice del grupo: día de semana 0=lunes..6, o franja 0..3. Sirve para
   *  saber si el patrón aplica "ahora". */
  index: number;
}

// Umbrales conservadores.
const MIN_TOTAL = 8; // pocos datos → no afirmamos nada
const MIN_GROUP = 3; // un grupo necesita al menos esto para contar
const MIN_DEVIATION = 0.5; // puntos (escala 1..5) para considerarlo "notable"

const WEEKDAY_LABELS = [
  "los lunes",
  "los martes",
  "los miércoles",
  "los jueves",
  "los viernes",
  "los sábados",
  "los domingos",
];

// Franjas: madrugada 0-5, mañana 6-11, tarde 12-17, noche 18-23.
const TIME_BUCKETS: { label: string; from: number; to: number }[] = [
  { label: "las madrugadas", from: 0, to: 5 },
  { label: "las mañanas", from: 6, to: 11 },
  { label: "las tardes", from: 12, to: 17 },
  { label: "las noches", from: 18, to: 23 },
];

interface Group {
  sum: number;
  count: number;
}

function mostNotable(
  groups: Map<number, Group>,
  labelFor: (key: number) => string,
  overallAvg: number,
  kind: PatternKind
): TemporalInsight | null {
  let best: { key: number; dev: number; avg: number } | null = null;
  for (const [key, g] of groups) {
    if (g.count < MIN_GROUP) continue;
    const avg = g.sum / g.count;
    const dev = avg - overallAvg;
    if (Math.abs(dev) < MIN_DEVIATION) continue;
    if (!best || Math.abs(dev) > Math.abs(best.dev)) {
      best = { key, dev, avg };
    }
  }
  if (!best) return null;
  return {
    kind,
    direction: best.dev < 0 ? "harder" : "better",
    label: labelFor(best.key),
    index: best.key,
  };
}

export function detectTemporalPatterns(
  logs: MoodLog[]
): TemporalInsight[] {
  const scored = logs
    .map((l) => {
      const mood = l.mood as MoodValue | null;
      const score = mood ? MOOD_SCORE[mood] : undefined;
      if (score == null || !l.created_at) return null;
      const d = new Date(l.created_at);
      if (Number.isNaN(d.getTime())) return null;
      return { score, weekday: (d.getDay() + 6) % 7, hour: d.getHours() };
    })
    .filter((x): x is { score: number; weekday: number; hour: number } => !!x);

  if (scored.length < MIN_TOTAL) return [];

  const overallAvg =
    scored.reduce((a, s) => a + s.score, 0) / scored.length;

  // Agrupar por día de semana (0 = lunes).
  const byWeekday = new Map<number, Group>();
  // Agrupar por índice de franja horaria.
  const byBucket = new Map<number, Group>();

  for (const s of scored) {
    const wd = byWeekday.get(s.weekday) ?? { sum: 0, count: 0 };
    wd.sum += s.score;
    wd.count += 1;
    byWeekday.set(s.weekday, wd);

    const bi = TIME_BUCKETS.findIndex((b) => s.hour >= b.from && s.hour <= b.to);
    if (bi >= 0) {
      const b = byBucket.get(bi) ?? { sum: 0, count: 0 };
      b.sum += s.score;
      b.count += 1;
      byBucket.set(bi, b);
    }
  }

  const out: TemporalInsight[] = [];

  const weekday = mostNotable(
    byWeekday,
    (k) => WEEKDAY_LABELS[k] ?? "",
    overallAvg,
    "weekday"
  );
  if (weekday) out.push(weekday);

  const timeOfDay = mostNotable(
    byBucket,
    (k) => TIME_BUCKETS[k]?.label ?? "",
    overallAvg,
    "timeOfDay"
  );
  if (timeOfDay) out.push(timeOfDay);

  return out;
}

/**
 * 6.1.3 — Devuelve el patrón "difícil" que aplica AHORA (mismo día de semana o
 * franja horaria que el momento actual), o null. Sirve para una sugerencia
 * proactiva: solo nudgeamos en momentos que históricamente cuestan, nunca
 * cuando la persona suele estar bien.
 */
export function activeNudge(
  patterns: TemporalInsight[],
  now: Date = new Date()
): TemporalInsight | null {
  const weekday = (now.getDay() + 6) % 7;
  const hour = now.getHours();
  const bucket = TIME_BUCKETS.findIndex((b) => hour >= b.from && hour <= b.to);

  for (const p of patterns) {
    if (p.direction !== "harder") continue;
    if (p.kind === "weekday" && p.index === weekday) return p;
    if (p.kind === "timeOfDay" && p.index === bucket) return p;
  }
  return null;
}

/** Frase breve para la sugerencia proactiva. */
export function nudgeSentence(insight: TemporalInsight): string {
  const cap = insight.label.charAt(0).toUpperCase() + insight.label.slice(1);
  return `${cap} suelen costarte un poco. ¿Te tomas un momento para ti?`;
}

/** Frase lista para mostrar a partir de un insight. */
export function patternSentence(insight: TemporalInsight): string {
  const cap = insight.label.charAt(0).toUpperCase() + insight.label.slice(1);
  if (insight.direction === "harder") {
    return `${cap} suelen costarte un poco más.`;
  }
  return `${cap} tiendes a estar mejor.`;
}
