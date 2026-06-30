import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";

// Modo de tema (3.1): "system" sigue al SO; "light"/"dark" son overrides
// manuales. Preferencia POR DISPOSITIVO (AsyncStorage, no DB).

export type ThemeMode = "system" | "light" | "dark";

const KEY = "cauce-theme-mode";

export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** Aplica el modo (clase `dark` vía nativewind) y lo persiste. */
export async function setThemeMode(mode: ThemeMode): Promise<void> {
  colorScheme.set(mode);
  try {
    await AsyncStorage.setItem(KEY, mode);
  } catch {
    // si no se pudo persistir, el modo igual queda aplicado en esta sesión
  }
}

/** Llamar una vez al arrancar, antes del primer render con tema. */
export async function initThemeMode(): Promise<void> {
  colorScheme.set(await getThemeMode());
}
