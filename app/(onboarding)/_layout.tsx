import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { useProfile } from "@/src/features/profile/hooks/useProfile";
import { Redirect, Stack } from "expo-router";

export default function OnboardingLayout() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (authLoading || profileLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/sign-in" />;
  if (profile?.onboarding_completed) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}