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

interface MoodLogMutationContext {
  /** Snapshots de cada query ["mood-logs", …] para rollback ante error. */
  previous: Array<[readonly unknown[], MoodLog[] | undefined]>;
}

export function useCreateMoodLog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<MoodLog, Error, CreateMoodLogInput, MoodLogMutationContext>(
    {
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
      // Optimistic update: la entrada aparece al instante en cada lista de
      // mood-logs (la pantalla de hoy y el historial). Se reconcilia con el
      // servidor en onSettled; ante error, rollback con el snapshot.
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: ["mood-logs"] });

        const previous = queryClient.getQueriesData<MoodLog[]>({
          queryKey: ["mood-logs"],
        });

        const optimistic: MoodLog = {
          id: `optimistic-${Date.now()}`,
          user_id: user?.id ?? null,
          mood: input.mood,
          energy: input.energy,
          note: input.note?.trim() || null,
          created_at: new Date().toISOString(),
        };

        queryClient.setQueriesData<MoodLog[]>(
          { queryKey: ["mood-logs"] },
          (old) => [optimistic, ...(old ?? [])]
        );

        return { previous };
      },
      onError: (_err, _input, context) => {
        // Rollback: restauramos cada query a su estado previo.
        for (const [key, data] of context?.previous ?? []) {
          queryClient.setQueryData(key, data);
        }
      },
      onSettled: () => {
        // Trae el estado real (id/created_at del servidor) y refresca insights.
        queryClient.invalidateQueries({ queryKey: ["mood-logs"] });
        // 9.1: la racha depende de los check-ins.
        queryClient.invalidateQueries({ queryKey: ["mood-streak"] });
        // 9.2: el heatmap también.
        queryClient.invalidateQueries({ queryKey: ["mood-heatmap"] });
      },
    }
  );
}
