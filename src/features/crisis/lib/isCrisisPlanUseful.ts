import type { CrisisPlan } from "@/src/types/database.types";

/**
 * True si el plan tiene al menos un campo llenado (algo útil que mostrar).
 *
 * Función pura extraída del hook para poder testearla sin cargar supabase /
 * @tanstack/react-query. Se re-exporta desde el hook por compatibilidad.
 */
export function isCrisisPlanUseful(
  plan: CrisisPlan | null | undefined
): boolean {
  if (!plan) return false;
  const fields: (keyof CrisisPlan)[] = [
    "warning_signs",
    "what_helps",
    "anchor_phrase",
    "safe_place",
    "trusted_contact_name",
    "trusted_contact_phone",
    "reasons_to_stay",
    "avoid_list",
    "notes",
  ];
  return fields.some((f) => {
    const v = plan[f];
    return typeof v === "string" && v.trim().length > 0;
  });
}
