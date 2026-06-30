/**
 * Cálculo de racha de check-ins (9.1) a partir de las fechas de mood_logs.
 * Sin tabla nueva: se deriva de los registros existentes.
 *
 * Filosofía "sin presión":
 * - La racha actual NO se rompe solo porque hoy todavía no registraste: cuenta
 *   si hay check-in hoy O ayer (hay gracia hasta fin del día).
 * - Si no hay check-in ni hoy ni ayer, la racha actual es 0 (sin penalización
 *   ni números negativos).
 */

export interface StreakResult {
  /** Días consecutivos hasta hoy (o ayer, con gracia). */
  current: number;
  /** Racha más larga registrada (para celebrar el récord). */
  longest: number;
}

/** Número de día local (días desde epoch en la zona horaria del dispositivo). */
function localDayNumber(d: Date): number {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

export function computeStreak(
  isoDates: Array<string | null | undefined>,
  now: Date = new Date()
): StreakResult {
  const days = new Set<number>();
  for (const iso of isoDates) {
    if (!iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    days.add(localDayNumber(d));
  }

  if (days.size === 0) return { current: 0, longest: 0 };

  const sorted = [...days].sort((a, b) => a - b);

  // Racha más larga: corrida máxima de días consecutivos.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i] as number;
    const prev = sorted[i - 1] as number;
    run = cur === prev + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // Racha actual: arranca en hoy si hay check-in hoy; si no, en ayer (gracia).
  const today = localDayNumber(now);
  let cursor: number;
  if (days.has(today)) cursor = today;
  else if (days.has(today - 1)) cursor = today - 1;
  else return { current: 0, longest };

  let current = 0;
  while (days.has(cursor)) {
    current++;
    cursor--;
  }

  return { current, longest };
}

/** Hitos que celebramos (suavemente). */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

/** Si `current` es exactamente un hito, lo devuelve; si no, null. */
export function streakMilestone(current: number): number | null {
  return STREAK_MILESTONES.includes(current) ? current : null;
}
