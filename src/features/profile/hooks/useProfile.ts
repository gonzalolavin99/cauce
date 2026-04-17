import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import type {
    Diagnosis,
    Profile,
    SensoryPreferences,
} from "@/src/types/database.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useProfile() {
  const { user } = useAuth();

  return useQuery<Profile | null>({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSensoryPreferences() {
  const { user } = useAuth();

  return useQuery<SensoryPreferences | null>({
    queryKey: ["sensory_preferences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sensory_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      diagnoses: Diagnosis[];
      calming_inputs: string[];
      triggering_inputs: string[];
      default_time_available: number;
      default_mobility: "still" | "seated" | "any";
      prefers_voice_guidance: boolean;
      prefers_haptics: boolean;
    }) => {
      if (!user) throw new Error("No user");

      // 1. Upsert diagnoses (borra los previos, inserta los nuevos)
      await supabase.from("user_diagnoses").delete().eq("user_id", user.id);
      if (payload.diagnoses.length > 0) {
        const rows = payload.diagnoses.map((d) => ({
          user_id: user.id,
          diagnosis: d,
        }));
        const { error: dErr } = await supabase
          .from("user_diagnoses")
          .insert(rows);
        if (dErr) throw dErr;
      }

      // 2. Update sensory_preferences
      const { error: pErr } = await supabase
        .from("sensory_preferences")
        .update({
          calming_inputs: payload.calming_inputs,
          triggering_inputs: payload.triggering_inputs,
          default_time_available: payload.default_time_available,
          default_mobility: payload.default_mobility,
          prefers_voice_guidance: payload.prefers_voice_guidance,
          prefers_haptics: payload.prefers_haptics,
        })
        .eq("user_id", user.id);
      if (pErr) throw pErr;

      // 3. Marcar onboarding_completed
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["sensory_preferences"] });
    },
  });
}