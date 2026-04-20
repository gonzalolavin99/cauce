import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import type {
  NotificationPreferences,
  RegulationSession,
} from "@/src/types/database.types";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  cancelByTag,
  ensureAndroidChannel,
  hasNotificationPermission,
  NOTIF_TAG,
  scheduleDailyCheckin,
  scheduleExerciseNudge,
} from "@/src/features/notifications/service";
import { resolvePrefs, useNotificationPreferences } from "./useNotificationPreferences";

/**
 * Devuelve la fecha (ms) del último completed regulation session del usuario,
 * o null si nunca completó ninguno. Usado para calcular el día del próximo
 * "nudge" por inactividad.
 */
function useLastRegulationAt() {
  const { user } = useAuth();
  return useQuery<number | null>({
    queryKey: ["last-regulation-at", user?.id],
    enabled: !!user,
    // No tan fresco, no necesitamos re-fetch constantemente
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regulation_sessions")
        .select("completed_at")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const row = data as Pick<RegulationSession, "completed_at"> | null;
      if (!row?.completed_at) return null;
      const t = new Date(row.completed_at).getTime();
      return Number.isFinite(t) ? t : null;
    },
  });
}

/**
 * Reconcilia las scheduled notifications locales con las preferencias del
 * usuario. Se ejecuta cada vez que cambian las prefs o el estado de auth.
 *
 * - Requiere permiso de notificaciones; si no está, no hace nada (el toggle
 *   en UI lo pide).
 * - Para el check-in diario: una trigger daily a la hora configurada.
 * - Para el nudge de ejercicios: calcula "última sesión + N días" y agenda
 *   one-shot en ese momento. Si no hay sesión previa, usa hoy como base.
 * - Para post-crisis: lo agenda el chat on-demand, no este hook.
 */
export function useScheduleNotifications() {
  const { isAuthenticated } = useAuth();
  const { data: rawPrefs, isLoading: prefsLoading } =
    useNotificationPreferences();
  const { data: lastRegAt, isLoading: lastRegLoading } =
    useLastRegulationAt();

  // Firma simple de "qué valores vigentes son" para evitar replans redundantes.
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (prefsLoading || lastRegLoading) return;

    const prefs = resolvePrefs(rawPrefs);
    const signature = buildSignature(prefs, lastRegAt ?? null);
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;

    // Fire-and-forget: reconcilia sin bloquear render.
    void reconcile(prefs, lastRegAt ?? null);
  }, [isAuthenticated, rawPrefs, lastRegAt, prefsLoading, lastRegLoading]);
}

function buildSignature(
  prefs: NotificationPreferences,
  lastRegAt: number | null
): string {
  return [
    prefs.daily_checkin_enabled,
    prefs.daily_checkin_hour,
    prefs.daily_checkin_minute,
    prefs.exercise_reminder_enabled,
    prefs.exercise_reminder_days,
    lastRegAt ?? "none",
  ].join("|");
}

async function reconcile(
  prefs: NotificationPreferences,
  lastRegAt: number | null
): Promise<void> {
  try {
    const granted = await hasNotificationPermission();
    if (!granted) {
      // Sin permiso no podemos agendar. Aseguramos limpio por si antes había.
      await cancelByTag(NOTIF_TAG.DAILY_CHECKIN);
      await cancelByTag(NOTIF_TAG.EXERCISE_NUDGE);
      return;
    }

    await ensureAndroidChannel();

    // --- Daily check-in ---
    if (prefs.daily_checkin_enabled) {
      await scheduleDailyCheckin({
        hour: prefs.daily_checkin_hour,
        minute: prefs.daily_checkin_minute,
      });
    } else {
      await cancelByTag(NOTIF_TAG.DAILY_CHECKIN);
    }

    // --- Exercise nudge por inactividad ---
    if (prefs.exercise_reminder_enabled) {
      const threshold = prefs.exercise_reminder_days;
      const base = lastRegAt ?? Date.now();
      const daysSince = Math.floor((Date.now() - base) / (24 * 60 * 60 * 1000));
      const daysUntilNudge = Math.max(1, threshold - daysSince);
      await scheduleExerciseNudge({ inDays: daysUntilNudge });
    } else {
      await cancelByTag(NOTIF_TAG.EXERCISE_NUDGE);
    }
  } catch (err) {
    // No queremos reventar la app por fallo de scheduler.
    // eslint-disable-next-line no-console
    console.warn("[notifications] reconcile failed", err);
  }
}
