import { useScheduleNotifications } from "@/src/features/notifications/hooks/useScheduleNotifications";
import {
    addTapListener,
    configureForegroundBehavior,
} from "@/src/features/notifications/service";
import { AppLockGate } from "@/src/features/privacy/components/AppLockGate";
import { InstallPrompt } from "@/src/features/pwa/InstallPrompt";
import { initErrorReporting } from "@/src/shared/lib/errorReporting";
import { configureFontScaling } from "@/src/shared/lib/fontScaling";
import {
    QUERY_CACHE_BUSTER,
    QUERY_CACHE_MAX_AGE,
    queryPersister,
    shouldPersistQuery,
} from "@/src/shared/lib/queryPersist";
import { useReducedMotion } from "@/src/shared/lib/useReducedMotion";
import { initThemeMode } from "@/src/shared/theme/themeMode";
import { AlertHost } from "@/src/shared/ui/AlertHost";
import { ErrorBoundary } from "@/src/shared/ui/ErrorBoundary";
import { ToastHost } from "@/src/shared/ui/ToastHost";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";

// Acota el escalado de fuente del sistema (accesibilidad sin romper layouts).
configureFontScaling();

// Configura el comportamiento en foreground. Si expo-notifications no
// está disponible (Expo Go), el helper es no-op.
configureForegroundBehavior();

// Inicializa el reporte de errores (Sentry) si hay DSN configurado. Sin DSN
// es no-op y el logger cae a consola. Conecta los ErrorBoundary + reportError.
initErrorReporting();

// Aplica el modo de tema guardado (system/light/dark) antes del primer render.
initThemeMode();

SplashScreen.preventAutoHideAsync();
// Fade suave splash → app (3.7): evita el corte seco al mostrar la UI.
SplashScreen.setOptions({ fade: true });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      // gcTime debe ser >= maxAge del persist: si no, las queries restauradas
      // del disco se descartan como "expiradas" al arrancar.
      gcTime: QUERY_CACHE_MAX_AGE,
      retry: 1,
    },
  },
});

/**
 * Wires up notification reconciliation + tap navigation. Vive bajo
 * QueryClientProvider para poder usar hooks de Query.
 */
function NotificationController() {
  const router = useRouter();
  useScheduleNotifications();

  useEffect(() => {
    const sub = addTapListener((route) => {
      // expo-router typed routes no aceptan un string dinámico. El error de
      // tipos solo aparece cuando .expo/ generó los tipos de rutas (local);
      // en CI no existen, por eso usamos ts-ignore (tolera que la línea tenga
      // o no error) en vez de la variante estricta, que daría TS2578.
      // biome-ignore lint/suspicious/noTsIgnore: necesitamos ts-ignore, no expect-error (el error de tipos solo existe en local con .expo/ generado).
      // @ts-ignore
      router.push(route);
    });
    return () => sub.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  // El scheme de nativewind respeta el override manual (Perfil → Apariencia),
  // no solo el del sistema; así la navegación y el theming van juntos.
  const { colorScheme } = useColorScheme();
  const reduceMotion = useReducedMotion();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ErrorBoundary source="root">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: QUERY_CACHE_MAX_AGE,
          buster: QUERY_CACHE_BUSTER,
          dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
        }}
      >
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <NotificationController />
          {/* Transiciones suaves (3.3): slide en push, modales desde abajo
              (presentation: "modal" ya lo hace). Sin animación si el usuario
              prefiere movimiento reducido. En web no hay transiciones. */}
          <Stack
            screenOptions={{
              headerShown: false,
              animation: reduceMotion ? "none" : "slide_from_right",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="regulate"
              options={{ presentation: "modal", gestureEnabled: false }}
            />
            <Stack.Screen name="mood" options={{ presentation: "modal" }} />
            <Stack.Screen
              name="mood-history"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen name="privacy" options={{ presentation: "modal" }} />
            <Stack.Screen name="my-data" options={{ presentation: "modal" }} />
            <Stack.Screen name="chat" options={{ presentation: "modal" }} />
            <Stack.Screen
              name="crisis-plan"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="consent-update"
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="+not-found" />
          </Stack>
          <InstallPrompt />
          <AlertHost />
          <ToastHost />
          {/* Último hijo: debe cubrir stack, modales y alerts al bloquear */}
          <AppLockGate />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}