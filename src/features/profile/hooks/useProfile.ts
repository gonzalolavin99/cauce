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
      if (!user) {
        throw new Error("No hay sesión activa. Cierra sesión y vuelve a entrar.");
      }

      // 1 y 2 son OPCIONALES: guardar diagnósticos/preferencias NO debe poder
      // bloquear el avance. Si fallan (red, permisos, datos raros), lo logueamos
      // pero seguimos — lo crítico es marcar onboarding_completed (paso 3), o el
      // usuario queda atrapado en el onboarding para siempre.

      // 1. Upsert diagnoses (borra los previos, inserta los nuevos)
      try {
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
      } catch (e) {
        console.warn("onboarding: no se pudieron guardar diagnósticos", e);
      }

      // 2. Update sensory_preferences
      try {
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
      } catch (e) {
        console.warn("onboarding: no se pudieron guardar preferencias", e);
      }

      // 3. Marcar onboarding_completed — CRÍTICO. Si esto falla, sí propagamos
      // el error para que la UI lo muestre y el usuario sepa qué pasó.
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      // Optimista + síncrono: marcamos onboarding_completed en la cache ANTES
      // de que la pantalla navegue. Si no, los guards de ruta (index, (tabs),
      // (onboarding)) leen el profile cacheado con onboarding_completed=false
      // y rebotan al usuario de vuelta al onboarding → la app "queda pegada".
      if (user) {
        queryClient.setQueryData<Profile | null>(["profile", user.id], (old) =>
          old ? { ...old, onboarding_completed: true } : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["sensory_preferences"] });
    },
  });
}