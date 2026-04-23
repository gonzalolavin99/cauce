import { describe, expect, it } from "vitest";
import type { NotificationPreferences } from "@/src/types/database.types";
import { DEFAULT_NOTIF_PREFS, resolvePrefs } from "./resolvePrefs";

/**
 * Tests de `resolvePrefs`. Este helper decide qué prefs muestra la UI
 * cuando el usuario nunca guardó nada. Es crítico que los defaults sean
 * todos OFF — nadie debe recibir un push sin haberlo activado explícito.
 */

describe("DEFAULT_NOTIF_PREFS", () => {
  it("todos los switches vienen en false por defecto", () => {
    expect(DEFAULT_NOTIF_PREFS.daily_checkin_enabled).toBe(false);
    expect(DEFAULT_NOTIF_PREFS.exercise_reminder_enabled).toBe(false);
    expect(DEFAULT_NOTIF_PREFS.post_crisis_checkin_enabled).toBe(false);
  });

  it("hora del check-in default = 20:00 (noche, no mañana)", () => {
    expect(DEFAULT_NOTIF_PREFS.daily_checkin_hour).toBe(20);
    expect(DEFAULT_NOTIF_PREFS.daily_checkin_minute).toBe(0);
  });

  it("umbral de inactividad default = 3 días", () => {
    expect(DEFAULT_NOTIF_PREFS.exercise_reminder_days).toBe(3);
  });
});

describe("resolvePrefs", () => {
  it("retorna defaults si input es null", () => {
    const r = resolvePrefs(null);
    expect(r.daily_checkin_enabled).toBe(false);
    expect(r.exercise_reminder_enabled).toBe(false);
    expect(r.post_crisis_checkin_enabled).toBe(false);
    expect(r.daily_checkin_hour).toBe(20);
  });

  it("retorna defaults si input es undefined", () => {
    const r = resolvePrefs(undefined);
    expect(r.daily_checkin_enabled).toBe(false);
  });

  it("retorna la fila real si existe (pasa-a-través)", () => {
    const row: NotificationPreferences = {
      user_id: "abc",
      daily_checkin_enabled: true,
      daily_checkin_hour: 8,
      daily_checkin_minute: 30,
      exercise_reminder_enabled: true,
      exercise_reminder_days: 7,
      post_crisis_checkin_enabled: true,
      updated_at: "2025-01-01T12:00:00Z",
    };
    const r = resolvePrefs(row);
    expect(r).toBe(row);
    expect(r.daily_checkin_enabled).toBe(true);
    expect(r.daily_checkin_hour).toBe(8);
  });

  it("NO muta el input cuando pasa a través", () => {
    const row: NotificationPreferences = {
      user_id: "abc",
      daily_checkin_enabled: true,
      daily_checkin_hour: 8,
      daily_checkin_minute: 0,
      exercise_reminder_enabled: false,
      exercise_reminder_days: 3,
      post_crisis_checkin_enabled: false,
      updated_at: "2025-01-01T12:00:00Z",
    };
    const snapshot = { ...row };
    resolvePrefs(row);
    expect(row).toEqual(snapshot);
  });

  it("el user_id de los defaults es vacío (no inventamos uno)", () => {
    const r = resolvePrefs(null);
    expect(r.user_id).toBe("");
  });
});
