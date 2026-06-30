import { ErrorBoundary } from "@/src/shared/ui/ErrorBoundary";
import type { ComponentType, ReactNode } from "react";

interface WithErrorBoundaryOptions {
  /** Etiqueta de origen para el log (ej. "chat", "crisis-plan"). */
  source: string;
  /** Fallback custom opcional; si no se pasa, usa la UI por defecto. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

/**
 * HOC que envuelve un componente de pantalla/feature en su propio
 * `ErrorBoundary`, de modo que un crash de render quede aislado a esa feature
 * y no tumbe el resto de la app (el boundary raíz queda como última red).
 */
export function withErrorBoundary<P extends object>(
  Wrapped: ComponentType<P>,
  options: WithErrorBoundaryOptions
): ComponentType<P> {
  function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary source={options.source} fallback={options.fallback}>
        <Wrapped {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `withErrorBoundary(${
    Wrapped.displayName || Wrapped.name || options.source
  })`;

  return WithErrorBoundary;
}
