import type { ConsentType } from "@/src/types/database.types";

/**
 * Versión de la política de privacidad que el usuario está aceptando.
 * Incrementar cuando haya cambios sustantivos → fuerza re-consentimiento.
 * Formato: YYYY.MM-vN
 */
export const PRIVACY_POLICY_VERSION = "2026.04-v1";

/** Consentimientos requeridos para usar la app */
export const REQUIRED_CONSENTS: ConsentType[] = [
  "data_processing",
  "sensitive_health_data",
];

/** Consentimientos opcionales que el usuario puede activar o no */
export const OPTIONAL_CONSENTS: ConsentType[] = [
  "ai_advisor",
  "anonymous_analytics",
];

export const CONSENT_LABELS: Record<ConsentType, string> = {
  data_processing: "Tratamiento de datos personales",
  sensitive_health_data: "Datos sensibles de salud mental",
  ai_advisor: "Asistente con IA (opcional)",
  anonymous_analytics: "Analíticas anónimas (opcional)",
};

export const CONSENT_DESCRIPTIONS: Record<ConsentType, string> = {
  data_processing:
    "Guardamos tu correo, nombre y preferencias para que la app funcione. Base legal: consentimiento (Ley 19.628 y 21.719).",
  sensitive_health_data:
    "Guardamos diagnósticos que tú indicas, tus registros de estado y tus sesiones de regulación. Son datos sensibles. Solo tú los ves.",
  ai_advisor:
    "Permite que conversaciones con el asistente se procesen por un proveedor de IA. No se comparten con terceros con fines comerciales. Puedes activarlo o desactivarlo cuando quieras.",
  anonymous_analytics:
    "Nos ayuda a ver qué ejercicios funcionan sin identificarte. Puedes desactivarlo cuando quieras.",
};

/**
 * Contacto del responsable de datos.
 * TODO: actualizar cuando el usuario defina DPO / responsable legal formal.
 */
export const DATA_CONTROLLER = {
  name: "Cauce",
  email: "privacidad@cauce.app",
  country: "Chile",
};
