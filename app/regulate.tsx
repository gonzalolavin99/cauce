import { CATEGORY_LABELS } from "@/src/features/exercises/data/labels";
import { parseSteps } from "@/src/features/exercises/engine/steps";
import { useRecommendedExercises } from "@/src/features/exercises/hooks/useRecommendedExercises";
import { useSensoryPreferences } from "@/src/features/profile/hooks/useProfile";
import { BoxBreathing } from "@/src/features/regulation/components/BoxBreathing";
import { ExerciseRunner } from "@/src/features/regulation/components/ExerciseRunner";
import { FeelingSelector } from "@/src/features/regulation/components/FeelingSelector";
import { useLogSession } from "@/src/features/regulation/hooks/useLogSession";
import { useReducedMotion } from "@/src/shared/lib/useReducedMotion";
import { Avatar } from "@/src/shared/ui/Avatar";
import { Button } from "@/src/shared/ui/Button";
import { Screen } from "@/src/shared/ui/Screen";
import { withErrorBoundary } from "@/src/shared/ui/withErrorBoundary";
import type { ExerciseCategory, Feeling } from "@/src/types/database.types";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

type Phase = "feeling" | "intro" | "active" | "done";

const CATEGORY_ICONS: Record<
  ExerciseCategory,
  ComponentProps<typeof Ionicons>["name"]
> = {
  breathing: "water",
  grounding: "leaf",
  body: "body",
  sensory: "ear",
  distress_tolerance: "shield",
};

function RegulateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseId?: string }>();
  const hasPreselectedExercise = !!params.exerciseId;

  const [feeling, setFeeling] = useState<Feeling | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>(
    hasPreselectedExercise ? "intro" : "feeling"
  );
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { ranked, isLoading } = useRecommendedExercises(feeling);
  const { data: prefs } = useSensoryPreferences();
  const { startSession, completeSession } = useLogSession();

  // Seleccionar ejercicio: el del param, o el top ranked
  const selected =
    ranked.find((s) => s.exercise.id === params.exerciseId)?.exercise ??
    ranked[0]?.exercise ??
    null;

  const parsedSteps = useMemo(() => {
    if (!selected) return null;
    return parseSteps(selected.steps);
  }, [selected]);

  // Start session cuando arranca la fase activa
  useEffect(() => {
    if (phase === "active" && selected && !sessionId) {
      startSession.mutate(
        { exercise_id: selected.id, feeling_before: feeling },
        {
          onSuccess: (id) => setSessionId(id),
          onError: (err: Error) => {
            console.warn("No se pudo iniciar la sesión:", err.message);
          },
        }
      );
    }
  }, [phase, selected, sessionId, feeling, startSession]);

  function handleFeelingSelected(f: Feeling) {
    setFeeling(f);
    setPhase("intro");
  }

  function handleComplete() {
    setPhase("done");
    if (sessionId) {
      completeSession.mutate({ id: sessionId, was_helpful: "yes" });
    }
  }

  function handleRate(value: "yes" | "somewhat" | "no") {
    if (sessionId) {
      completeSession.mutate({ id: sessionId, was_helpful: value });
    }
    router.back();
  }

  // La confirmación ("¿Salir?") la maneja el runner (diálogo propio, pausa el
  // ejercicio mientras se decide). Al confirmar salir, registramos la sesión
  // como saltada y volvemos a la pregunta "¿Cómo te sientes?" (fase feeling),
  // no afuera de la pantalla.
  function handleCancel() {
    if (sessionId) {
      completeSession.mutate({ id: sessionId, was_helpful: "skipped" });
    }
    setSessionId(null);
    setFeeling(undefined);
    setPhase("feeling");
  }

  // --- Loading ---
  if (isLoading && phase !== "feeling") {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  // --- Fase: selector de feeling ---
  if (phase === "feeling") {
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <Text className="text-3xl font-bold text-ink mb-2">
            ¿Cómo te sientes ahora?
          </Text>
          <Text className="text-ink/70 mb-8 leading-6">
            Elige lo que más se acerque. Te sugiero algo que pueda ayudar.
          </Text>
          <FeelingSelector onSelect={handleFeelingSelected} />
          <View className="mt-6">
            <Button variant="ghost" onPress={() => router.back()}>
              Cancelar
            </Button>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // --- Sin ejercicio disponible ---
  if (!selected) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-6">
          <Avatar icon="leaf-outline" size="xl" tone="river" />
          <Text className="text-lg text-ink text-center mt-6 mb-6">
            No hay ejercicios disponibles.
          </Text>
          <Button onPress={() => router.back()}>Volver</Button>
        </View>
      </Screen>
    );
  }

  // --- Fase: intro del ejercicio ---
  if (phase === "intro") {
    const scored = ranked.find((s) => s.exercise.id === selected.id);
    const category = (selected.category ?? "breathing") as ExerciseCategory;
    const categoryLabel = CATEGORY_LABELS[category];
    const iconName = CATEGORY_ICONS[category];
    const minutes = Math.round(selected.duration_seconds / 60);

    return (
      <Screen>
        <View className="flex-1 justify-between px-6 py-8">
          <View className="flex-1 justify-center">
            {/* Categoría pill con icono */}
            <View className="flex-row items-center gap-2 mb-4 self-start px-3 py-1.5 rounded-full bg-river-50 border border-river-100">
              <Ionicons name={iconName} size={14} color="#2F6D6E" />
              <Text className="text-xs uppercase text-river-700 font-semibold tracking-wider">
                {categoryLabel}
              </Text>
            </View>

            <Text className="text-sm text-ink/70 uppercase tracking-wider mb-2 font-medium">
              Ejercicio sugerido
            </Text>
            <Text className="text-4xl font-bold text-ink mb-4 tracking-tight">
              {selected.name_es}
            </Text>
            <Text className="text-lg text-ink/70 leading-7 mb-6">
              {selected.short_description_es ??
                "Respira con ritmo para calmarte."}
            </Text>

            {scored?.reasons && scored.reasons.length > 0 && (
              <View className="mb-6 gap-2">
                {scored.reasons.map((reason, i) => (
                  <View key={i} className="flex-row items-center gap-2">
                    <Ionicons
                      name="sparkles"
                      size={12}
                      color="#2F6D6E"
                    />
                    <Text className="text-sm text-river-700">{reason}</Text>
                  </View>
                ))}
              </View>
            )}

            <View className="flex-row items-center gap-2">
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text className="text-sm text-ink/70">
                Duración aproximada: ~{minutes} min
              </Text>
            </View>
          </View>

          <View className="gap-3">
            <Button onPress={() => setPhase("active")}>Empezar</Button>
            <Button variant="ghost" onPress={() => router.back()}>
              Cancelar
            </Button>
          </View>
        </View>
      </Screen>
    );
  }

  // --- Fase: ejercicio activo ---
  if (phase === "active") {
    return (
      <Screen>
        {parsedSteps ? (
          <ExerciseRunner
            steps={parsedSteps}
            withVoice={prefs?.prefers_voice_guidance ?? true}
            withHaptics={prefs?.prefers_haptics ?? true}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        ) : (
          <BoxBreathing
            withVoice={prefs?.prefers_voice_guidance ?? true}
            withHaptics={prefs?.prefers_haptics ?? true}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        )}
      </Screen>
    );
  }

  // --- Fase: done ---
  return (
    <Screen>
      <View className="flex-1 justify-between px-6 py-8">
        <View className="flex-1 justify-center items-center">
          <DoneWave />
          <Text className="text-3xl font-bold text-ink mb-3 text-center mt-8">
            Bien hecho
          </Text>
          <Text className="text-lg text-ink/70 text-center leading-7 px-4">
            ¿Cómo te sientes ahora?
          </Text>
        </View>

        <View className="gap-3">
          <Button onPress={() => handleRate("yes")}>Mejor</Button>
          <Button variant="secondary" onPress={() => handleRate("somewhat")}>
            Un poco mejor
          </Button>
          <Button variant="ghost" onPress={() => handleRate("no")}>
            Igual o peor
          </Button>
        </View>
      </View>
    </Screen>
  );
}

/**
 * Animación del "done": dos ondas concéntricas que expanden y se desvanecen.
 * Ritmo lento (3.2s) — está pensado para un momento de cierre, no de
 * celebración. Respeta reduce-motion: en ese caso muestra el emoji estático.
 */
function DoneWave() {
  const reduced = useReducedMotion();
  const scale1 = useSharedValue(1);
  const opacity1 = useSharedValue(0.6);
  const scale2 = useSharedValue(1);
  const opacity2 = useSharedValue(0.4);

  useEffect(() => {
    if (reduced) return;
    scale1.value = withRepeat(
      withTiming(1.6, { duration: 3200, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    opacity1.value = withRepeat(
      withTiming(0, { duration: 3200, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    // Segunda onda desfasada
    setTimeout(() => {
      scale2.value = withRepeat(
        withTiming(1.6, { duration: 3200, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      opacity2.value = withRepeat(
        withTiming(0, { duration: 3200, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    }, 1600);

    return () => {
      cancelAnimation(scale1);
      cancelAnimation(opacity1);
      cancelAnimation(scale2);
      cancelAnimation(opacity2);
    };
  }, [reduced, scale1, opacity1, scale2, opacity2]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  return (
    <View className="items-center justify-center" style={{ height: 160, width: 160 }}>
      {!reduced && (
        <>
          <Animated.View
            style={[
              {
                position: "absolute",
                width: 140,
                height: 140,
                borderRadius: 70,
                borderWidth: 2,
                borderColor: "#4E8B8C",
              },
              ring1Style,
            ]}
          />
          <Animated.View
            style={[
              {
                position: "absolute",
                width: 140,
                height: 140,
                borderRadius: 70,
                borderWidth: 2,
                borderColor: "#4E8B8C",
              },
              ring2Style,
            ]}
          />
        </>
      )}
      <View
        className="h-24 w-24 rounded-full bg-river-500 items-center justify-center"
        style={{
          shadowColor: "#193838",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 4,
        }}
      >
        <Ionicons name="water" size={42} color="#FFFFFF" />
      </View>
    </View>
  );
}

export default withErrorBoundary(RegulateScreen, { source: "regulate" });
