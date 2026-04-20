import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import { useMutation } from "@tanstack/react-query";

export interface MyDataDump {
  exported_at: string;
  user_id: string;
  email: string | null;
  profile: unknown;
  sensory_preferences: unknown;
  diagnoses: unknown;
  regulation_sessions: unknown;
  mood_logs: unknown;
  consents: unknown;
  ai_conversations: unknown;
  ai_messages: unknown;
}

/**
 * Recolecta todos los datos del usuario desde la BD (protegido por RLS
 * — solo devuelve sus propios datos) y los devuelve como dump JSON.
 */
export function useMyDataExport() {
  const { user } = useAuth();

  return useMutation<MyDataDump>({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");

      const [
        profile,
        prefs,
        diagnoses,
        sessions,
        moods,
        consents,
        conversations,
        messages,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("sensory_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("user_diagnoses").select("*").eq("user_id", user.id),
        supabase
          .from("regulation_sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("mood_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("consents")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("ai_conversations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("ai_messages")
          .select("id,conversation_id,role,content,flagged_for_crisis,created_at"),
      ]);

      return {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        email: user.email ?? null,
        profile: profile.data,
        sensory_preferences: prefs.data,
        diagnoses: diagnoses.data ?? [],
        regulation_sessions: sessions.data ?? [],
        mood_logs: moods.data ?? [],
        consents: consents.data ?? [],
        ai_conversations: conversations.data ?? [],
        ai_messages: messages.data ?? [],
      };
    },
  });
}
