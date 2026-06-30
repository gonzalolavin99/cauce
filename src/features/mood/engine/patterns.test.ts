import { describe, expect, it } from "vitest";
import type { MoodLog } from "@/src/types/database.types";
import {
  activeNudge,
  detectTemporalPatterns,
  nudgeSentence,
  patternSentence,
  type TemporalInsight,
} from "./patterns";

// Helper para crear un MoodLog mínimo en una fecha/hora local dada.
function log(
  mood: string,
  y: number,
  m: number,
  d: number,
  h: number
): MoodLog {
  return {
    id: `${y}${m}${d}${h}${Math.random()}`,
    user_id: "u",
    mood,
    energy: 3,
    note: null,
    created_at: new Date(y, m - 1, d, h).toISOString(),
  } as MoodLog;
}

describe("detectTemporalPatterns", () => {
  it("sin suficientes datos → vacío", () => {
    const logs = [log("bien", 2026, 6, 1, 10), log("bajo", 2026, 6, 2, 10)];
    expect(detectTemporalPatterns(logs)).toEqual([]);
  });

  it("detecta un día de semana más difícil", () => {
    const logs: MoodLog[] = [];
    // Lunes (2026-06-01, 08, 15, 22 son lunes) bajos
    for (const d of [1, 8, 15, 22]) logs.push(log("sobrecargado", 2026, 6, d, 10));
    // Resto de días, bien
    for (const d of [2, 3, 4, 5, 9, 10, 11]) logs.push(log("bien", 2026, 6, d, 10));

    const patterns = detectTemporalPatterns(logs);
    const wd = patterns.find((p) => p.kind === "weekday");
    expect(wd).toBeDefined();
    expect(wd?.direction).toBe("harder");
    expect(wd?.label).toBe("los lunes");
  });

  it("detecta una franja horaria más difícil (noches)", () => {
    const logs: MoodLog[] = [];
    // Noches bajas
    for (const d of [1, 2, 3, 4]) logs.push(log("ansioso", 2026, 6, d, 22));
    // Mañanas bien
    for (const d of [1, 2, 3, 4, 5] ) logs.push(log("bien", 2026, 6, d, 9));

    const patterns = detectTemporalPatterns(logs);
    const t = patterns.find((p) => p.kind === "timeOfDay");
    expect(t).toBeDefined();
    expect(t?.direction).toBe("harder");
    expect(t?.label).toBe("las noches");
  });

  it("no inventa patrones cuando todo es parejo", () => {
    const logs: MoodLog[] = [];
    for (let d = 1; d <= 12; d++) logs.push(log("neutral", 2026, 6, d, 12));
    expect(detectTemporalPatterns(logs)).toEqual([]);
  });
});

describe("patternSentence", () => {
  it("redacta 'harder' con mayúscula inicial", () => {
    expect(
      patternSentence({
        kind: "weekday",
        direction: "harder",
        label: "los lunes",
        index: 0,
      })
    ).toBe("Los lunes suelen costarte un poco más.");
  });
  it("redacta 'better'", () => {
    expect(
      patternSentence({
        kind: "timeOfDay",
        direction: "better",
        label: "las mañanas",
        index: 1,
      })
    ).toBe("Las mañanas tiendes a estar mejor.");
  });
});

describe("activeNudge", () => {
  // 2026-06-11 es jueves (weekday índice 3). 22:00 → franja "noches" (índice 3).
  const thuNight = new Date(2026, 5, 11, 22, 0, 0);

  const hardThu: TemporalInsight = {
    kind: "weekday",
    direction: "harder",
    label: "los jueves",
    index: 3,
  };
  const hardNight: TemporalInsight = {
    kind: "timeOfDay",
    direction: "harder",
    label: "las noches",
    index: 3,
  };
  const betterNight: TemporalInsight = { ...hardNight, direction: "better" };

  it("activa el patrón de día de semana que aplica ahora", () => {
    expect(activeNudge([hardThu], thuNight)).toBe(hardThu);
  });

  it("activa el patrón de franja horaria que aplica ahora", () => {
    expect(activeNudge([hardNight], thuNight)).toBe(hardNight);
  });

  it("no nudgea fuera del día/franja", () => {
    const monMorning = new Date(2026, 5, 8, 9, 0, 0); // lunes 09:00
    expect(activeNudge([hardThu, hardNight], monMorning)).toBeNull();
  });

  it("nunca nudgea patrones 'better'", () => {
    expect(activeNudge([betterNight], thuNight)).toBeNull();
  });

  it("nudgeSentence redacta una invitación suave", () => {
    expect(nudgeSentence(hardNight)).toBe(
      "Las noches suelen costarte un poco. ¿Te tomas un momento para ti?"
    );
  });
});
