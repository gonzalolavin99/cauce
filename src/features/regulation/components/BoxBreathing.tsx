import { BreathingCircle } from "@/src/features/regulation/components/BreathingCircle";
import { CountdownRing } from "@/src/features/regulation/components/CountdownRing";
import { VoiceToggle } from "@/src/features/regulation/components/VoiceToggle";
import { useCountdown } from "@/src/features/regulation/hooks/useCountdown";
import {
  primeVoice,
  speakCalm,
  stopSpeaking,
} from "@/src/features/regulation/lib/speech";
import { Button } from "@/src/shared/ui/Button";
import { ConfirmDialog } from "@/src/shared/ui/ConfirmDialog";
import * as Haptics from "expo-haptics";
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
  const [voiceOn, setVoiceOn] = useState(withVoice);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPhase = (PHASE_ORDER[phaseIndex] ?? "inhale") as Phase;

  const secondsLeft = useCountdown(
    phaseSeconds,
    `${cycleIndex}-${phaseIndex}`,
    isRunning
  );

  function toggleVoice() {
    setVoiceOn((on) => {
      if (on) stopSpeaking();
      return !on;
    });
  }

  useEffect(() => {
    if (!isRunning) return;

    if (withHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    if (voiceOn) {
      void speakCalm(PHASE_LABELS[currentPhase]);
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
          if (voiceOn) {
            void speakCalm("Terminaste. Bien hecho.");
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
    primeVoice();
    return () => {
      stopSpeaking();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Detener: pausa al instante (congela countdown, avance, voz y círculo) y
  // abre el diálogo de confirmación (propio, funciona en web).
  function handleCancel() {
    setIsRunning(false);
    stopSpeaking();
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowStopConfirm(true);
  }

  function resumeFromConfirm() {
    setShowStopConfirm(false);
    setIsRunning(true); // reanuda la fase actual
  }

  function confirmStop() {
    setShowStopConfirm(false);
    onCancel?.();
  }

  const animate =
    isRunning && (currentPhase === "inhale" || currentPhase === "exhale");

  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-base text-ink/70 mb-2">
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
      <View className="mt-3">
        <CountdownRing secondsLeft={secondsLeft} total={phaseSeconds} />
      </View>

      <View className="w-full mt-10 gap-4">
        <VoiceToggle enabled={voiceOn} onToggle={toggleVoice} />
        <Button variant="ghost" onPress={handleCancel}>
          Detener
        </Button>
      </View>

      <ConfirmDialog
        visible={showStopConfirm}
        title="¿Quieres salir del ejercicio?"
        message="Podemos intentarlo de nuevo cuando quieras."
        confirmText="Salir"
        cancelText="Seguir"
        destructive
        onConfirm={confirmStop}
        onCancel={resumeFromConfirm}
      />
    </View>
  );
}
