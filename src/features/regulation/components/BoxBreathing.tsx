import { BreathingCircle } from "@/src/features/regulation/components/BreathingCircle";
import { Button } from "@/src/shared/ui/Button";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

type Phase = "inhale" | "hold1" | "exhale" | "hold2";

const PHASE_LABELS: Record<Phase, string> = {
  inhale: "Inhala",
  hold1: "Mantén",
  exhale: "Exhala",
  hold2: "Mantén",
};

const PHASE_ORDER: Phase[] = ["inhale", "hold1", "exhale", "hold2"];

const PHASE_SCALE: Record<Phase, number> = {
  inhale: 1.6,
  hold1: 1.6,
  exhale: 1,
  hold2: 1,
};

interface BoxBreathingProps {
  phaseSeconds?: number;
  cycles?: number;
  withVoice?: boolean;
  withHaptics?: boolean;
  onComplete: () => void;
  onCancel?: () => void;
}


export function BoxBreathing({
  phaseSeconds = 4,
  cycles = 4,
  withVoice = true,
  withHaptics = true,
  onComplete,
  onCancel,
}: BoxBreathingProps) {
  const [cycleIndex, setCycleIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPhase = (PHASE_ORDER[phaseIndex] ?? "inhale") as Phase;

  useEffect(() => {
    if (!isRunning) return;

    if (withHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    if (withVoice) {
      Speech.stop();
      Speech.speak(PHASE_LABELS[currentPhase], {
        language: "es-CL",
        rate: 0.9,
      });
    }

    timerRef.current = setTimeout(() => {
      if (phaseIndex < PHASE_ORDER.length - 1) {
        setPhaseIndex((p) => p + 1);
      } else {
        if (cycleIndex < cycles - 1) {
          setCycleIndex((c) => c + 1);
          setPhaseIndex(0);
        } else {
          setIsRunning(false);
          if (withHaptics) {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            ).catch(() => {});
          }
          if (withVoice) {
            Speech.stop();
            Speech.speak("Terminaste. Bien hecho.", {
              language: "es-CL",
              rate: 0.9,
            });
          }
          onComplete();
        }
      }
    }, phaseSeconds * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseIndex, cycleIndex, isRunning]);

  useEffect(() => {
    return () => {
      Speech.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleCancel() {
    setIsRunning(false);
    Speech.stop();
    if (timerRef.current) clearTimeout(timerRef.current);
    onCancel?.();
  }

  const animate = currentPhase === "inhale" || currentPhase === "exhale";

  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-base text-ink/60 mb-2">
        Ciclo {cycleIndex + 1} de {cycles}
      </Text>

      <View className="my-8">
        <BreathingCircle
          label={PHASE_LABELS[currentPhase]}
          seconds={phaseSeconds}
          targetScale={PHASE_SCALE[currentPhase]}
          animate={animate}
        />
      </View>

      <Text className="text-5xl font-bold text-ink mt-4">
        {PHASE_LABELS[currentPhase]}
      </Text>
      <Text className="text-lg text-ink/60 mt-2">{phaseSeconds} segundos</Text>

      <View className="w-full mt-12">
        <Button variant="ghost" onPress={handleCancel}>
          Detener
        </Button>
      </View>
    </View>
  );
}
