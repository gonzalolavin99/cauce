import { useColorScheme } from "nativewind";

// Valores espejo de las CSS variables de global.css (`:root` / `.dark:root`),
// para props nativas (`color` de Ionicons, `stroke` de SVG, `trackColor`,
// colores inline de Animated) que no pueden usar las clases de NativeWind.
// Si cambias la paleta en global.css, actualiza también esta tabla.
const RIVER = {
  50: { light: "#EEF5F5", dark: "#1C2A2B" },
  100: { light: "#D6E7E7", dark: "#2A3D3E" },
  300: { light: "#8FBDBE", dark: "#6FA3A4" },
  500: { light: "#4E8B8C", dark: "#5FA3A4" },
  700: { light: "#2E5F60", dark: "#9CC6C7" },
  900: { light: "#193838", dark: "#D6E7E7" },
} as const;

export type RiverShade = keyof typeof RIVER;

/**
 * Color river theme-aware para props nativas que no aceptan className.
 * Complementa a `useAccentColor` (que cubre el caso decorativo general)
 * cuando se necesita un shade específico de la paleta.
 */
export function useRiverColor(shade: RiverShade): string {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? RIVER[shade].dark : RIVER[shade].light;
}
