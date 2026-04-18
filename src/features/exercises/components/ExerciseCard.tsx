import {
  CATEGORY_LABELS,
  EVIDENCE_LABELS,
} from "@/src/features/exercises/data/labels";
import type { Exercise } from "@/src/types/database.types";
import { Pressable, Text, View } from "react-native";

interface ExerciseCardProps {
  exercise: Exercise;
  onPress: () => void;
}

export function ExerciseCard({ exercise, onPress }: ExerciseCardProps) {
  const minutes = Math.max(1, Math.round(exercise.duration_seconds / 60));
  const categoryLabel = CATEGORY_LABELS[exercise.category];
  const evidenceLabel = EVIDENCE_LABELS[exercise.evidence_level];

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 p-4 rounded-2xl bg-river-50 border border-river-100 active:bg-river-100"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-river-900">
            {exercise.name_es}
          </Text>
          {exercise.short_description_es && (
            <Text className="text-sm text-ink/70 mt-1">
              {exercise.short_description_es}
            </Text>
          )}
        </View>
        <Text className="text-xs text-ink/50 shrink-0">~{minutes} min</Text>
      </View>

      <View className="flex-row flex-wrap gap-2 mt-2">
        <View className="px-2 py-1 rounded-full bg-river-100">
          <Text className="text-xs text-river-900 font-medium">
            {categoryLabel}
          </Text>
        </View>
        <View className="px-2 py-1 rounded-full bg-sand">
          <Text className="text-xs text-ink/70 font-medium">
            {evidenceLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
