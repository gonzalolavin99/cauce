import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import type { NotificationPreferences } from "@/src/types/database.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Valores por defecto si el usuario nunca guardó una fila. */
export const DEFAULT_NOTIF_PREFS: Omit<NotificationPreferences, "user_id" | "updated_at"> = {
  daily_checkin_enabled: false,
  daily_checkin_hour: 20,
  daily_checkin_minute: 0,
  exercise_reminder_enabled: false,
  exercise_reminder_days: 3,
  post_crisis_checkin_enabled: false,
};

/**
 * Devuelve las preferencias de notificaciones. Si no hay fila todavía,
 * devuelve los defaults (todo OFF) en lugar de null para simplificar la UI.
 */
export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery<NotificationPreferences | null>({
    queryKey: ["notification-preferences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data as NotificationPreferences) ?? null;
    },
  });
}

export interface NotificationPrefsInput {
  daily_checkin_enabled?: boolean;
  daily_checkin_hour?: number;
  daily_checkin_minute?: number;
  exercise_reminder_enabled?: boolean;
  exercise_reminder_days?: number;
  post_crisis_checkin_enabled?: boolean;
}

/**
 * Upsert de las preferencias. Se fusiona con las actuales y se manda todo;
 * así el caller puede togglear una sola flag sin preocuparse del resto.
 */
export function useUpsertNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, NotificationPrefsInput>({
    mutationFn: async (input) => {
      if (!user) throw new Error("No autenticado");

      // Traemos el estado actual (o defaults) para hacer un merge limpio.
      const { data: current } = await supabase
        .from("notification_preferences")
        .select("*")
        .maybeSingle();

      const merged = {
        user_id: user.id,
        ...DEFAULT_NOTIF_PREFS,
        ...(current ?? {}),
        ...input,
      };

      const { error } = await (
        supabase.from("notification_preferences") as any
      ).upsert(merged, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}

/** Resuelve las prefs efectivas: fila del usuario o defaults. */
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
