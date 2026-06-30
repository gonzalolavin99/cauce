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
import type { ExerciseStep } from "@/src/types/database.types";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

interface ExerciseRunnerProps {
  steps: ExerciseStep[];
  withVoice?: boolean;
  withHaptics?: boolean;
  onComplete: () => void;
  onCancel?: () => void;
}

const INHALE_KEYWORDS = ["inhala", "inhalar", "inspira", "inspirar"];
const EXHALE_KEYWORDS = ["exhala", "exhalar", "espira", "espirar", "suelta"];

function phaseScale(label: string, prevScale: number): number {
  const lower = label.toLowerCase();
  if (INHALE_KEYWORDS.some((k) => lower.includes(k))) return 1.6;
  if (EXHALE_KEYWORDS.some((k) => lower.includes(k))) return 1;
  return prevScale;
}

function speak(text: string) {
  void speakCalm(text);
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
  const [voiceOn, setVoiceOn] = useState(withVoice);
  const [paused, setPaused] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = steps[stepIndex];

  // Cuenta regresiva visual de la fase/paso actual. Se congela al pausar.
  const currentSeconds =
    step?.type === "cycle"
      ? (step.phases[cyclePhaseIndex]?.seconds ?? 0)
      : (step?.seconds ?? 0);
  const secondsLeft = useCountdown(
    currentSeconds,
    `${stepIndex}-${cycleRepeatIndex}-${cyclePhaseIndex}`,
    !paused
  );

  function toggleVoice() {
    setVoiceOn((on) => {
      if (on) stopSpeaking();
      return !on;
    });
  }

  useEffect(() => {
    primeVoice();
    return () => {
      stopSpeaking();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!step) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    // Pausado: no hablamos ni avanzamos. La fase actual se reanuda al despausar.
    if (paused) return;

    if (step.type === "cycle") {
      const phase = step.phases[cyclePhaseIndex];
      if (!phase) return;

      if (withHaptics) haptic("light");
      if (voiceOn) speak(phase.label);

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
      if (withHaptics) haptic("light");
      if (voiceOn) speak(step.text);

      timerRef.current = setTimeout(() => {
        advanceStep();
      }, step.seconds * 1000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, cyclePhaseIndex, cycleRepeatIndex, paused]);

  function advanceStep() {
    if (stepIndex >= steps.length - 1) {
      if (withHaptics) haptic("success");
      if (voiceOn) speak("Terminaste. Bien hecho.");
      onComplete();
    } else {
      setStepIndex((s) => s + 1);
      setCyclePhaseIndex(0);
      setCycleRepeatIndex(0);
    }
  }

  // Detener: congela TODO al instante (countdown, avance, voz) y abre el
  // diálogo de confirmación (propio, funciona en web).
  function handleCancel() {
    setPaused(true);
    stopSpeaking();
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowStopConfirm(true);
  }

  function resumeFromConfirm() {
    setShowStopConfirm(false);
    setPaused(false); // reanuda la fase actual
  }

  function confirmStop() {
    setShowStopConfirm(false);
    onCancel?.();
  }

  const stopDialog = (
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
  );

  if (!step) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-ink/70">Sin pasos</Text>
      </View>
    );
  }

  if (step.type === "cycle") {
    const phase = step.phases[cyclePhaseIndex];
    const label = phase?.label ?? "";
    const seconds = phase?.seconds ?? 0;

    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base text-ink/70 mb-2">
          Ciclo {cycleRepeatIndex + 1} de {step.repeat}
        </Text>

        <View className="my-8">
          <BreathingCircle
            label={label}
            seconds={seconds}
            targetScale={lastScale}
            animate={
              !paused &&
              (INHALE_KEYWORDS.some((k) => label.toLowerCase().includes(k)) ||
                EXHALE_KEYWORDS.some((k) => label.toLowerCase().includes(k)))
            }
          />
        </View>

        <Text className="text-5xl font-bold text-ink mt-4 text-center">
          {label}
        </Text>
        <View className="mt-3">
          <CountdownRing secondsLeft={secondsLeft} total={seconds} />
        </View>

        <View className="w-full mt-10 gap-4">
          <VoiceToggle enabled={voiceOn} onToggle={toggleVoice} />
          <Button variant="ghost" onPress={handleCancel}>
            Detener
          </Button>
        </View>
        {stopDialog}
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-sm text-river-700 uppercase mb-4">
        Paso {stepIndex + 1} de {steps.length}
      </Text>

      <Text className="text-3xl font-semibold text-ink text-center leading-10">
        {step.text}
      </Text>

      <View className="mt-8">
        <CountdownRing secondsLeft={secondsLeft} total={step.seconds} />
      </View>

      <View className="w-full mt-10 gap-4">
        <VoiceToggle enabled={voiceOn} onToggle={toggleVoice} />
        <Button variant="ghost" onPress={handleCancel}>
          Detener
        </Button>
      </View>
      {stopDialog}
    </View>
  );
}
