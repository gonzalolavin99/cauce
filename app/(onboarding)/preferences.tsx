import {
  CALMING_INPUTS,
  TRIGGERING_INPUTS,
} from "@/src/features/onboarding/data/options";
import { useOnboardingStore } from "@/src/features/onboarding/store";
import { useSaveOnboarding } from "@/src/features/profile/hooks/useProfile";
import { Button } from "@/src/shared/ui/Button";
import { ChipSelector } from "@/src/shared/ui/ChipSelector";
import { ProgressDots } from "@/src/shared/ui/ProgressDots";
import { Screen } from "@/src/shared/ui/Screen";
import { SectionHeader } from "@/src/shared/ui/SectionHeader";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

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
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <View className="flex-row items-center justify-between mb-8">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="flex-row items-center gap-1 active:opacity-60"
          >
            <Ionicons name="chevron-back" size={18} color="#2F6D6E" />
            <Text className="text-sm text-river-700 font-medium">Atrás</Text>
          </Pressable>
          <ProgressDots total={3} current={2} />
          <Text className="text-xs text-ink/50">Paso 3 de 3</Text>
        </View>

        <Text className="text-3xl font-bold text-ink mb-3 tracking-tight">
          ¿Qué te ayuda y qué te desregula?
        </Text>
        <Text className="text-ink/70 mb-8 leading-6">
          Elige lo que reconozcas. Puedes cambiar esto cuando quieras.
        </Text>

        <View className="mb-8">
          <SectionHeader label="Me calma" icon="sparkles-outline" />
          <ChipSelector<string>
            options={CALMING_INPUTS}
            selected={calming_inputs}
            onChange={setCalming}
            allowCustom
            addPlaceholder="Ej: abrazar a mi perro"
          />
        </View>

        <View className="mb-10">
          <SectionHeader label="Me desregula" icon="flash-outline" />
          <ChipSelector<string>
            options={TRIGGERING_INPUTS}
            selected={triggering_inputs}
            onChange={setTriggering}
            allowCustom
            addPlaceholder="Ej: recuerdos, conversaciones difíciles"
          />
        </View>

        <Button
          onPress={handleContinue}
          loading={saveOnboarding.isPending}
          disabled={saveOnboarding.isPending}
        >
          Terminar
        </Button>
        <Text className="text-xs text-ink/50 text-center mt-3">
          Puedes saltarte esto dejándolo vacío
        </Text>
      </ScrollView>
    </Screen>
  );
}
