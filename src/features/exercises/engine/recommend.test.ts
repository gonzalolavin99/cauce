import { describe, expect, it } from "vitest";
import type { Exercise } from "@/src/types/database.types";
import {
  type RecommendationContext,
  recommendExercises,
  scoreExercise,
} from "./recommend";

/**
 * Tests del motor de recomendación (Roadmap 12.1.2).
 *
 * Cubre el scoring puro de `scoreExercise` (cada regla de puntaje y el filtro
 * duro de movilidad) y el ordenamiento/filtrado de `recommendExercises`.
 * Todo es lógica pura — sin RN ni red.
 */

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-1",
    name_es: "Respiración 4-7-8",
    short_description_es: null,
    category: "breathing",
    duration_seconds: 120,
    evidence_level: "moderate",
    mobility_required: "any",
    targets: [],
    tags: [],
    steps: [],
    sources: null,
    audio_url: null,
    active: true,
    created_at: null,
    ...overrides,
  };
}

function makeCtx(
  overrides: Partial<RecommendationContext> = {}
): RecommendationContext {
  return {
    diagnoses: [],
    calmingInputs: [],
    timeAvailable: 10, // 600s
    mobility: "any",
    ...overrides,
  };
}

describe("scoreExercise — filtro de movilidad", () => {
  it("excluye (score -1000) cuando el ejercicio requiere más movilidad que la del usuario", () => {
    const ex = makeExercise({ mobility_required: "seated" });
    const result = scoreExercise(ex, makeCtx({ mobility: "still" }));
    expect(result.score).toBe(-1000);
    expect(result.reasons).toContain("Requiere más movilidad");
  });

  it("permite 'any' requerido sin importar la movilidad del usuario", () => {
    const ex = makeExercise({ mobility_required: "any" });
    const result = scoreExercise(ex, makeCtx({ mobility: "still" }));
    expect(result.score).toBeGreaterThan(-1000);
  });

  it("usuario 'seated' puede hacer ejercicios 'seated' y 'still'", () => {
    const ctx = makeCtx({ mobility: "seated" });
    expect(
      scoreExercise(makeExercise({ mobility_required: "seated" }), ctx).score
    ).toBeGreaterThan(-1000);
    expect(
      scoreExercise(makeExercise({ mobility_required: "still" }), ctx).score
    ).toBeGreaterThan(-1000);
  });

  it("usuario 'still' NO puede hacer ejercicios 'seated'", () => {
    const ex = makeExercise({ mobility_required: "seated" });
    expect(scoreExercise(ex, makeCtx({ mobility: "still" })).score).toBe(-1000);
  });
});

describe("scoreExercise — reglas de puntaje", () => {
  it("+5 cuando el target coincide con el feeling actual", () => {
    const ex = makeExercise({ targets: ["ansioso"], category: null });
    const withFeeling = scoreExercise(ex, makeCtx({ feeling: "ansioso" }));
    const without = scoreExercise(ex, makeCtx());
    expect(withFeeling.score - without.score).toBe(5);
    expect(withFeeling.reasons).toContain("Para cuando estás ansioso");
  });

  it("+2 cuando la categoría está recomendada para el diagnóstico", () => {
    // ansiedad → ["breathing", "grounding"]
    const ex = makeExercise({ category: "breathing", evidence_level: null });
    const withDx = scoreExercise(ex, makeCtx({ diagnoses: ["ansiedad"] }));
    const without = scoreExercise(ex, makeCtx({ diagnoses: ["ninguno"] }));
    expect(withDx.score - without.score).toBe(2);
    expect(withDx.reasons).toContain("Recomendado para tu perfil");
  });

  it("+1 cuando la categoría se alinea con una preferencia calmante", () => {
    // slow_breathing → ["breathing"]
    const ex = makeExercise({ category: "breathing", evidence_level: null });
    const withCalm = scoreExercise(
      ex,
      makeCtx({ calmingInputs: ["slow_breathing"] })
    );
    const without = scoreExercise(ex, makeCtx({ calmingInputs: [] }));
    expect(withCalm.score - without.score).toBe(1);
    expect(withCalm.reasons).toContain("Alineado con lo que te calma");
  });

  it("+2 cuando le ayudó una vez (efectividad personal)", () => {
    const ex = makeExercise({ id: "ex-9", category: null, evidence_level: null });
    const withEff = scoreExercise(
      ex,
      makeCtx({ effectiveness: { "ex-9": { helped: 1, total: 1 } } })
    );
    const without = scoreExercise(ex, makeCtx());
    expect(withEff.score - without.score).toBe(2);
    expect(withEff.reasons).toContain("Te ayudó una vez");
  });

  it("+3 cuando le ayudó 2+ veces", () => {
    const ex = makeExercise({ id: "ex-9", category: null, evidence_level: null });
    const withEff = scoreExercise(
      ex,
      makeCtx({ effectiveness: { "ex-9": { helped: 3, total: 4 } } })
    );
    const without = scoreExercise(ex, makeCtx());
    expect(withEff.score - without.score).toBe(3);
    expect(withEff.reasons).toContain("Te ha ayudado 3 veces");
  });

  it("no aplica boost si helped es 0", () => {
    const ex = makeExercise({ id: "ex-9", category: null, evidence_level: null });
    const withEff = scoreExercise(
      ex,
      makeCtx({ effectiveness: { "ex-9": { helped: 0, total: 2 } } })
    );
    const without = scoreExercise(ex, makeCtx());
    expect(withEff.score).toBe(without.score);
  });

  it("+2 por evidencia 'high'", () => {
    const high = scoreExercise(
      makeExercise({ evidence_level: "high", category: null }),
      makeCtx()
    );
    const moderate = scoreExercise(
      makeExercise({ evidence_level: "moderate", category: null }),
      makeCtx()
    );
    expect(high.score - moderate.score).toBe(2);
  });

  it("+1 si la duración cabe en el tiempo disponible", () => {
    const ex = makeExercise({
      duration_seconds: 120,
      category: null,
      evidence_level: null,
    });
    // 10 min = 600s, cabe
    expect(scoreExercise(ex, makeCtx({ timeAvailable: 10 })).score).toBe(1);
  });

  it("-2 y razón cuando dura más de lo disponible", () => {
    const ex = makeExercise({
      duration_seconds: 600,
      category: null,
      evidence_level: null,
    });
    // 5 min = 300s < 600s → no cabe
    const result = scoreExercise(ex, makeCtx({ timeAvailable: 5 }));
    expect(result.score).toBe(-2);
    expect(result.reasons).toContain("Dura más de lo que tienes");
  });

  it("acumula puntajes de varias reglas a la vez", () => {
    // feeling(+5) + diagnóstico breathing(+2) + calming(+1) + high(+2) + cabe(+1) = 11
    const ex = makeExercise({
      category: "breathing",
      targets: ["ansioso"],
      evidence_level: "high",
      duration_seconds: 120,
    });
    const ctx = makeCtx({
      feeling: "ansioso",
      diagnoses: ["ansiedad"],
      calmingInputs: ["slow_breathing"],
      timeAvailable: 10,
    });
    expect(scoreExercise(ex, ctx).score).toBe(11);
  });

  it("trata 'targets' inválido (no-array) como vacío sin romper", () => {
    const ex = makeExercise({
      targets: "no soy un array" as unknown as Exercise["targets"],
      category: null,
      evidence_level: null,
    });
    const result = scoreExercise(ex, makeCtx({ feeling: "ansioso" }));
    // No suma el +5 de feeling porque targets se normaliza a []
    expect(result.score).toBe(1); // solo el +1 de duración
  });
});

describe("recommendExercises", () => {
  it("ordena de mayor a menor score", () => {
    const best = makeExercise({
      id: "best",
      category: "breathing",
      targets: ["ansioso"],
      evidence_level: "high",
    });
    const mid = makeExercise({
      id: "mid",
      category: "breathing",
      evidence_level: "moderate",
    });
    const low = makeExercise({
      id: "low",
      category: "body",
      evidence_level: null,
    });
    const ctx = makeCtx({ feeling: "ansioso", diagnoses: ["ansiedad"] });

    const ranked = recommendExercises([low, best, mid], ctx);
    expect(ranked.map((r) => r.exercise.id)).toEqual(["best", "mid", "low"]);
  });

  it("filtra los ejercicios excluidos por movilidad", () => {
    const ok = makeExercise({ id: "ok", mobility_required: "still" });
    const excluded = makeExercise({ id: "no", mobility_required: "seated" });
    const ranked = recommendExercises([ok, excluded], makeCtx({ mobility: "still" }));
    expect(ranked.map((r) => r.exercise.id)).toEqual(["ok"]);
  });

  it("retorna lista vacía si no hay ejercicios", () => {
    expect(recommendExercises([], makeCtx())).toEqual([]);
  });

  it("produce el mismo score con o sin hints precomputados (consistencia)", () => {
    const ex = makeExercise({
      category: "breathing",
      targets: ["ansioso"],
      evidence_level: "high",
    });
    const ctx = makeCtx({
      feeling: "ansioso",
      diagnoses: ["ansiedad"],
      calmingInputs: ["slow_breathing"],
    });
    const viaRecommend = recommendExercises([ex], ctx)[0]?.score;
    const direct = scoreExercise(ex, ctx).score;
    expect(viaRecommend).toBe(direct);
  });
});
