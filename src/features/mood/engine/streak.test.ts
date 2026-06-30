import { describe, expect, it } from "vitest";
import { computeStreak, streakMilestone } from "./streak";

/**
 * Tests del cálculo de racha (9.1). Lógica pura, sin RN ni red.
 * Usamos fechas locales fijas y un `now` explícito para evitar flakiness.
 */

// Helper: ISO a mediodía local de un día dado (evita cruces de medianoche/tz).
function day(y: number, m: number, d: number): string {
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

const NOW = new Date(2026, 5, 11, 9, 0, 0); // 2026-06-11 09:00 local

describe("computeStreak", () => {
  it("sin registros → 0 / 0", () => {
    expect(computeStreak([], NOW)).toEqual({ current: 0, longest: 0 });
  });

  it("ignora fechas nulas o inválidas", () => {
    const r = computeStreak([null, undefined, "no-fecha", day(2026, 6, 11)], NOW);
    expect(r.current).toBe(1);
  });

  it("check-in solo hoy → racha 1", () => {
    expect(computeStreak([day(2026, 6, 11)], NOW).current).toBe(1);
  });

  it("hoy, ayer y antier → racha 3", () => {
    const r = computeStreak(
      [day(2026, 6, 11), day(2026, 6, 10), day(2026, 6, 9)],
      NOW
    );
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
  });

  it("varios check-ins el mismo día no inflan la racha", () => {
    const r = computeStreak(
      [day(2026, 6, 11), day(2026, 6, 11), day(2026, 6, 10)],
      NOW
    );
    expect(r.current).toBe(2);
  });

  it("gracia: sin check-in hoy pero sí ayer y antier → racha 2", () => {
    const r = computeStreak([day(2026, 6, 10), day(2026, 6, 9)], NOW);
    expect(r.current).toBe(2);
  });

  it("sin check-in hoy ni ayer → racha actual 0 (sin penalizar)", () => {
    const r = computeStreak([day(2026, 6, 8), day(2026, 6, 7)], NOW);
    expect(r.current).toBe(0);
    expect(r.longest).toBe(2);
  });

  it("longest captura la mejor corrida histórica aunque la actual sea menor", () => {
    const r = computeStreak(
      [
        // corrida vieja de 4
        day(2026, 5, 1),
        day(2026, 5, 2),
        day(2026, 5, 3),
        day(2026, 5, 4),
        // corrida actual de 2 (ayer + hoy)
        day(2026, 6, 10),
        day(2026, 6, 11),
      ],
      NOW
    );
    expect(r.current).toBe(2);
    expect(r.longest).toBe(4);
  });
});

describe("streakMilestone", () => {
  it("devuelve el hito cuando coincide", () => {
    expect(streakMilestone(7)).toBe(7);
    expect(streakMilestone(30)).toBe(30);
  });
  it("null cuando no es hito", () => {
    expect(streakMilestone(5)).toBeNull();
    expect(streakMilestone(0)).toBeNull();
  });
});
