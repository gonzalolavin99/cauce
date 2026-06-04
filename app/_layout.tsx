import { useColorScheme } from "@/components/useColorScheme";
import { useScheduleNotifications } from "@/src/features/notifications/hooks/useScheduleNotifications";
import {
    addTapListener,
    configureForegroundBehavior,
} from "@/src/features/notifications/service";
import { InstallPrompt } from "@/src/features/pwa/InstallPrompt";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";

// Configura el comportamiento en foreground. Si expo-notifications no
// está disponible (Expo Go), el helper es no-op.
configureForegroundBehavior();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
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
      // @ts-expect-error — expo-router typed routes no reconocen string dinámico
      router.push(route);
    });
    return () => sub.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <NotificationController />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="regulate"
            options={{ presentation: "modal", gestureEnabled: false }}
          />
          <Stack.Screen
            name="mood"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="mood-history"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="privacy"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="my-data"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="chat"
            options={{ presentation: "modal" }}
          />
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
      </ThemeProvider>
    </QueryClientProvider>
  );
}