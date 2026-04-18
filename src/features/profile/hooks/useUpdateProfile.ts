import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import type { Diagnosis, Mobility } from "@/src/types/database.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";


export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: { display_name?: string | null }) => {
      if (!user) throw new Error("No user");
      const { error } = await (supabase.from("profiles") as any)
        .update(patch)
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}


export function useUpdateDiagnoses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (diagnoses: Diagnosis[]) => {
      if (!user) throw new Error("No user");

      const { error: delErr } = await supabase
        .from("user_diagnoses")
        .delete()
        .eq("user_id", user.id);
      if (delErr) throw delErr;

      if (diagnoses.length > 0) {
        const rows = diagnoses.map((d) => ({
          user_id: user.id,
          diagnosis: d,
        }));
        const { error: insErr } = await supabase
          .from("user_diagnoses")
          .insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_diagnoses"] });
    },
  });
}

interface PreferencesPatch {
  calming_inputs?: string[];
  triggering_inputs?: string[];
  default_time_available?: number;
  default_mobility?: Mobility;
  prefers_voice_guidance?: boolean;
  prefers_haptics?: boolean;
}


export function useUpdatePreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: PreferencesPatch) => {
      if (!user) throw new Error("No user");
      const { error } = await (supabase.from("sensory_preferences") as any)
        .update(patch)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensory_preferences"] });
    },
  });
}
