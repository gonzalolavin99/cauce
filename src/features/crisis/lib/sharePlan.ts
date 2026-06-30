import type { CrisisPlan } from "@/src/types/database.types";
import * as Linking from "expo-linking";
import { Share } from "react-native";

/**
 * Construye un resumen en texto plano del plan, pensado para enviar a un
 * contacto de confianza (SMS / email / WhatsApp). Incluye los números de
 * emergencia de Chile.
 */
function buildPlanText(plan: CrisisPlan): string {
  const lines: string[] = ["Mi plan de crisis (Cauce)", ""];

  const add = (label: string, value: string | null | undefined) => {
    const v = value?.trim();
    if (v) lines.push(`• ${label}: ${v}`);
  };

  if (plan.anchor_phrase?.trim()) {
    lines.push(`"${plan.anchor_phrase.trim()}"`, "");
  }

  add("Mis señales de alerta", plan.warning_signs);
  add("Lo que me ayuda", plan.what_helps);
  add("Mi lugar seguro", plan.safe_place);
  add("Lo que me importa sostener", plan.reasons_to_stay);
  add("Mejor evito", plan.avoid_list);

  const contact = [
    plan.trusted_contact_name,
    plan.trusted_contact_phone,
  ]
    .filter((s) => s?.trim())
    .join(" · ");
  add("Contacto de confianza", contact || null);

  lines.push(
    "",
    "Si es una crisis vital, pedir ayuda ahora:",
    "SAMU 131 · Salud Responde 600 360 7777 · Línea Libre 1515"
  );

  return lines.join("\n");
}

/**
 * 8.2 — Comparte el plan con un contacto de confianza.
 * - Abre el share sheet del sistema (SMS, email, WhatsApp, etc.). En web usa
 *   `navigator.share` cuando está disponible (móvil).
 * - Fallback: si el share no está disponible (p. ej. escritorio), abre el
 *   cliente de email con el plan prellenado vía `mailto:`.
 *
 * Devuelve true si se compartió/abrió algo; false si el usuario canceló.
 */
export async function sharePlan(plan: CrisisPlan): Promise<boolean> {
  const message = buildPlanText(plan);

  try {
    const result = await Share.share({
      title: "Mi plan de crisis",
      message,
    });
    // En iOS, dismissedAction indica cancelación.
    return result.action !== Share.dismissedAction;
  } catch {
    // Share no soportado (p. ej. escritorio web): fallback a email.
    try {
      const url = `mailto:?subject=${encodeURIComponent(
        "Mi plan de crisis"
      )}&body=${encodeURIComponent(message)}`;
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }
}
