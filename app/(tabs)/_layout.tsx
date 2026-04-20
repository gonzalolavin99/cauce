import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { REQUIRED_CONSENTS } from "@/src/features/privacy/constants";
import { useConsents } from "@/src/features/privacy/hooks/useConsents";
import { useProfile } from "@/src/features/profile/hooks/useProfile";
import { Redirect, Tabs } from "expo-router";

export default function TabsLayout() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { current, isLoading: consentsLoading } = useConsents();

  if (authLoading || profileLoading || consentsLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/sign-in" />;
  if (profile && !profile.onboarding_completed) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  // Gate retroactivo: si el usuario ya hizo onboarding pero no tiene los
  // consentimientos mínimos registrados (cuenta creada antes de Fase 2),
  // lo mandamos a /consent-update antes de darle acceso a los tabs.
  const missingRequired = REQUIRED_CONSENTS.some(
    (type) => !current.isGranted(type)
  );
  if (missingRequired) {
    return <Redirect href="/consent-update" />;
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