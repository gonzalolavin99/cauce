import { ExerciseCard } from "@/src/features/exercises/components/ExerciseCard";
import {
    CATEGORY_LABELS,
    CATEGORY_ORDER,
} from "@/src/features/exercises/data/labels";
import { useExercises } from "@/src/features/exercises/hooks/useExercises";
import { Card } from "@/src/shared/ui/Card";
import { ChipSelector } from "@/src/shared/ui/ChipSelector";
import { Screen } from "@/src/shared/ui/Screen";
import type { Exercise, ExerciseCategory } from "@/src/types/database.types";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

type CategoryFilter = "all" | ExerciseCategory;
type DurationFilter = "any" | "short" | "medium" | "long";

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: "any", label: "Cualquiera" },
  { value: "short", label: "< 3 min" },
  { value: "medium", label: "3-5 min" },
  { value: "long", label: "> 5 min" },
];

export default function ExploreScreen() {
  const router = useRouter();
  const { data: exercises, isLoading } = useExercises();

  const [category, setCategory] = useState<CategoryFilter>("all");
  const [duration, setDuration] = useState<DurationFilter>("any");

  const categoryOptions = useMemo(
    () => [
      { value: "all" as CategoryFilter, label: "Todas" },
      ...CATEGORY_ORDER.map((c) => ({
        value: c as CategoryFilter,
        label: CATEGORY_LABELS[c],
      })),
    ],
    []
  );

  const filtered = useMemo(() => {
    if (!exercises) return [];
    return exercises.filter((ex) => {
      if (category !== "all" && ex.category !== category) return false;
      const minutes = ex.duration_seconds / 60;
      if (duration === "short" && minutes >= 3) return false;
      if (duration === "medium" && (minutes < 3 || minutes > 5)) return false;
      if (duration === "long" && minutes <= 5) return false;
      return true;
    });
  }, [exercises, category, duration]);

  const handlePress = useCallback(
    (exerciseId: string) => {
      Haptics.selectionAsync().catch(() => {});
      router.push({ pathname: "/regulate", params: { exerciseId } });
    },
    [router]
  );

  const hasActiveFilter = category !== "all" || duration !== "any";

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <ExerciseCard exercise={item} onPress={handlePress} />
    ),
    [handlePress]
  );

  const keyExtractor = useCallback((item: Exercise) => item.id, []);

  const ListHeader = (
    <View>
      <Text className="text-3xl font-bold text-ink mb-2">Explorar</Text>
      <Text className="text-ink/70 mb-8">
        Navega todos los ejercicios disponibles.
      </Text>

      <View className="flex-row items-center mb-3 gap-2">
        <Ionicons name="layers-outline" size={14} color="#2F6D6E" />
        <Text className="text-xs uppercase text-ink/60 font-semibold tracking-wider">
          Categoría
        </Text>
      </View>
      <ChipSelector<CategoryFilter>
        options={categoryOptions}
        selected={[category]}
        onChange={(next) => {
          if (next[0]) setCategory(next[0]);
        }}
        multi={false}
      />

      <View className="mt-6">
        <View className="flex-row items-center mb-3 gap-2">
          <Ionicons name="time-outline" size={14} color="#2F6D6E" />
          <Text className="text-xs uppercase text-ink/60 font-semibold tracking-wider">
            Duración
          </Text>
        </View>
        <ChipSelector<DurationFilter>
          options={DURATION_OPTIONS}
          selected={[duration]}
          onChange={(next) => {
            if (next[0]) setDuration(next[0]);
          }}
          multi={false}
        />
      </View>

      {!isLoading && filtered.length > 0 && (
        <Text className="text-xs text-ink/50 mb-3 mt-8">
          {filtered.length}{" "}
          {filtered.length === 1 ? "ejercicio" : "ejercicios"}
        </Text>
      )}
    </View>
  );

  const ListEmpty = isLoading ? (
    <View className="py-10 items-center">
      <ActivityIndicator />
    </View>
  ) : (
    <Card variant="muted">
      <View className="items-center py-4">
        <View className="h-12 w-12 rounded-2xl bg-river-100 items-center justify-center mb-3">
          <Ionicons name="search-outline" size={22} color="#2F6D6E" />
        </View>
        <Text className="text-base font-semibold text-ink mb-1">
          Sin resultados
        </Text>
        <Text className="text-sm text-ink/60 text-center leading-5">
          {hasActiveFilter
            ? "No hay ejercicios con estos filtros. Prueba ampliando la búsqueda."
            : "Aún no hay ejercicios disponibles."}
        </Text>
      </View>
    </Card>
  );

  return (
    <Screen>
      <FlashList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
      />
    </Screen>
  );
}
