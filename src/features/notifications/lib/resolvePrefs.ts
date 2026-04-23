import type { NotificationPreferences } from "@/src/types/database.types";

/**
 * Valores por defecto si el usuario nunca guardó una fila.
 *
 * Puro: extraído del hook para poder testear `resolvePrefs` sin cargar
 * supabase / react-query. Se re-exporta desde el hook por compatibilidad.
 */
export const DEFAULT_NOTIF_PREFS: Omit<
  NotificationPreferences,
  "user_id" | "updated_at"
> = {
  daily_checkin_enabled: false,
  daily_checkin_hour: 20,
  daily_checkin_minute: 0,
  exercise_reminder_enabled: false,
  exercise_reminder_days: 3,
  post_crisis_checkin_enabled: false,
};

/**
 * Resuelve las prefs efectivas: la fila del usuario si existe, o los
 * defaults. Todas las notificaciones vienen apagadas por defecto — es
 * importante que nadie reciba un push sin haberlo activado explícito.
 */
export function resolvePrefs(
  raw: NotificationPreferences | null | undefined
): NotificationPreferences {
  if (raw) return raw;
  return {
    user_id: "",
    ...DEFAULT_NOTIF_PREFS,
    updated_at: new Date().toISOString(),
  };
}
