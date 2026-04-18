/**
 * Recursos de apoyo en crisis en Chile.
 * Verificados en https://www.minsal.cl y https://lineali.cl
 *
 * IMPORTANTE: No loguear taps en estos recursos. La privacidad del usuario
 * en momentos de crisis es prioritaria.
 */

export type ResourceKind = "emergency" | "mental_health" | "youth" | "family";

export interface CrisisResource {
  id: string;
  label: string;
  description: string;
  phone?: string;
  url?: string;
  kind: ResourceKind;
  /** Si es true, se renderiza con estilo destacado (para emergencia real) */
  primary?: boolean;
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    id: "samu",
    label: "SAMU — Emergencias",
    description:
      "Si estás en peligro inmediato o pensando en hacerte daño. Respuesta médica 24/7.",
    phone: "131",
    kind: "emergency",
    primary: true,
  },
  {
    id: "salud_responde",
    label: "Salud Responde",
    description:
      "Apoyo psicológico 24/7 del Ministerio de Salud. Incluye prevención del suicidio.",
    phone: "6003607777",
    kind: "mental_health",
  },
  {
    id: "linea_libre",
    label: "Línea Libre",
    description:
      "Gratis desde cualquier teléfono. Atención en salud mental 24/7, todas las edades.",
    phone: "1515",
    kind: "mental_health",
  },
  {
    id: "fonoinfancia",
    label: "Fonoinfancia",
    description:
      "Orientación para niños, niñas, adolescentes y sus familias. Lun a Vie 8 a 20h.",
    phone: "800200818",
    kind: "youth",
  },
  {
    id: "todo_mejora",
    label: "Todo Mejora",
    description:
      "Apoyo para jóvenes LGBTIQ+ en crisis. Chat y orientación.",
    url: "https://todomejora.org",
    kind: "youth",
  },
];
