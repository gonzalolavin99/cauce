/**
 * Logger / reporte de errores pluggable.
 *
 * Hoy: imprime en consola. Mañana: se puede conectar Sentry (u otro) llamando
 * a `setErrorReporter()` una sola vez al arrancar la app, sin tocar los call
 * sites (ErrorBoundary, catch handlers, etc.).
 *
 * Diseño: mantener este módulo libre de dependencias pesadas para poder
 * importarlo desde cualquier capa (UI, hooks, servicios).
 */

export interface ErrorContext {
  /** Dónde ocurrió: nombre de feature/pantalla/operación. */
  source?: string;
  /** Datos extra no sensibles para diagnosticar (ids, flags, etc.). */
  extra?: Record<string, unknown>;
  /** React component stack, cuando viene de un ErrorBoundary. */
  componentStack?: string;
}

type ErrorReporter = (error: Error, context?: ErrorContext) => void;

const consoleReporter: ErrorReporter = (error, context) => {
  // eslint-disable-next-line no-console
  console.error(
    `[error]${context?.source ? ` (${context.source})` : ""}`,
    error,
    context?.extra ?? "",
    context?.componentStack ? `\n${context.componentStack}` : ""
  );
};

let reporter: ErrorReporter = consoleReporter;

/**
 * Registra el reporter real (ej. Sentry). Llamar una vez al inicio.
 * Si nunca se llama, se usa el reporter de consola.
 */
export function setErrorReporter(next: ErrorReporter): void {
  reporter = next;
}

/**
 * Reporta un error capturado. Nunca lanza: el logging no debe romper la app.
 */
export function reportError(error: unknown, context?: ErrorContext): void {
  const normalized =
    error instanceof Error ? error : new Error(String(error));
  try {
    reporter(normalized, context);
  } catch {
    // Si el reporter falla, no queremos propagar el fallo.
  }
}
