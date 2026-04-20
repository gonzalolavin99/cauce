import { useColorScheme } from "@/components/useColorScheme";
import { useScheduleNotifications } from "@/src/features/notifications/hooks/useScheduleNotifications";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";

// Cómo se presentan las notificaciones cuando la app está en foreground.
// Sin banner ni sound acá: no queremos interrumpir si la persona ya está
// en la app. Si está en background el sistema las muestra normalmente.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { route?: string }
          | null
          | undefined;
        const route = data?.route;
        if (typeof route === "string" && route.startsWith("/")) {
          // @ts-expect-error — expo-router typed routes no reconocen string dinámico
          router.push(route);
        }
      }
    );
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
      </ThemeProvider>
    </QueryClientProvider>
  );
}