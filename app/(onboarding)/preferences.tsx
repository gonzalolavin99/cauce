import {
  CALMING_INPUTS,
  TRIGGERING_INPUTS,
} from "@/src/features/onboarding/data/options";
import { useOnboardingStore } from "@/src/features/onboarding/store";
import { useSaveOnboarding } from "@/src/features/profile/hooks/useProfile";
import { Button } from "@/src/shared/ui/Button";
import { ChipSelector } from "@/src/shared/ui/ChipSelector";
import { Screen } from "@/src/shared/ui/Screen";
import { useRouter } from "expo-router";
import { Alert, ScrollView, Text, View } from "react-native";

export default function PreferencesScreen() {
  const router = useRouter();
  const {
    diagnoses,
    calming_inputs,
    triggering_inputs,
    default_time_available,
    default_mobility,
    prefers_voice_guidance,
    prefers_haptics,
    setCalming,
    setTriggering,
    reset,
  } = useOnboardingStore();

  const saveOnboarding = useSaveOnboarding();

  const handleContinue = () => {
    saveOnboarding.mutate(
      {
        diagnoses,
        calming_inputs,
        triggering_inputs,
        default_time_available,
        default_mobility,
        prefers_voice_guidance,
        prefers_haptics,
      },
      {
        onSuccess: () => {
          reset();
          router.replace("/(tabs)");
        },
        onError: (error: Error) => {
          Alert.alert("Error al guardar", error.message);
        },
      }
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text className="text-3xl font-bold text-ink mb-2">
          ¿Qué te ayuda y qué te desregula?
        </Text>
        <Text className="text-ink/70 mb-6">
          Elige lo que reconozcas. Puedes cambiar esto cuando quieras.
        </Text>

        <Text className="text-lg font-semibold text-ink mb-3">Me calma</Text>
        <ChipSelector<string>
          options={CALMING_INPUTS}
          selected={calming_inputs}
          onChange={setCalming}
          allowCustom
          addPlaceholder="Ej: abrazar a mi perro"
        />

        <Text className="text-lg font-semibold text-ink mt-8 mb-3">
          Me desregula
        </Text>
        <ChipSelector<string>
          options={TRIGGERING_INPUTS}
          selected={triggering_inputs}
          onChange={setTriggering}
          allowCustom
          addPlaceholder="Ej: recuerdos, conversaciones difíciles"
        />

        <View className="mt-10">
          <Button
            onPress={handleContinue}
            disabled={saveOnboarding.isPending}
          >
            {saveOnboarding.isPending ? "Guardando..." : "Terminar"}
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}
