import { ExerciseCard } from "@/src/features/exercises/components/ExerciseCard";
import {
    CATEGORY_LABELS,
    CATEGORY_ORDER,
} from "@/src/features/exercises/data/labels";
import { useExercises } from "@/src/features/exercises/hooks/useExercises";
import { REFRESH_TINT, useRefresh } from "@/src/shared/hooks/useRefresh";
import { ChipSelector } from "@/src/shared/ui/ChipSelector";
import { EmptyState } from "@/src/shared/ui/EmptyState";
import { Screen } from "@/src/shared/ui/Screen";
import { SectionHeader } from "@/src/shared/ui/SectionHeader";
import { CardSkeleton } from "@/src/shared/ui/Skeleton";
import { withErrorBoundary } from "@/src/shared/ui/withErrorBoundary";
import type { Exercise, ExerciseCategory } from "@/src/types/database.types";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, Text, View } from "react-native";

type CategoryFilter = "all" | ExerciseCategory;
type DurationFilter = "any" | "short" | "medium" | "long";

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: "any", label: "Cualquiera" },
  { value: "short", label: "< 3 min" },
  { value: "medium", label: "3-5 min" },
  { value: "long", label: "> 5 min" },
];

function ExploreScreen() {
  const router = useRouter();
  const { data: exercises, isLoading } = useExercises();
  const { refreshing, onRefresh } = useRefresh();

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

      <SectionHeader label="Categoría" icon="layers-outline" />
      <ChipSelector<CategoryFilter>
        options={categoryOptions}
        selected={[category]}
        onChange={(next) => {
          if (next[0]) setCategory(next[0]);
        }}
        multi={false}
      />

      <View className="mt-6">
        <SectionHeader label="Duración" icon="time-outline" />
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
        <Text className="text-xs text-ink/60 mb-3 mt-8">
          {filtered.length}{" "}
          {filtered.length === 1 ? "ejercicio" : "ejercicios"}
        </Text>
      )}
    </View>
  );

  const ListEmpty = isLoading ? (
    <View className="gap-3">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </View>
  ) : (
    <EmptyState
      icon="search-outline"
      title="Sin resultados"
      description={
        hasActiveFilter
          ? "No hay ejercicios con estos filtros. Prueba ampliando la búsqueda."
          : "Aún no hay ejercicios disponibles."
      }
    />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={REFRESH_TINT}
            colors={[REFRESH_TINT]}
          />
        }
      />
    </Screen>
  );
}

export default withErrorBoundary(ExploreScreen, { source: "explore" });
