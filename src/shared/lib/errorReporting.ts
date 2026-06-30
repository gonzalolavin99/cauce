/**
 * Inicialización del reporte de errores (Sentry).
 *
 * Diseño:
 * - Se llama UNA vez al arrancar la app (desde el layout raíz).
 * - Si no hay `EXPO_PUBLIC_SENTRY_DSN`, no se inicializa nada y el logger
 *   queda con su reporter por defecto (consola). La app funciona igual.
 * - Privacidad (Ley 19.628): NO enviamos PII. Desactivamos `sendDefaultPii`
 *   y no adjuntamos contenido de mensajes ni datos de salud. Solo el error,
 *   la `source` y `extra` no sensible que pasen los call sites.
 *
 * Despliegue (web / Netlify): `EXPO_PUBLIC_SENTRY_DSN` se inyecta en
 * tiempo de BUILD (`expo export -p web`). Basta con definirla en las
 * variables de entorno de Netlify; no hace falta nada en local ni un
 * backend: el SDK de browser envía los eventos directo a Sentry. El DSN
 * es una clave pública de cliente, segura de exponer en el bundle.
 *
 * `@sentry/react-native` soporta web (delega en el SDK de browser), así que
 * el mismo `init` sirve para nativo y para la PWA.
 */
import { env } from "@/src/shared/env";
import { reportError, setErrorReporter, type ErrorContext } from "@/src/shared/lib/logger";

let initialized = false;

export function initErrorReporting(): void {
  if (initialized) return;
  initialized = true;

  const dsn = env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return; // Sin DSN: se mantiene el reporter de consola.

  try {
    // Import diferido: solo cargamos Sentry si realmente vamos a usarlo.
    const Sentry =
      require("@sentry/react-native") as typeof import("@sentry/react-native");

    Sentry.init({
      dsn,
      sendDefaultPii: false,
      enableAutoSessionTracking: true,
      // Muestreo de performance conservador; ajustar en producción.
      tracesSampleRate: 0.1,
    });

    setErrorReporter((error: Error, context?: ErrorContext) => {
      Sentry.captureException(error, {
        tags: context?.source ? { source: context.source } : undefined,
        extra: {
          ...(context?.extra ?? {}),
          ...(context?.componentStack
            ? { componentStack: context.componentStack }
            : {}),
        },
      });
    });
  } catch (e) {
    // Si Sentry falla al cargar/inicializar (p. ej. en web), no rompemos el
    // arranque: el logger mantiene el reporter de consola.
    reportError(e, { source: "errorReporting.init" });
  }
}
