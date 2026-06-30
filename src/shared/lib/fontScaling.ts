import { Text, TextInput } from "react-native";

/**
 * 11.2.2 — Escalado de fuente del sistema (Dynamic Type / tamaño de fuente).
 *
 * Por defecto RN ya escala el texto con la preferencia del sistema. Acá solo
 * ACOTAMOS ese escalado con un multiplicador máximo: queremos respetar a quien
 * usa fuentes grandes (accesibilidad), pero sin que tamaños extremos rompan
 * los layouts (botones, tarjetas, single-line). 1.5x es un punto medio típico.
 *
 * Se llama una vez desde el layout raíz.
 */
const MAX_FONT_SCALE = 1.5;

export function configureFontScaling(): void {
  // `defaultProps` es la única vía global en RN para esto. No está tipado.
  const text = Text as unknown as {
    defaultProps?: Record<string, unknown>;
  };
  text.defaultProps = {
    ...(text.defaultProps ?? {}),
    allowFontScaling: true,
    maxFontSizeMultiplier: MAX_FONT_SCALE,
  };

  const input = TextInput as unknown as {
    defaultProps?: Record<string, unknown>;
  };
  input.defaultProps = {
    ...(input.defaultProps ?? {}),
    allowFontScaling: true,
    maxFontSizeMultiplier: MAX_FONT_SCALE,
  };
}
