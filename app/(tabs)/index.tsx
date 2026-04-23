import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { useRecommendedExercises } from "@/src/features/exercises/hooks/useRecommendedExercises";
import {
  MOOD_EMOJI,
  MOOD_LABELS,
  type MoodValue,
} from "@/src/features/mood/data/options";
import { useMoodLogs } from "@/src/features/mood/hooks/useMoodLogs";
import { useProfile } from "@/src/features/profile/hooks/useProfile";
import { useReducedMotion } from "@/src/shared/lib/useReducedMotion";
import { Card } from "@/src/shared/ui/Card";
import { EmptyState } from "@/src/shared/ui/EmptyState";
import { Screen } from "@/src/shared/ui/Screen";
import { CardSkeleton } from "@/src/shared/ui/Skeleton";
import { StaggerItem } from "@/src/shared/ui/StaggerItem";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

function greeting(): { title: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 6) return { title: "Aún es de madrugada", emoji: "🌙" };
  if (hour < 12) return { title: "Buenos días", emoji: "🌅" };
  if (hour < 20) return { title: "Buenas tardes", emoji: "🌤" };
  return { title: "Buenas noches", emoji: "🌙" };
}

const DAYS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function formattedDate(): string {
  const d = new Date();
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { ranked, isLoading } = useRecommendedExercises();
  const { data: moodLogs } = useMoodLogs(1);
  const lastMood = moodLogs?.[0];
  const reduceMotion = useReducedMotion();

  const displayName = useMemo(() => {
    if (profile?.display_name) return profile.display_name;
    if (user?.email) return user.email.split("@")[0];
    return "";
  }, [profile, user]);

  const topThree = ranked.slice(0, 3);
  const { title: greetTitle, emoji: greetEmoji } = greeting();

  // Breathing animation para el hero CTA.
  // Loop muy lento (6s inhala / 6s exhala) para que se sienta vivo pero
  // no ansioso. Si reduce-motion está activo, no animamos.
  const breath = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(
      withTiming(1.02, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => {
      cancelAnimation(breath);
    };
  }, [reduceMotion, breath]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

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

  function handleMoodHistoryPress() {
    Haptics.selectionAsync().catch(() => {});
    router.push("/mood-history");
  }

  function handleChatPress() {
    Haptics.selectionAsync().catch(() => {});
    router.push("/chat");
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
        {/* Greeting bloque */}
        <View className="mb-8">
          <Text className="text-sm text-ink/50 mb-1 capitalize">
            {formattedDate()}
          </Text>
          <View className="flex-row items-baseline">
            <Text className="text-3xl font-bold text-ink">{greetTitle}</Text>
            <Text className="text-2xl ml-2">{greetEmoji}</Text>
          </View>
          {displayName && (
            <Text className="text-lg text-ink/70 mt-1">{displayName}</Text>
          )}
        </View>

        {/* Hero CTA con breathing animation */}
        <StaggerItem index={0}>
          <Animated.View style={breathStyle}>
            <Pressable
              onPress={handleRegulatePress}
              className="rounded-3xl overflow-hidden bg-river-500 active:bg-river-700"
              style={{
                minHeight: 220,
                shadowColor: "#193838",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.18,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              {/* Halo decorativo — un círculo traslúcido que sugiere agua */}
              <View
                pointerEvents="none"
                className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10"
              />
              <View
                pointerEvents="none"
                className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-white/5"
              />

              <View className="flex-1 items-center justify-center px-6 py-10">
                <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center mb-4">
                  <Ionicons name="water" size={28} color="white" />
                </View>
                <Text className="text-white text-3xl font-bold text-center tracking-tight">
                  Necesito regularme
                </Text>
                <Text className="text-white/80 text-base text-center mt-2">
                  Un ejercicio corto, ahora
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </StaggerItem>

        {/* Mood quick action */}
        <StaggerItem index={1} style={{ marginTop: 24 }}>
          <Card onPress={handleMoodPress} variant="warm" unpadded>
            <View className="flex-row items-center p-4">
              <View className="w-12 h-12 rounded-2xl bg-white/60 items-center justify-center mr-3">
                <Text className="text-2xl">{lastMoodInfo?.emoji ?? "📝"}</Text>
              </View>
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
              <Ionicons name="chevron-forward" size={20} color="#2E5F60" />
            </View>
          </Card>

          {lastMoodInfo && (
            <Pressable
              onPress={handleMoodHistoryPress}
              className="mt-2 py-2 active:opacity-60 self-center"
              hitSlop={8}
            >
              <Text className="text-sm text-river-700 font-medium">
                Ver mi historial →
              </Text>
            </Pressable>
          )}
        </StaggerItem>

        {/* Chat con Cauce */}
        <StaggerItem index={2} style={{ marginTop: 12 }}>
          <Card onPress={handleChatPress} unpadded>
            <View className="flex-row items-center p-4">
              <View className="w-12 h-12 rounded-2xl bg-river-50 items-center justify-center mr-3">
                <Text className="text-2xl">🫧</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink">
                  Hablar con Cauce
                </Text>
                <Text className="text-sm text-ink/60 mt-0.5">
                  Conversa con el asistente · IA, no es terapia
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#2E5F60" />
            </View>
          </Card>
        </StaggerItem>

        {/* Sesiones rápidas */}
        <View className="mt-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-ink">
              Sesiones rápidas
            </Text>
            {topThree.length > 0 && (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  router.push("/(tabs)/explore");
                }}
                hitSlop={8}
              >
                <Text className="text-sm text-river-700 font-medium">
                  Ver todas
                </Text>
              </Pressable>
            )}
          </View>

          {isLoading && (
            <View className="gap-3">
              <CardSkeleton />
              <CardSkeleton />
            </View>
          )}

          {!isLoading && topThree.length === 0 && (
            <EmptyState
              icon="leaf-outline"
              title="Sin ejercicios todavía"
              description="Pronto vas a ver sesiones cortas sugeridas para ti."
            />
          )}

          {topThree.map(({ exercise }, idx) => (
            <StaggerItem
              key={exercise.id}
              index={idx + 3}
              style={idx > 0 ? { marginTop: 12 } : undefined}
            >
              <Card
                onPress={() => handleQuickSession(exercise.id)}
                variant="muted"
                unpadded
              >
                <View className="flex-row items-start p-4">
                  <View className="w-10 h-10 rounded-xl bg-white items-center justify-center mr-3">
                    <Ionicons name="leaf" size={18} color="#4E8B8C" />
                  </View>
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-river-900">
                      {exercise.name_es}
                    </Text>
                    {exercise.short_description_es && (
                      <Text className="text-sm text-ink/70 mt-1 leading-5">
                        {exercise.short_description_es}
                      </Text>
                    )}
                  </View>
                  <View className="shrink-0 px-2 py-1 rounded-lg bg-white">
                    <Text className="text-xs text-ink/60 font-medium">
                      ~{Math.round(exercise.duration_seconds / 60)} min
                    </Text>
                  </View>
                </View>
              </Card>
            </StaggerItem>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
