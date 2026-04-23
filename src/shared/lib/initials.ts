/**
 * Helper: obtener iniciales a partir de un display name o email.
 *
 * Función pura (sin deps de RN) para poder testearla en Node.
 * Se re-exporta desde Avatar.tsx por compatibilidad.
 */
export function initialsFrom(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] ?? "") + (parts[1]?.[0] ?? "");
}
