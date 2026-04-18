export type MoodValue =
  | "bien"
  | "neutral"
  | "bajo"
  | "ansioso"
  | "sobrecargado"
  | "agitado";

export const MOOD_OPTIONS: {
  value: MoodValue;
  label: string;
  emoji: string;
}[] = [
  { value: "bien", label: "Bien", emoji: "🙂" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "bajo", label: "Bajoneado", emoji: "😔" },
  { value: "ansioso", label: "Ansioso", emoji: "😰" },
  { value: "sobrecargado", label: "Sobrecargado", emoji: "😵" },
  { value: "agitado", label: "Agitado", emoji: "😤" },
];

export const MOOD_LABELS: Record<MoodValue, string> = Object.fromEntries(
  MOOD_OPTIONS.map((o) => [o.value, o.label])
) as Record<MoodValue, string>;

export const MOOD_EMOJI: Record<MoodValue, string> = Object.fromEntries(
  MOOD_OPTIONS.map((o) => [o.value, o.emoji])
) as Record<MoodValue, string>;

export const ENERGY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Muy baja" },
  { value: 2, label: "Baja" },
  { value: 3, label: "Media" },
  { value: 4, label: "Alta" },
  { value: 5, label: "Muy alta" },
];
