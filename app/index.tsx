import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { useProfile } from "@/src/features/profile/hooks/useProfile";
import { Redirect } from "expo-router";

export default function Index() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (authLoading || profileLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/sign-in" />;
  if (profile && !profile.onboarding_completed) {
    return <Redirect href="/(onboarding)/welcome" />;
  }
  return <Redirect href="/(tabs)" />;
}