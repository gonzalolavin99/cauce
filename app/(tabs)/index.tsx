import { useExercises } from "@/src/features/exercises/hooks/useExercises";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  const { data: exercises, isLoading, error } = useExercises();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-ink">Cargando ejercicios...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-bg">
        <Text className="text-alert font-semibold mb-2">Error de conexión</Text>
        <Text className="text-ink text-center">{error.message}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg">
      <View className="p-6">
        <Text className="text-3xl font-bold text-ink mb-2">Cauce</Text>
        <Text className="text-ink/70 mb-6">
          {exercises?.length ?? 0} ejercicios cargados desde Supabase
        </Text>

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
            <View className="flex-row gap-2 mt-2">
              <Text className="text-xs px-2 py-1 rounded-full bg-river-100 text-river-700">
                {ex.category}
              </Text>
              <Text className="text-xs px-2 py-1 rounded-full bg-sand-500/20 text-ink">
                {Math.round(ex.duration_seconds / 60)} min
              </Text>
              <Text className="text-xs px-2 py-1 rounded-full bg-river-500/20 text-river-700">
                {ex.evidence_level}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}