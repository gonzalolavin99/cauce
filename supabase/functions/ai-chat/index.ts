// deno-lint-ignore-file no-explicit-any
// Edge Function: ai-chat
//
// POST body: { conversation_id?: string | null, message: string }
// Response:   { conversation_id, reply, flagged_for_crisis }
//
// Flujo:
//   1. Valida el JWT del usuario (Supabase auth)
//   2. Verifica el consentimiento 'ai_advisor' (estado más reciente = grant)
//   3. Detecta crisis en el mensaje del usuario
//   4. Crea conversación si no existe
//   5. Persiste el mensaje del usuario (con flagged_for_crisis si aplica)
//   6. Construye system prompt con contexto (display_name, diagnoses)
//   7. Trae últimos 20 mensajes de la conversación como historial
//   8. Llama al proveedor de LLM (OpenAI por defecto, abstraído via providers.ts)
//   9. Persiste la respuesta del asistente
//  10. Devuelve la respuesta al cliente

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { detectCrisis } from "./crisis.ts";
import { buildSystemPrompt } from "./prompt.ts";
import { makeProvider, type LlmMessage } from "./providers.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    // 2. Parse body
    const body = await req.json().catch(() => null);
    const message: string | undefined = body?.message;
    const conversationIdIn: string | null = body?.conversation_id ?? null;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return jsonResponse({ error: "missing_message" }, 400);
    }
    if (message.length > 4000) {
      return jsonResponse({ error: "message_too_long" }, 400);
    }

    // 3. Check ai_advisor consent (latest event must be 'grant')
    const { data: consentRows } = await supabase
      .from("consents")
      .select("action")
      .eq("user_id", user.id)
      .eq("consent_type", "ai_advisor")
      .order("created_at", { ascending: false })
      .limit(1);

    const hasAiConsent = consentRows?.[0]?.action === "grant";
    if (!hasAiConsent) {
      return jsonResponse({ error: "ai_consent_missing" }, 403);
    }

    // 4. Crisis detection on user input
    const userCrisis = detectCrisis(message);

    // 5. Get or create conversation
    let conversationId: string | null = conversationIdIn;
    if (!conversationId) {
      const { data: newConv, error: convErr } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          title: message.slice(0, 60),
        })
        .select("id")
        .single();

      if (convErr || !newConv) {
        console.error("create conv error", convErr);
        return jsonResponse({ error: "conversation_create_failed" }, 500);
      }
      conversationId = newConv.id as string;
    } else {
      // Validar que la conversación pertenece al usuario
      const { data: owned } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!owned) {
        return jsonResponse({ error: "conversation_not_found" }, 404);
      }
    }

    // 6. Insert user message
    const { error: insertUserErr } = await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
      flagged_for_crisis: userCrisis.isCrisis,
    });
    if (insertUserErr) {
      console.error("insert user msg error", insertUserErr);
      return jsonResponse({ error: "persist_failed" }, 500);
    }

    // 7. User context for system prompt
    const [profileRes, diagnosesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("user_diagnoses")
        .select("diagnosis")
        .eq("user_id", user.id),
    ]);

    const diagnoses: string[] =
      (diagnosesRes.data ?? []).map((d: any) => d.diagnosis).filter(Boolean);

    const systemPrompt = buildSystemPrompt({
      displayName: profileRes.data?.display_name ?? null,
      diagnoses,
      crisisDetected: userCrisis.isCrisis,
    });

    // 8. Fetch recent history (last 20 messages, in order)
    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    const llmMessages: LlmMessage[] = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((m: any) => ({
        role: (m.role as LlmMessage["role"]) ?? "user",
        content: String(m.content ?? ""),
      })),
    ];

    // 9. Call LLM
    const provider = makeProvider();
    let reply: string;
    try {
      const resp = await provider.complete(llmMessages);
      reply = (resp.text ?? "").trim();
      if (!reply) reply = "Estoy aquí. ¿Puedes contarme un poco más?";
    } catch (err) {
      console.error("llm error", err);
      return jsonResponse({ error: "ai_provider_error" }, 502);
    }

    // 10. Defensive crisis re-check on reply
    const replyCrisis = detectCrisis(reply);
    const flagged = userCrisis.isCrisis || replyCrisis.isCrisis;

    // 11. Persist assistant message
    const { error: insertAssistErr } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: reply,
        flagged_for_crisis: flagged,
      });
    if (insertAssistErr) {
      console.error("insert assistant msg error", insertAssistErr);
      // No abortamos: ya tenemos la respuesta, se la devolvemos aunque no
      // se haya persistido.
    }

    return jsonResponse({
      conversation_id: conversationId,
      reply,
      flagged_for_crisis: flagged,
    });
  } catch (err) {
    console.error("server error", err);
    return jsonResponse(
      { error: "server_error", detail: String(err) },
      500
    );
  }
});
