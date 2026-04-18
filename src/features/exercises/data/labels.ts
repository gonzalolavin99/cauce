import type {
  EvidenceLevel,
  ExerciseCategory,
} from "@/src/types/database.types";

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  breathing: "Respiración",
  grounding: "Anclaje",
  body: "Cuerpo",
  sensory: "Sensorial",
  distress_tolerance: "Tolerancia",
};

export const CATEGORY_HINTS: Record<ExerciseCategory, string> = {
  breathing: "Respirar con ritmo baja la activación",
  grounding: "Volver al presente y al cuerpo",
  body: "Liberar tensión acumulada",
  sensory: "Regular input sensorial",
  distress_tolerance: "Sobrevivir un momento muy difícil",
};

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  high: "Evidencia alta",
  moderate: "Evidencia moderada",
  emerging: "Evidencia emergente",
};

export const CATEGORY_ORDER: ExerciseCategory[] = [
  "breathing",
  "grounding",
  "body",
  "sensory",
  "distress_tolerance",
];
