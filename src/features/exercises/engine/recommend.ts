import type {
    Diagnosis,
    Exercise,
    Feeling,
    Mobility,
} from "@/src/types/database.types";

export interface RecommendationContext {
  diagnoses: Diagnosis[];
  /** Feeling actual del usuario — si está presente, se usa para matchear targets */
  feeling?: Feeling;
  /** Preferencias sensoriales del usuario — boost leve cuando hay alineación con categoría */
  calmingInputs: string[];
  timeAvailable: number; // minutos
  mobility: Mobility;
}

export interface ScoredExercise {
  exercise: Exercise;
  score: number;
  reasons: string[];
}

/**
 * Mapeo diagnóstico → categorías de ejercicio que suelen ayudar.
 * Basado en literatura general; no sustituye valoración clínica.
 */
const DIAGNOSIS_CATEGORY_HINTS: Record<Diagnosis, string[]> = {
  ansiedad: ["breathing", "grounding"],
  tdah: ["body", "sensory", "breathing"],
  tea: ["sensory", "grounding"],
  depresion: ["body", "grounding"],
  borderline: ["distress_tolerance", "grounding", "breathing"],
  bipolar: ["grounding", "breathing"],
  trauma: ["grounding", "sensory", "body"],
  toc: ["distress_tolerance", "grounding"],
  otro: [],
  ninguno: [],
};

/**
 * Mapeo preferencia sensorial calmante → categorías de ejercicio afines.
 * Permite que el engine priorice ejercicios que *sensorialmente* le acomodan
 * al usuario aunque las keys no coincidan 1:1 con los tags de los ejercicios.
 */
const CALMING_CATEGORY_HINTS: Record<string, string[]> = {
  slow_breathing: ["breathing"],
  pressure: ["body", "sensory"],
  rhythmic_movement: ["body"],
  silence: ["grounding", "sensory"],
  darkness: ["sensory"],
  cold: ["distress_tolerance"],
  soft_voice: [],
  nature_sounds: [],
  white_noise: [],
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function mobilityCompatible(
  required: string | null | undefined,
  userMobility: Mobility
): boolean {
  if (!required || required === "any") return true;
  if (userMobility === "any") return true;
  if (
    userMobility === "seated" &&
    (required === "seated" || required === "still")
  )
    return true;
  if (userMobility === "still" && required === "still") return true;
  return false;
}

/**
 * Hints precomputados a partir del contexto. Se calculan UNA vez por
 * recomendación (no por ejercicio) para evitar reconstruir los Sets en cada
 * iteración de `recommendExercises`.
 */
interface PrecomputedHints {
  preferredByDiagnosis: Set<string>;
  preferredByCalming: Set<string>;
}

function precomputeHints(ctx: RecommendationContext): PrecomputedHints {
  return {
    preferredByDiagnosis: new Set(
      ctx.diagnoses.flatMap((d) => DIAGNOSIS_CATEGORY_HINTS[d] ?? [])
    ),
    preferredByCalming: new Set(
      ctx.calmingInputs.flatMap((c) => CALMING_CATEGORY_HINTS[c] ?? [])
    ),
  };
}

export function scoreExercise(
  exercise: Exercise,
  ctx: RecommendationContext,
  hints: PrecomputedHints = precomputeHints(ctx)
): ScoredExercise {
  const targets = toStringArray(exercise.targets);
  const reasons: string[] = [];
  let score = 0;

  // Filtro duro: movilidad incompatible → excluir
  if (!mobilityCompatible(exercise.mobility_required, ctx.mobility)) {
    return { exercise, score: -1000, reasons: ["Requiere más movilidad"] };
  }

  // +5: el ejercicio targetea explícitamente cómo te sientes ahora
  if (ctx.feeling && targets.includes(ctx.feeling)) {
    score += 5;
    reasons.push(`Para cuando estás ${ctx.feeling}`);
  }

  // +2 por cada diagnóstico del usuario cuya categoría recomendada matchee
  if (exercise.category && hints.preferredByDiagnosis.has(exercise.category)) {
    score += 2;
    reasons.push("Recomendado para tu perfil");
  }

  // +1 por cada preferencia sensorial que sugiere esta categoría
  if (exercise.category && hints.preferredByCalming.has(exercise.category)) {
    score += 1;
    reasons.push("Alineado con lo que te calma");
  }

  // +2 evidencia alta
  if (exercise.evidence_level === "high") {
    score += 2;
  }

  // Duración vs tiempo disponible
  const availableSeconds = ctx.timeAvailable * 60;
  if (exercise.duration_seconds <= availableSeconds) {
    score += 1;
  } else {
    score -= 2;
    reasons.push("Dura más de lo que tienes");
  }

  return { exercise, score, reasons };
}

export function recommendExercises(
  exercises: Exercise[],
  ctx: RecommendationContext
): ScoredExercise[] {
  // Precomputamos los hints una sola vez y los reutilizamos en cada scoring.
  const hints = precomputeHints(ctx);
  return exercises
    .map((ex) => scoreExercise(ex, ctx, hints))
    .filter((s) => s.score > -100)
    .sort((a, b) => b.score - a.score);
}
