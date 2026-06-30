import { useColorScheme } from "nativewind";

/**
 * Color de placeholder según tema (3.1). `placeholderTextColor` es una prop
 * nativa (no clase), así que no puede usar las CSS variables del tema.
 */
export function usePlaceholderColor(): string {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark"
    ? "rgba(232, 230, 225, 0.5)"
    : "rgba(26, 31, 43, 0.55)";
}
