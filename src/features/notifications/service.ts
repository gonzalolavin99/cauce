import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ============================================================
// Canales / categorías
// ============================================================

/**
 * Identificadores de tags para reconciliar scheduled notifications.
 * Cada categoría cancela y reprograma su propio grupo.
 */
export const NOTIF_TAG = {
  DAILY_CHECKIN: "cauce.daily_checkin",
  EXERCISE_NUDGE: "cauce.exercise_nudge",
  POST_CRISIS: "cauce.post_crisis",
} as const;

export type NotifTag = (typeof NOTIF_TAG)[keyof typeof NOTIF_TAG];

// ============================================================
// Permisos
// ============================================================

/**
 * Pide permiso sólo si no lo tenemos. Devuelve true si está concedido.
 * En iOS el prompt se muestra una única vez; en Android 13+ también
 * requiere runtime permission desde SDK 33.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return status === "granted";
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

// ============================================================
// Android channel
// ============================================================

/**
 * Android necesita canales declarados para que las notificaciones se
 * vean con importancia correcta. Un único canal "gentle" para todo;
 * la app usa notificaciones suaves, no urgentes.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("gentle", {
    name: "Recordatorios suaves",
    description: "Check-ins y empujones amables de Cauce.",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
    vibrationPattern: [0, 180, 100, 180],
    lightColor: "#5F8FA3",
    enableVibrate: true,
  });
}

// ============================================================
// Cancel por tag
// ============================================================

/**
 * Cancela todas las scheduled notifications cuyo `data.tag` coincida.
 * Ideal para reconciliar cuando cambian preferencias.
 */
export async function cancelByTag(tag: NotifTag): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => {
        const data = n.content.data as { tag?: string } | null | undefined;
        return data?.tag === tag;
      })
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

export async function cancelAllCauce(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => {
        const data = n.content.data as { tag?: string } | null | undefined;
        return typeof data?.tag === "string" && data.tag.startsWith("cauce.");
      })
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

// ============================================================
// Schedule: check-in diario
// ============================================================

export interface DailyCheckinInput {
  hour: number;
  minute: number;
}

/**
 * Programa un recordatorio diario a la hora local indicada.
 * Cancela los existentes del mismo tag antes de programar uno nuevo.
 */
export async function scheduleDailyCheckin(
  input: DailyCheckinInput
): Promise<string | null> {
  await cancelByTag(NOTIF_TAG.DAILY_CHECKIN);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "¿Cómo estás?",
      body: "Un minuto para anotar tu estado.",
      sound: "default",
      data: { tag: NOTIF_TAG.DAILY_CHECKIN, route: "/mood" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: clampHour(input.hour),
      minute: clampMinute(input.minute),
      channelId: Platform.OS === "android" ? "gentle" : undefined,
    },
  });
  return id;
}

// ============================================================
// Schedule: empujón por inactividad en ejercicios
// ============================================================

export interface ExerciseNudgeInput {
  /** Días desde hoy para disparar el recordatorio. */
  inDays: number;
}

/**
 * Programa un único recordatorio en N días. El caller decide cuándo
 * llamar (p.ej. tras completar una sesión, empuja el próximo en +N
 * días). Cancela el anterior si existe.
 *
 * Implementado como one-shot a hora fija (20:00 local) del día N.
 */
export async function scheduleExerciseNudge(
  input: ExerciseNudgeInput
): Promise<string | null> {
  await cancelByTag(NOTIF_TAG.EXERCISE_NUDGE);

  const days = Math.max(1, Math.min(14, Math.round(input.inDays)));
  const target = new Date();
  target.setDate(target.getDate() + days);
  target.setHours(20, 0, 0, 0);

  // Si por algún cálculo raro quedara en el pasado, saltamos al mismo día siguiente.
  if (target.getTime() <= Date.now()) {
    target.setDate(target.getDate() + 1);
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "¿Un ejercicio corto?",
      body: "Hace unos días sin regular. Algo de 2 minutos puede ayudar.",
      sound: "default",
      data: { tag: NOTIF_TAG.EXERCISE_NUDGE, route: "/regulate" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target,
      channelId: Platform.OS === "android" ? "gentle" : undefined,
    },
  });
  return id;
}

// ============================================================
// Schedule: check-in 24h post-crisis
// ============================================================

/**
 * Programa un único check-in 24h después de una detección de crisis.
 * Cancela el anterior: si vuelve a haber crisis, el nuevo reemplaza al viejo
 * (más reciente manda).
 */
export async function schedulePostCrisisCheckin(): Promise<string | null> {
  await cancelByTag(NOTIF_TAG.POST_CRISIS);

  const target = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "¿Cómo estás hoy?",
      body: "Ayer fue un momento difícil. ¿Te cuentas un poco?",
      sound: "default",
      data: { tag: NOTIF_TAG.POST_CRISIS, route: "/mood" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target,
      channelId: Platform.OS === "android" ? "gentle" : undefined,
    },
  });
  return id;
}

// ============================================================
// Helpers
// ============================================================

function clampHour(h: number): number {
  if (!Number.isFinite(h)) return 20;
  return Math.max(0, Math.min(23, Math.round(h)));
}

function clampMinute(m: number): number {
  if (!Number.isFinite(m)) return 0;
  return Math.max(0, Math.min(59, Math.round(m)));
}

/** Devuelve las scheduled de Cauce (útil para debugging). */
export async function listCauceScheduled() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter((n) => {
    const data = n.content.data as { tag?: string } | null | undefined;
    return typeof data?.tag === "string" && data.tag.startsWith("cauce.");
  });
}
