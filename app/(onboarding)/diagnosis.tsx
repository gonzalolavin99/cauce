import { DIAGNOSIS_OPTIONS } from "@/src/features/onboarding/data/options";
import { useOnboardingStore } from "@/src/features/onboarding/store";
import { Button } from "@/src/shared/ui/Button";
import { ChipSelector } from "@/src/shared/ui/ChipSelector";
import { Screen } from "@/src/shared/ui/Screen";
import type { Diagnosis } from "@/src/types/database.types";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function DiagnosisScreen() {
  const router = useRouter();
  const { diagnoses, setDiagnoses } = useOnboardingStore();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text className="text-3xl font-bold text-ink mb-2">¿Cómo te identificas?</Text>
        <Text className="text-ink/70 mb-6">
          Elige todo lo que aplique. No necesitas diagnóstico formal.
        </Text>

        <ChipSelector<Diagnosis>
          options={DIAGNOSIS_OPTIONS}
          selected={diagnoses}
          onChange={setDiagnoses}
        />

        <View className="mt-8">
          <Button
            onPress={() => router.push("/(onboarding)/preferences")}
            disabled={diagnoses.length === 0}
          >
            Continuar
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}