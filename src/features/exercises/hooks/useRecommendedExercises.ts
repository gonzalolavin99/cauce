import {
  type ScoredExercise,
  recommendExercises,
} from "@/src/features/exercises/engine/recommend";
import { useExercises } from "@/src/features/exercises/hooks/useExercises";
import { useDiagnoses } from "@/src/features/profile/hooks/useDiagnoses";
import { useSensoryPreferences } from "@/src/features/profile/hooks/useProfile";
import type { Feeling, Mobility } from "@/src/types/database.types";
import { useMemo } from "react";

export function useRecommendedExercises(feeling?: Feeling): {
  ranked: ScoredExercise[];
  isLoading: boolean;
} {
  const { data: exercises, isLoading: exLoading } = useExercises();
  const { data: prefs, isLoading: prefsLoading } = useSensoryPreferences();
  const { data: diagnoses, isLoading: diagLoading } = useDiagnoses();

  const ranked = useMemo(() => {
    if (!exercises || exercises.length === 0) return [];

    const calmingInputs = Array.isArray(prefs?.calming_inputs)
      ? (prefs!.calming_inputs as string[])
      : [];

    return recommendExercises(exercises, {
      diagnoses: diagnoses ?? [],
      feeling,
      calmingInputs,
      timeAvailable: prefs?.default_time_available ?? 5,
      mobility: (prefs?.default_mobility as Mobility) ?? "any",
    });
  }, [exercises, prefs, diagnoses, feeling]);

  return {
    ranked,
    isLoading: exLoading || prefsLoading || diagLoading,
  };
}
