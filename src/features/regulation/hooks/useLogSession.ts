import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import type { Feeling, WasHelpful } from "@/src/types/database.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface StartSessionInput {
  exercise_id: string;
  feeling_before?: Feeling;
  intensity_before?: number;
}

interface CompleteSessionInput {
  id: string;
  intensity_after?: number;
  was_helpful?: WasHelpful;
  notes?: string;
}

export function useLogSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const startSession = useMutation({
    mutationFn: async (input: StartSessionInput) => {
      if (!user) throw new Error("No user");

      const { data, error } = await (supabase.from("regulation_sessions") as any)
        .insert({
          user_id: user.id,
          exercise_id: input.exercise_id,
          feeling_before: input.feeling_before ?? null,
          feeling_intensity_before: input.intensity_before ?? null,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id as string;
    },
  });

  const completeSession = useMutation({
    mutationFn: async (input: CompleteSessionInput) => {
      const { error } = await (supabase.from("regulation_sessions") as any)
        .update({
          completed_at: new Date().toISOString(),
          feeling_intensity_after: input.intensity_after ?? null,
          was_helpful: input.was_helpful ?? null,
          notes: input.notes ?? null,
        })
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regulation_sessions"] });
    },
  });

  return { startSession, completeSession };
}
