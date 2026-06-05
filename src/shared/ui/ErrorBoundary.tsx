import { reportError } from "@/src/shared/lib/logger";
import { Button } from "@/src/shared/ui/Button";
import { EmptyState } from "@/src/shared/ui/EmptyState";
import { Screen } from "@/src/shared/ui/Screen";
import { Component, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Etiqueta de origen para el log (ej. "root", "chat"). */
  source?: string;
  /**
   * Fallback custom. Si no se pasa, se usa la UI por defecto.
   * Recibe el error y una función para reintentar (resetea el boundary).
   */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Captura errores de render/lifecycle en su subárbol y muestra una UI de
 * fallback amigable en lugar de una pantalla en blanco o un crash.
 *
 * Limitación de React: NO captura errores en event handlers ni en código
 * async (esos se manejan con try/catch + `reportError`).
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(
    error: Error,
    info: { componentStack?: string }
  ): void {
    reportError(error, {
      source: this.props.source ?? "ErrorBoundary",
      componentStack: info.componentStack ?? undefined,
    });
  }

  reset = (): void => {
    this.state.error && this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <Screen ambient={false}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
          }}
        >
          <EmptyState
            icon="sad-outline"
            variant="warm"
            title="Algo se salió de cauce"
            description="Ocurrió un error inesperado. No perdiste tus datos. Puedes intentar de nuevo."
            action={<Button onPress={this.reset}>Reintentar</Button>}
          />
          {__DEV__ && (
            <View className="mt-4 p-3 rounded-xl bg-white border border-river-100">
              <Text className="text-xs text-ink/60 font-semibold mb-1">
                Detalle (solo en desarrollo)
              </Text>
              <Text className="text-xs text-ink/70">{error.message}</Text>
            </View>
          )}
        </ScrollView>
      </Screen>
    );
  }
}
