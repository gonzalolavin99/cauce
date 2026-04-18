import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { useProfile } from "@/src/features/profile/hooks/useProfile";
import { Redirect, Tabs } from "expo-router";

export default function TabsLayout() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (authLoading || profileLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/sign-in" />;
  if (profile && !profile.onboarding_completed) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4E8B8C",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="explore" options={{ title: "Explorar" }} />
      <Tabs.Screen name="support" options={{ title: "Apoyo" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}