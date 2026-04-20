import { supabase } from "@/src/shared/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface SendMessageInput {
  conversationId: string | null;
  message: string;
}

export interface SendMessageResult {
  conversation_id: string;
  reply: string;
  flagged_for_crisis: boolean;
}

/**
 * Envía un mensaje al asistente invocando la Edge Function 'ai-chat'.
 * El servidor valida auth, consentimiento ai_advisor, detecta crisis,
 * persiste ambos mensajes y llama al proveedor de LLM.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation<SendMessageResult, Error, SendMessageInput>({
    mutationFn: async ({ conversationId, message }) => {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { conversation_id: conversationId, message },
      });

      if (error) {
        // El FunctionsHttpError de supabase-js envuelve el body JSON
        // en .context.response si está disponible.
        const detail =
          (error as unknown as { context?: { response?: Response } })?.context
            ?.response;
        if (detail) {
          try {
            const parsed = await detail.json();
            if (parsed?.error === "ai_consent_missing") {
              throw new Error("ai_consent_missing");
            }
            throw new Error(parsed?.error ?? error.message);
          } catch (jsonErr) {
            if (
              jsonErr instanceof Error &&
              jsonErr.message === "ai_consent_missing"
            ) {
              throw jsonErr;
            }
          }
        }
        throw error;
      }

      return data as SendMessageResult;
    },
    onSuccess: (data) => {
      // Invalidar mensajes y lista de conversaciones
      queryClient.invalidateQueries({
        queryKey: ["ai-messages", data.conversation_id],
      });
      queryClient.invalidateQueries({ queryKey: ["ai-active-conversation"] });
    },
  });
}
