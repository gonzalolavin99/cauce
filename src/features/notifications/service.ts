import { Platform } from "react-native";

// ============================================================
// Compatibilidad con Expo Go
// ============================================================
//
// `expo-notifications` requiere módulo nativo y NO funciona en Expo Go
// desde SDK 53+. Mientras no hagamos dev build (EAS Build → iOS), este
// archivo actúa como stub: todas las funciones son no-op silenciosas.
//
// Para activar notificaciones reales:
//   1. `bunx expo install expo-notifications`
//   2. Dev build con EAS o `expo run:*`
//   3. Reemplazar este archivo por la versión real (git blame de este
//      archivo tiene la versión que usa el módulo nativo) — o cambiar
//      NOTIFICATIONS_ACTIVE a true y volver a importar el módulo.
//
// El resto de la app (tabla de preferencias, hooks, UI de toggles)
// sigue funcionando: la persona puede guardar sus prefs, sólo no se
// disparan recordatorios.

const NOTIFICATIONS_ACTIVE = false;

// ============================================================
// Canales / tags
// ============================================================

export const NOTIF_TAG = {
  DAILY_CHECKIN: "cauce.daily_checkin",
  EXERCISE_NUDGE: "cauce.exercise_nudge",
  POST_CRISIS: "cauce.post_crisis",
} as const;

export type NotifTag = (typeof NOTIF_TAG)[keyof typeof NOTIF_TAG];

// ============================================================
// Public API — todos los stubs son no-op seguros
// ============================================================

export function isNotificationsAvailable(): boolean {
  return NOTIFICATIONS_ACTIVE;
}

export function configureForegroundBehavior(): void {
  // no-op en Expo Go
}

export function addTapListener(
  _onTapRoute: (route: string) => void
): { remove: () => void } {
  return { remove: () => {} };
}

export async function ensureNotificationPermission(): Promise<boolean> {
  return false;
}

export async function hasNotificationPermission(): Promise<boolean> {
  return false;
}

export async function ensureAndroidChannel(): Promise<void> {
  // no-op; dejamos el Platform.OS referenciado para evitar warning de import
  if (Platform.OS === "android") return;
}

export async function cancelByTag(_tag: NotifTag): Promise<void> {
  // no-op
}

export async function cancelAllCauce(): Promise<void> {
  // no-op
}

export interface DailyCheckinInput {
  hour: number;
  minute: number;
}

export async function scheduleDailyCheckin(
  _input: DailyCheckinInput
): Promise<string | null> {
  return null;
}

export interface ExerciseNudgeInput {
  inDays: number;
}

export async function scheduleExerciseNudge(
  _input: ExerciseNudgeInput
): Promise<string | null> {
  return null;
}

export async function schedulePostCrisisCheckin(): Promise<string | null> {
  return null;
}

export async function listCauceScheduled(): Promise<unknown[]> {
  return [];
}
