import { Screen } from "@/src/shared/ui/Screen";
import { ScrollView, Text } from "react-native";

export default function ExploreScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text className="text-3xl font-bold text-ink mb-2">Explorar</Text>
        <Text className="text-ink/70">
          Pronto vas a poder navegar todos los ejercicios por categoría.
        </Text>
      </ScrollView>
    </Screen>
  );
}
