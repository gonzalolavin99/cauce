import { DIAGNOSIS_OPTIONS } from "@/src/features/onboarding/data/options";
import { useOnboardingStore } from "@/src/features/onboarding/store";
import { useAccentColor } from "@/src/shared/theme/useAccentColor";
import { Button } from "@/src/shared/ui/Button";
import { ChipSelector } from "@/src/shared/ui/ChipSelector";
import { ProgressDots } from "@/src/shared/ui/ProgressDots";
import { Screen } from "@/src/shared/ui/Screen";
import type { Diagnosis } from "@/src/types/database.types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function DiagnosisScreen() {
  const router = useRouter();
  const accent = useAccentColor();
  const { diagnoses, setDiagnoses } = useOnboardingStore();
  const isEmpty = diagnoses.length === 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <View className="flex-row items-center justify-between mb-8">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="flex-row items-center gap-1 active:opacity-60"
          >
            <Ionicons name="chevron-back" size={18} color={accent} />
            <Text className="text-sm text-river-700 font-medium">Atrás</Text>
          </Pressable>
          <ProgressDots total={3} current={1} />
          <Text className="text-xs text-ink/70">Paso 2 de 3</Text>
        </View>

        <Text className="text-3xl font-bold text-ink mb-3 tracking-tight">
          ¿Cómo te identificas?
        </Text>
        <Text className="text-ink/70 mb-2 leading-6">
          Elige todo lo que aplique. No necesitas diagnóstico formal.
        </Text>
        <Text className="text-sm text-ink/70 mb-8 leading-5">
          Esto nos ayuda a sugerirte ejercicios que podrían servirte. Puedes
          cambiarlo cuando quieras.
        </Text>

        <ChipSelector<Diagnosis>
          options={DIAGNOSIS_OPTIONS}
          selected={diagnoses}
          onChange={setDiagnoses}
        />

        <View className="mt-10">
          <Button
            onPress={() => router.push("/(onboarding)/preferences")}
            disabled={isEmpty}
          >
            Continuar
          </Button>
          {isEmpty && (
            <Text className="text-xs text-ink/70 text-center mt-3">
              Selecciona al menos una opción para continuar
            </Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
