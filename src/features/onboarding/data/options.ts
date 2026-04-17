import type { Diagnosis } from "@/src/types/database.types";

export const DIAGNOSIS_OPTIONS: { value: Diagnosis; label: string; hint?: string }[] = [
  { value: "tdah", label: "TDAH", hint: "Déficit atencional" },
  { value: "tea", label: "TEA", hint: "Autismo" },
  { value: "ansiedad", label: "Ansiedad" },
  { value: "otro", label: "Otro" },
  { value: "ninguno", label: "Ninguno / no lo sé" },
];

export const CALMING_INPUTS = [
  { value: "nature_sounds", label: "Sonidos de naturaleza" },
  { value: "white_noise", label: "Ruido blanco o marrón" },
  { value: "silence", label: "Silencio total" },
  { value: "pressure", label: "Presión / peso en el cuerpo" },
  { value: "rhythmic_movement", label: "Movimiento rítmico" },
  { value: "cold", label: "Frío (agua, hielo)" },
  { value: "darkness", label: "Oscuridad o luz tenue" },
  { value: "soft_voice", label: "Voz suave que me guíe" },
  { value: "slow_breathing", label: "Respirar lento" },
];

export const TRIGGERING_INPUTS = [
  { value: "loud_noise", label: "Ruidos fuertes" },
  { value: "bright_light", label: "Luces brillantes" },
  { value: "crowds", label: "Multitudes" },
  { value: "unexpected_touch", label: "Tacto inesperado" },
  { value: "strong_smells", label: "Olores intensos" },
  { value: "time_pressure", label: "Presión de tiempo" },
];