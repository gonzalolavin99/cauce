import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { useRecommendedExercises } from "@/src/features/exercises/hooks/useRecommendedExercises";
import {
  MOOD_EMOJI,
  MOOD_LABELS,
  type MoodValue,
} from "@/src/features/mood/data/options";
import { useMoodLogs } from "@/src/features/mood/hooks/useMoodLogs";
import { useProfile } from "@/src/features/profile/hooks/useProfile";
import { cn } from "@/src/shared/lib/cn";
import { Screen } from "@/src/shared/ui/Screen";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { ranked, isLoading } = useRecommendedExercises();
  const { data: moodLogs } = useMoodLogs(1);
  const lastMood = moodLogs?.[0];

  const displayName = useMemo(() => {
    if (profile?.display_name) return profile.display_name;
    if (user?.email) return user.email.split("@")[0];
    return "";
  }, [profile, user]);

  const topThree = ranked.slice(0, 3);

  function handleRegulatePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push("/regulate");
  }

  function handleQuickSession(exerciseId: string) {
    Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: "/regulate", params: { exerciseId } });
  }

  function handleMoodPress() {
    Haptics.selectionAsync().catch(() => {});
    router.push("/mood");
  }

  const lastMoodInfo = useMemo(() => {
    if (!lastMood?.mood) return null;
    const moodKey = lastMood.mood as MoodValue;
    return {
      emoji: MOOD_EMOJI[moodKey] ?? "·",
      label: MOOD_LABELS[moodKey] ?? lastMood.mood,
    };
  }, [lastMood]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Text className="text-sm text-ink/60 mb-1">{greeting()}</Text>
        <Text className="text-3xl font-bold text-ink mb-10">
          {displayName ? `${displayName}` : "Hola"}
        </Text>

        {/* Botón gigante de emergencia */}
        <Pressable
          onPress={handleRegulatePress}
          className={cn(
            "rounded-3xl items-center justify-center px-6 py-10",
            "bg-river-500 active:bg-river-700"
          )}
          style={{ minHeight: 220 }}
        >
          <Text className="text-white text-3xl font-bold text-center">
            Necesito regularme
          </Text>
          <Text className="text-white/80 text-base text-center mt-3">
            Un ejercicio corto, ahora
          </Text>
        </Pressable>

        {/* Mood logger */}
        <Pressable
          onPress={handleMoodPress}
          className="mt-6 p-4 rounded-2xl bg-sand border border-river-100 active:bg-river-50 flex-row items-center"
        >
          <Text className="text-3xl mr-3">
            {lastMoodInfo?.emoji ?? "📝"}
          </Text>
          <View className="flex-1">
            <Text className="text-base font-semibold text-ink">
              {lastMoodInfo ? "¿Cómo estás ahora?" : "¿Cómo estás?"}
            </Text>
            <Text className="text-sm text-ink/60 mt-0.5">
              {lastMoodInfo
                ? `Último: ${lastMoodInfo.label.toLowerCase()}`
                : "Anota tu estado en segundos"}
            </Text>
          </View>
          <Text className="text-river-700 text-xl">›</Text>
        </Pressable>

        {/* Sesiones rápidas */}
        <View className="mt-10">
          <Text className="text-lg font-semibold text-ink mb-4">
            Sesiones rápidas
          </Text>

          {isLoading && <ActivityIndicator />}

          {!isLoading && topThree.length === 0 && (
            <Text className="text-ink/60">
              Todavía no hay ejercicios cargados.
            </Text>
          )}

          {topThree.map(({ exercise }) => (
            <Pressable
              key={exercise.id}
              onPress={() => handleQuickSession(exercise.id)}
              className="mb-3 p-4 rounded-2xl bg-river-50 border border-river-100 active:bg-river-100"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-river-900">
                    {exercise.name_es}
                  </Text>
                  {exercise.short_description_es && (
                    <Text className="text-sm text-ink/70 mt-1">
                      {exercise.short_description_es}
                    </Text>
                  )}
                </View>
                <Text className="text-xs text-ink/50 shrink-0">
                  ~{Math.round(exercise.duration_seconds / 60)} min
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </Screen>
  );
}
