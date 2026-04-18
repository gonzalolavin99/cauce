import { ExerciseCard } from "@/src/features/exercises/components/ExerciseCard";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from "@/src/features/exercises/data/labels";
import { useExercises } from "@/src/features/exercises/hooks/useExercises";
import { ChipSelector } from "@/src/shared/ui/ChipSelector";
import { Screen } from "@/src/shared/ui/Screen";
import type { ExerciseCategory } from "@/src/types/database.types";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

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

  function handlePress(exerciseId: string) {
    Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: "/regulate", params: { exerciseId } });
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Text className="text-3xl font-bold text-ink mb-2">Explorar</Text>
        <Text className="text-ink/70 mb-8">
          Navega todos los ejercicios disponibles.
        </Text>

        <Text className="text-xs uppercase text-ink/60 font-semibold mb-3 tracking-wider">
          Categoría
        </Text>
        <ChipSelector<CategoryFilter>
          options={categoryOptions}
          selected={[category]}
          onChange={(next) => {
            if (next[0]) setCategory(next[0]);
          }}
          multi={false}
        />

        <View className="mt-6">
          <Text className="text-xs uppercase text-ink/60 font-semibold mb-3 tracking-wider">
            Duración
          </Text>
          <ChipSelector<DurationFilter>
            options={DURATION_OPTIONS}
            selected={[duration]}
            onChange={(next) => {
              if (next[0]) setDuration(next[0]);
            }}
            multi={false}
          />
        </View>

        <View className="mt-8">
          {isLoading && <ActivityIndicator />}

          {!isLoading && filtered.length === 0 && (
            <Text className="text-ink/60">
              No hay ejercicios con estos filtros.
            </Text>
          )}

          {filtered.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onPress={() => handlePress(exercise.id)}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
