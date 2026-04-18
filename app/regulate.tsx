import { parseSteps } from "@/src/features/exercises/engine/steps";
import { useRecommendedExercises } from "@/src/features/exercises/hooks/useRecommendedExercises";
import { useSensoryPreferences } from "@/src/features/profile/hooks/useProfile";
import { BoxBreathing } from "@/src/features/regulation/components/BoxBreathing";
import { ExerciseRunner } from "@/src/features/regulation/components/ExerciseRunner";
import { FeelingSelector } from "@/src/features/regulation/components/FeelingSelector";
import { useLogSession } from "@/src/features/regulation/hooks/useLogSession";
import { Button } from "@/src/shared/ui/Button";
import { Screen } from "@/src/shared/ui/Screen";
import type { Feeling } from "@/src/types/database.types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";

type Phase = "feeling" | "intro" | "active" | "done";

export default function RegulateScreen() {
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

  function handleCancel() {
    Alert.alert(
      "¿Detener el ejercicio?",
      "Podemos intentarlo de nuevo cuando quieras.",
      [
        { text: "Seguir", style: "cancel" },
        {
          text: "Detener",
          style: "destructive",
          onPress: () => {
            if (sessionId) {
              completeSession.mutate({ id: sessionId, was_helpful: "skipped" });
            }
            router.back();
          },
        },
      ]
    );
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
          <Text className="text-ink/70 mb-8">
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
          <Text className="text-lg text-ink text-center mb-4">
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
    return (
      <Screen>
        <View className="flex-1 justify-between px-6 py-8">
          <View className="flex-1 justify-center">
            <Text className="text-sm text-river-700 uppercase mb-2">
              Ejercicio sugerido
            </Text>
            <Text className="text-4xl font-bold text-ink mb-4">
              {selected.name_es}
            </Text>
            <Text className="text-lg text-ink/70 leading-7 mb-6">
              {selected.short_description_es ??
                "Respira con ritmo para calmarte."}
            </Text>

            {scored?.reasons && scored.reasons.length > 0 && (
              <View className="mb-6">
                {scored.reasons.map((reason, i) => (
                  <Text key={i} className="text-sm text-river-700 mb-1">
                    · {reason}
                  </Text>
                ))}
              </View>
            )}

            <Text className="text-sm text-ink/60">
              Duración aproximada: ~
              {Math.round(selected.duration_seconds / 60)} min
            </Text>
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
          <Text className="text-5xl mb-4">🌊</Text>
          <Text className="text-3xl font-bold text-ink mb-4 text-center">
            Bien hecho
          </Text>
          <Text className="text-lg text-ink/70 text-center leading-7">
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
