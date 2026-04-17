import { Button } from "@/src/shared/ui/Button";
import { Screen } from "@/src/shared/ui/Screen";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View className="flex-1 px-6 justify-center">
        <Text className="text-4xl font-bold text-ink mb-4">Bienvenido</Text>
        <Text className="text-lg text-ink/70 mb-8 leading-7">
          Cauce es tu espacio para regularte cuando lo necesitas. Vamos a hacerte unas
          preguntas cortas para adaptarlo a ti.
        </Text>
        <Text className="text-sm text-ink/60 mb-10">
          Toma 1-2 minutos. Puedes cambiar todo después.
        </Text>

        <Button onPress={() => router.push("/(onboarding)/diagnosis")}>
          Empezar
        </Button>
      </View>
    </Screen>
  );
}