import { BreathingCircle } from "@/src/features/regulation/components/BreathingCircle";
import { Button } from "@/src/shared/ui/Button";
import type { ExerciseStep } from "@/src/types/database.types";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

interface ExerciseRunnerProps {
  steps: ExerciseStep[];
  withVoice?: boolean;
  withHaptics?: boolean;
  onComplete: () => void;
  onCancel?: () => void;
}

// Palabras típicas en ejercicios de respiración para decidir si expande o contrae
const INHALE_KEYWORDS = ["inhala", "inhalar", "inspira", "inspirar"];
const EXHALE_KEYWORDS = ["exhala", "exhalar", "espira", "espirar", "suelta"];

function phaseScale(label: string, prevScale: number): number {
  const lower = label.toLowerCase();
  if (INHALE_KEYWORDS.some((k) => lower.includes(k))) return 1.6;
  if (EXHALE_KEYWORDS.some((k) => lower.includes(k))) return 1;
  // hold → mantener la escala anterior
  return prevScale;
}

function speak(text: string) {
  Speech.stop();
  Speech.speak(text, { language: "es-CL", rate: 0.9 });
}

function haptic(style: "light" | "success") {
  if (style === "light") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } else {
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
  }
}

export function ExerciseRunner({
  steps,
  withVoice = true,
  withHaptics = true,
  onComplete,
  onCancel,
}: ExerciseRunnerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [cyclePhaseIndex, setCyclePhaseIndex] = useState(0);
  const [cycleRepeatIndex, setCycleRepeatIndex] = useState(0);
  const [lastScale, setLastScale] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = steps[stepIndex];

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      Speech.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Efecto principal: cada vez que cambia el step o fase del ciclo, disparamos timer
  useEffect(() => {
    if (!step) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (step.type === "cycle") {
      const phase = step.phases[cyclePhaseIndex];
      if (!phase) return;

      if (withHaptics) haptic("light");
      if (withVoice) speak(phase.label);

      // Actualizar escala para que BreathingCircle la reciba
      setLastScale((prev) => phaseScale(phase.label, prev));

      timerRef.current = setTimeout(() => {
        const isLastPhase = cyclePhaseIndex >= step.phases.length - 1;
        if (isLastPhase) {
          const isLastRepeat = cycleRepeatIndex >= step.repeat - 1;
          if (isLastRepeat) {
            advanceStep();
          } else {
            setCycleRepeatIndex((r) => r + 1);
            setCyclePhaseIndex(0);
          }
        } else {
          setCyclePhaseIndex((p) => p + 1);
        }
      }, phase.seconds * 1000);
    } else {
      // intro | prompt | outro
      if (withHaptics) haptic("light");
      if (withVoice) speak(step.text);

      timerRef.current = setTimeout(() => {
        advanceStep();
      }, step.seconds * 1000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, cyclePhaseIndex, cycleRepeatIndex]);

  function advanceStep() {
    if (stepIndex >= steps.length - 1) {
      if (withHaptics) haptic("success");
      if (withVoice) speak("Terminaste. Bien hecho.");
      onComplete();
    } else {
      setStepIndex((s) => s + 1);
      setCyclePhaseIndex(0);
      setCycleRepeatIndex(0);
    }
  }

  function handleCancel() {
    Speech.stop();
    if (timerRef.current) clearTimeout(timerRef.current);
    onCancel?.();
  }

  if (!step) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink/60">Sin pasos</Text>
      </View>
    );
  }

  // --- Render según tipo de paso ---
  if (step.type === "cycle") {
    const phase = step.phases[cyclePhaseIndex];
    const label = phase?.label ?? "";
    const seconds = phase?.seconds ?? 0;

    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base text-ink/60 mb-2">
          Ciclo {cycleRepeatIndex + 1} de {step.repeat}
        </Text>

        <View className="my-8">
          <BreathingCircle
            label={label}
            seconds={seconds}
            targetScale={lastScale}
            animate={
              INHALE_KEYWORDS.some((k) => label.toLowerCase().includes(k)) ||
              EXHALE_KEYWORDS.some((k) => label.toLowerCase().includes(k))
            }
          />
        </View>

        <Text className="text-5xl font-bold text-ink mt-4 text-center">
          {label}
        </Text>
        <Text className="text-lg text-ink/60 mt-2">{seconds} segundos</Text>

        <View className="w-full mt-12">
          <Button variant="ghost" onPress={handleCancel}>
            Detener
          </Button>
        </View>
      </View>
    );
  }

  // intro | prompt | outro → texto grande con temporizador
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-sm text-river-700 uppercase mb-4">
        Paso {stepIndex + 1} de {steps.length}
      </Text>

      <Text className="text-3xl font-semibold text-ink text-center leading-10">
        {step.text}
      </Text>

      <Text className="text-lg text-ink/60 mt-8">{step.seconds} segundos</Text>

      <View className="w-full mt-12">
        <Button variant="ghost" onPress={handleCancel}>
          Detener
        </Button>
      </View>
    </View>
  );
}
