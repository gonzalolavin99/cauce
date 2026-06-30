import { env } from "@/src/shared/env";
import { supabase } from "@/src/shared/lib/supabase";
import { Platform } from "react-native";

export interface StreamMessageInput {
  conversationId: string | null;
  message: string;
}

export interface StreamCallbacks {
  /** Llega temprano con el id de conversación (creada si era null). */
  onMeta?: (conversationId: string) => void;
  /** Un fragmento de texto del asistente. */
  onDelta: (text: string) => void;
  /** Fin exitoso: respuesta completa persistida. */
  onDone: (result: {
    conversation_id: string;
    flagged_for_crisis: boolean;
    suggestions: string[];
  }) => void;
  /**
   * Sugerencias de seguimiento. Llegan DESPUÉS de `done` en un evento
   * propio (el servidor ya no las genera en el camino crítico). Si el
   * servidor es una versión vieja que las manda dentro de `done`, llegan
   * vía `onDone.suggestions` como antes.
   */
  onSuggestions?: (suggestions: string[]) => void;
  /** Error: el código (`rate_limited`, `ai_consent_missing`, …). */
  onError: (code: string) => void;
}

/**
 * El streaming requiere leer `response.body` como stream. El fetch de React
 * Native no lo soporta de forma confiable (devuelve el cuerpo completo), así
 * que solo lo habilitamos en web. En nativo el chat cae a `useSendMessage`.
 */
export function isStreamingSupported(): boolean {
  return (
    Platform.OS === "web" &&
    typeof ReadableStream !== "undefined" &&
    typeof TextDecoder !== "undefined"
  );
}

/**
 * Invoca la Edge Function `ai-chat` en modo streaming (SSE) y reporta los
 * eventos vía callbacks. No persiste nada en cliente: el servidor guarda
 * ambos mensajes; al terminar invalidamos las queries para traer lo real.
 */
export async function streamMessage(
  input: StreamMessageInput,
  cb: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    cb.onError("unauthorized");
    return;
  }

  const url = `${env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
        apikey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        conversation_id: input.conversationId,
        message: input.message,
        stream: true,
      }),
      signal,
    });
  } catch {
    cb.onError("network");
    return;
  }

  // Errores pre-stream (consent, rate limit, validación) llegan como JSON.
  if (!resp.ok || !resp.body) {
    let code = "server_error";
    try {
      const j = await resp.json();
      code = j?.error ?? code;
    } catch {
      // sin cuerpo parseable
    }
    cb.onError(code);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  // Garantiza que cerramos exactamente una vez (done o error), incluso si el
  // stream se corta a la mitad o la función no emite `done`.
  let settled = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;

      let parsed: {
        conversation_id?: string;
        text?: string;
        flagged_for_crisis?: boolean;
        suggestions?: string[];
        error?: string;
      };
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      if (event === "meta" && parsed.conversation_id) {
        cb.onMeta?.(parsed.conversation_id);
      } else if (event === "delta") {
        cb.onDelta(parsed.text ?? "");
      } else if (event === "done") {
        settled = true;
        cb.onDone({
          conversation_id: parsed.conversation_id ?? input.conversationId ?? "",
          flagged_for_crisis: !!parsed.flagged_for_crisis,
          suggestions: Array.isArray(parsed.suggestions)
            ? parsed.suggestions
            : [],
        });
      } else if (event === "suggestions") {
        if (Array.isArray(parsed.suggestions)) {
          cb.onSuggestions?.(parsed.suggestions);
        }
      } else if (event === "error") {
        settled = true;
        cb.onError(parsed.error ?? "server_error");
      }
    }
  }

  // El stream terminó sin un evento terminal (desconexión, o una versión
  // previa de la función que respondió JSON). Reportamos error para que la UI
  // no quede colgada esperando.
  if (!settled) cb.onError("server_error");
}
