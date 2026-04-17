import { signOut, useAuth } from "@/src/features/auth/hooks/useAuth";
import { useExercises } from "@/src/features/exercises/hooks/useExercises";
import { Button } from "@/src/shared/ui/Button";
import { Screen } from "@/src/shared/ui/Screen";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: exercises, isLoading, error } = useExercises();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text className="text-3xl font-bold text-ink mb-2">Cauce</Text>
        <Text className="text-ink/70 mb-4">
          Sesión: {user?.email ?? "sin usuario"}
        </Text>

        <View className="mb-6">
          <Button variant="ghost" onPress={() => signOut()}>
            Cerrar sesión
          </Button>
        </View>

        {isLoading && <ActivityIndicator />}
        {error && <Text className="text-alert">{error.message}</Text>}

        {exercises?.map((ex) => (
          <View
            key={ex.id}
            className="mb-3 p-4 rounded-2xl bg-river-50 border border-river-100"
          >
            <Text className="text-lg font-semibold text-river-900">
              {ex.name_es}
            </Text>
            <Text className="text-sm text-ink/70 mt-1">
              {ex.short_description_es}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}