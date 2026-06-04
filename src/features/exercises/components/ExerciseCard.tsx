import {
  CATEGORY_LABELS,
  EVIDENCE_LABELS,
} from "@/src/features/exercises/data/labels";
import type {
  EvidenceLevel,
  Exercise,
  ExerciseCategory,
} from "@/src/types/database.types";
import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback } from "react";
import { Pressable, Text, View } from "react-native";

interface ExerciseCardProps {
  exercise: Exercise;
  onPress: (exerciseId: string) => void;
}

const CATEGORY_ICONS: Record<
  ExerciseCategory,
  keyof typeof Ionicons.glyphMap
> = {
  breathing: "water-outline",
  grounding: "leaf-outline",
  body: "body-outline",
  sensory: "ear-outline",
  distress_tolerance: "shield-outline",
};

function ExerciseCardComponent({ exercise, onPress }: ExerciseCardProps) {
  const minutes = Math.max(1, Math.round(exercise.duration_seconds / 60));
  const category = (exercise.category ?? "breathing") as ExerciseCategory;
  const evidence = (exercise.evidence_level ?? "emerging") as EvidenceLevel;
  const categoryLabel = CATEGORY_LABELS[category];
  const evidenceLabel = EVIDENCE_LABELS[evidence];
  const iconName = CATEGORY_ICONS[category];

  const handlePress = useCallback(
    () => onPress(exercise.id),
    [onPress, exercise.id]
  );

  return (
    <Pressable
      onPress={handlePress}
      className="mb-3 p-4 rounded-2xl bg-river-50 border border-river-100 active:bg-river-100"
    >
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 rounded-2xl bg-white items-center justify-center border border-river-100">
          <Ionicons name={iconName} size={18} color="#2F6D6E" />
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-start mb-1">
            <Text className="flex-1 pr-3 text-base font-semibold text-river-900">
              {exercise.name_es}
            </Text>
            <Text className="text-xs text-ink/50 shrink-0">~{minutes} min</Text>
          </View>
          {exercise.short_description_es && (
            <Text className="text-sm text-ink/70 leading-5">
              {exercise.short_description_es}
            </Text>
          )}
          <View className="flex-row flex-wrap gap-2 mt-3">
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
        </View>
      </View>
    </Pressable>
  );
}

export const ExerciseCard = memo(ExerciseCardComponent);
