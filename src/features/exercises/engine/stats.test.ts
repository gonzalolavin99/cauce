import { describe, expect, it } from "vitest";
import { computeExerciseStats } from "./stats";

const exercises = [
  { id: "a", category: "breathing", duration_seconds: 120 },
  { id: "b", category: "grounding", duration_seconds: 300 },
  { id: "c", category: "breathing", duration_seconds: 60 },
];

describe("computeExerciseStats", () => {
  it("cuenta solo sesiones completadas", () => {
    const r = computeExerciseStats(
      [
        { exercise_id: "a", completed_at: "2026-06-10T10:00:00Z" },
        { exercise_id: "b", completed_at: null }, // no completada
      ],
      exercises
    );
    expect(r.completed).toBe(1);
  });

  it("suma minutos por duración del ejercicio", () => {
    const r = computeExerciseStats(
      [
        { exercise_id: "a", completed_at: "x" }, // 120s
        { exercise_id: "b", completed_at: "x" }, // 300s
      ],
      exercises
    );
    expect(r.totalMinutes).toBe(7); // 420s → 7 min
  });

  it("agrupa por categoría ordenado desc", () => {
    const r = computeExerciseStats(
      [
        { exercise_id: "a", completed_at: "x" },
        { exercise_id: "c", completed_at: "x" },
        { exercise_id: "b", completed_at: "x" },
      ],
      exercises
    );
    expect(r.byCategory).toEqual([
      { category: "breathing", count: 2 },
      { category: "grounding", count: 1 },
    ]);
  });

  it("ignora sesiones de ejercicios desconocidos", () => {
    const r = computeExerciseStats(
      [{ exercise_id: "zzz", completed_at: "x" }],
      exercises
    );
    expect(r.completed).toBe(1);
    expect(r.totalMinutes).toBe(0);
    expect(r.byCategory).toEqual([]);
  });

  it("sin sesiones → ceros", () => {
    const r = computeExerciseStats([], exercises);
    expect(r).toEqual({ completed: 0, totalMinutes: 0, byCategory: [] });
  });
});
