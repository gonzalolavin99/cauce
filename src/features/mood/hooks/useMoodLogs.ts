import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import type { MoodLog } from "@/src/types/database.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useMoodLogs(limit = 30) {
  const { user } = useAuth();
  return useQuery<MoodLog[]>({
    queryKey: ["mood-logs", user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mood_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface CreateMoodLogInput {
  mood: string;
  energy: number;
  note?: string | null;
}

export function useCreateMoodLog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMoodLogInput) => {
      if (!user) throw new Error("No autenticado");

      const payload = {
        user_id: user.id,
        mood: input.mood,
        energy: input.energy,
        note: input.note?.trim() || null,
      };

      const { data, error } = await (supabase.from("mood_logs") as any)
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as MoodLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-logs"] });
    },
  });
}
