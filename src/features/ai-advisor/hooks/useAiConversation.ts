import { useAuth } from "@/src/features/auth/hooks/useAuth";
import { supabase } from "@/src/shared/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  flagged_for_crisis: boolean | null;
  created_at: string;
}

/**
 * Devuelve (y si no existe, crea implícitamente) la conversación activa del
 * usuario. Modelo simplificado v1: un usuario = una conversación continua.
 * La conversación se crea automáticamente cuando el backend recibe el primer
 * mensaje con conversation_id=null, así que este hook solo la busca.
 */
export function useActiveConversation() {
  const { user } = useAuth();

  return useQuery<string | null>({
    queryKey: ["ai-active-conversation", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery<AiMessage[]>({
    queryKey: ["ai-messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AiMessage[];
    },
  });
}
