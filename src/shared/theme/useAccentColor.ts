import { useColorScheme } from "nativewind";

/**
 * Acento river para props nativas (`color` de Ionicons, etc.) que no pueden
 * usar las CSS variables del tema (3.1). En oscuro el teal profundo no
 * contrasta, así que se aclara.
 */
export function useAccentColor(): string {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? "#9CC6C7" : "#2F6D6E";
}
