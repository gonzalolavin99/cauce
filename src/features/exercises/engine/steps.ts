import type { ExerciseStep } from "@/src/types/database.types";
import { z } from "zod";

const introSchema = z.object({
  type: z.literal("intro"),
  text: z.string(),
  seconds: z.number().nonnegative(),
});

const promptSchema = z.object({
  type: z.literal("prompt"),
  text: z.string(),
  seconds: z.number().nonnegative(),
});

const outroSchema = z.object({
  type: z.literal("outro"),
  text: z.string(),
  seconds: z.number().nonnegative(),
});

const phaseSchema = z.object({
  label: z.string(),
  seconds: z.number().positive(),
});

const cycleSchema = z.object({
  type: z.literal("cycle"),
  phases: z.array(phaseSchema).min(1),
  repeat: z.number().int().positive(),
});

export const stepSchema = z.discriminatedUnion("type", [
  introSchema,
  promptSchema,
  outroSchema,
  cycleSchema,
]);

export const stepsSchema = z.array(stepSchema).min(1);

/**
 * Intenta parsear el campo `steps` (Json) de un ejercicio.
 * Retorna null si el JSON es inválido o no matchea el schema — el caller
 * puede usar eso para caer a un fallback (ej. BoxBreathing clásico).
 */
export function parseSteps(steps: unknown): ExerciseStep[] | null {
  const result = stepsSchema.safeParse(steps);
  if (!result.success) return null;
  return result.data as ExerciseStep[];
}
