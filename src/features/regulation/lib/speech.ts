import * as Speech from "expo-speech";

/**
 * Voz hablada de los ejercicios.
 *
 * La voz por defecto del sistema suele ser la "compacta" (robótica). Acá
 * elegimos, una sola vez, la mejor voz en español disponible en el dispositivo
 * (preferimos calidad Enhanced y variantes latinoamericanas) y la cacheamos.
 * Ajustamos ritmo y tono para un registro más cálido y calmo.
 *
 * Degrada con gracia: si no hay voces o falla la consulta, usa la voz por
 * defecto con los mismos parámetros de ritmo/tono.
 */

// undefined = sin resolver; null = no se encontró una preferida (usar default).
let preferredVoice: string | null | undefined;

// Orden de preferencia de variantes de español (más cálidas/neutras primero).
const LANG_PREFERENCE = ["es-mx", "es-us", "es-419", "es-cl", "es-es", "es"];

async function resolveVoice(): Promise<string | null> {
  if (preferredVoice !== undefined) return preferredVoice;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const es = voices.filter((v) =>
      v.language?.toLowerCase().startsWith("es")
    );
    if (es.length === 0) {
      preferredVoice = null;
      return preferredVoice;
    }

    // Preferimos voces de alta calidad (Enhanced) si las hay.
    const enhanced = es.filter(
      (v) => v.quality === Speech.VoiceQuality.Enhanced
    );
    const pool = enhanced.length > 0 ? enhanced : es;

    let chosen: Speech.Voice | undefined;
    for (const lang of LANG_PREFERENCE) {
      chosen = pool.find((v) => v.language?.toLowerCase().startsWith(lang));
      if (chosen) break;
    }
    chosen = chosen ?? pool[0];

    preferredVoice = chosen?.identifier ?? null;
  } catch {
    preferredVoice = null;
  }
  return preferredVoice;
}

/** Pre-carga la voz preferida para que el primer "habla" no tenga lag. */
export function primeVoice(): void {
  void resolveVoice();
}

/** Habla un texto con la voz cálida elegida. Corta cualquier locución previa. */
export async function speakCalm(text: string): Promise<void> {
  const voice = await resolveVoice();
  Speech.stop();
  Speech.speak(text, {
    language: "es-CL",
    rate: 0.86, // un poco más lento = más calmo
    pitch: 0.98, // tono ligeramente más bajo = más cálido
    ...(voice ? { voice } : {}),
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
