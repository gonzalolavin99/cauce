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
import {
  buildSystemPrompt,
  type CrisisPlanSummary,
  type MoodSummary,
} from "./prompt.ts";
import { makeProvider, type LlmMessage } from "./providers.ts";

interface MoodLogRow {
  mood: string | null;
  energy: number | null;
  created_at: string | null;
}

/**
 * Resume los check-ins de mood de los últimos 14 días:
 * - Cantidad total
 * - Mood más frecuente
 * - Último registro + cuánto tiempo atrás
 *
 * Devuelve null si no hay logs con mood registrado.
 */
function summarizeMood(logs: MoodLogRow[]): MoodSummary | null {
  if (logs.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const l of logs) {
    if (!l.mood) continue;
    counts[l.mood] = (counts[l.mood] ?? 0) + 1;
  }

  let dominantMood: string | null = null;
  let bestCount = 0;
  for (const [mood, count] of Object.entries(counts)) {
    if (count > bestCount) {
      dominantMood = mood;
      bestCount = count;
    }
  }

  // Último registro (ya vienen ordenados desc en la query, pero robustecemos)
  const withDate = logs.filter((l) => l.created_at && l.mood);
  withDate.sort((a, b) => {
    const at = new Date(a.created_at!).getTime();
    const bt = new Date(b.created_at!).getTime();
    return bt - at;
  });
  const latest = withDate[0];

  let lastEntry: MoodSummary["lastEntry"];
  if (latest?.created_at && latest.mood) {
    const hoursAgo = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60 * 60)
      )
    );
    lastEntry = {
      mood: latest.mood,
      energy: latest.energy,
      hoursAgo,
    };
  }

  const total = logs.filter((l) => l.mood).length;
  if (total === 0) return null;

  return {
    checkinsLast14Days: total,
    dominantMood,
    lastEntry,
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const EMBED_MODEL = "text-embedding-3-small";

/**
 * 7.3 RAG — Recupera ejercicios relevantes al mensaje del usuario vía
 * búsqueda semántica sobre `exercise_embeddings`. Best-effort: ante cualquier
 * error (sin API key, sin embeddings cargados, etc.) devuelve [] y el chat
 * funciona igual, sin contexto extra.
 */
async function retrieveRelevantExercises(
  supabase: any,
  query: string
): Promise<string[]> {
  if (!OPENAI_API_KEY) return [];
  try {
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: query.slice(0, 2000) }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) return [];

    const { data: matches, error } = await supabase.rpc("match_exercises", {
      query_embedding: embedding,
      match_count: 3,
      similarity_threshold: 0.2,
    });
    if (error || !Array.isArray(matches)) return [];
    return matches
      .map((m: any) => (typeof m.content === "string" ? m.content.trim() : ""))
      .filter((s: string) => s.length > 0);
  } catch (err) {
    console.error("rag retrieval error", err);
    return [];
  }
}

// 7.2.1 — Sugerencias de seguimiento generadas por el LLM.
const SUGGESTION_PROMPT = `Eres un generador de respuestas rápidas para el usuario de una app de bienestar (NO eres el asistente). Dada la conversación, propón 3 cosas BREVES que el USUARIO podría querer decir o pedir a continuación, en su propia voz.

Reglas:
- Máximo 6 palabras cada una.
- En primera persona o como petición ("Cuéntame más", "Me cuesta dormir", "¿Y si lo intento?").
- Español neutro latinoamericano. NUNCA voseo ("podés", "tenés", "contame").
- Variadas entre sí; útiles para seguir la conversación.
- Si hubo señales de crisis, ninguna debe banalizar; prioriza pedir ayuda o un ejercicio.
- Devuelve SOLO un array JSON de 3 strings. Sin texto adicional, sin markdown.`;

/**
 * Genera 3 sugerencias de seguimiento en la voz del usuario. Best-effort:
 * ante cualquier error o salida no parseable, devuelve [] y el cliente cae
 * a las sugerencias estáticas.
 */
async function generateSuggestions(
  provider: { complete: (m: LlmMessage[]) => Promise<{ text: string }> },
  recent: LlmMessage[]
): Promise<string[]> {
  try {
    const convo = recent.filter((m) => m.role !== "system").slice(-6);
    const resp = await provider.complete([
      { role: "system", content: SUGGESTION_PROMPT },
      ...convo,
      {
        role: "user",
        content:
          "Devuelve ahora el array JSON con 3 respuestas rápidas para mí.",
      },
    ]);
    const raw = (resp.text ?? "").trim();
    // El modelo a veces envuelve en ```json … ```; extraemos el array.
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 40)
      .slice(0, 3);
  } catch (err) {
    console.error("suggestion gen error", err);
    return [];
  }
}

// Rate limit: 20 mensajes por 15 min por usuario — la lógica vive en la
// función SECURITY DEFINER `check_and_increment_ai_rate_limit` (DB).

// UUID v4 (y compatibles): 8-4-4-4-12 hex. Validamos formato antes
// de tocar Postgres para no generar errores 500 por inputs basura.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Seguridad 1.1 (mejoras-pendientes-v2): CORS con allowlist en vez de `*`.
// Las apps nativas no envían Origin (no les aplica CORS); los navegadores
// solo pueden invocar desde estos orígenes. Para agregar un dominio nuevo
// (p. ej. dominio propio), sumarlo acá y redeployar.
const ALLOWED_ORIGINS = new Set([
  "https://cauce-bienestar-pwa.vercel.app",
  // Legacy: sitio viejo de Netlify, sigue en línea hasta apagarlo.
  "https://cauce-bienestar-pwa.netlify.app",
  // Dev local (expo web).
  "http://localhost:8081",
]);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  // Sin Origin (nativo/curl) o no permitido: sin header ACAO → el navegador
  // bloquea la lectura cross-origin; clientes no-navegador siguen igual.
  return headers;
}

function jsonResponseWith(
  cors: Record<string, string>,
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const CORS_HEADERS = corsHeadersFor(req);
  const jsonResponse = (body: unknown, status = 200) =>
    jsonResponseWith(CORS_HEADERS, body, status);

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
    const wantsStream: boolean = body?.stream === true;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return jsonResponse({ error: "missing_message" }, 400);
    }
    if (message.length > 4000) {
      return jsonResponse({ error: "message_too_long" }, 400);
    }
    if (
      conversationIdIn !== null &&
      (typeof conversationIdIn !== "string" || !UUID_RE.test(conversationIdIn))
    ) {
      return jsonResponse({ error: "invalid_conversation_id" }, 400);
    }

    // 2.5 Rate limit — delegado a la función SECURITY DEFINER
    // `check_and_increment_ai_rate_limit` (migración 20260611120000).
    // La tabla ya no es accesible con el JWT del usuario: así nadie puede
    // resetear su propia ventana vía PostgREST. El upsert es atómico en DB
    // (sin carrera select→upsert como antes).
    {
      const { data: rl, error: rlErr } = await supabase.rpc(
        "check_and_increment_ai_rate_limit"
      );
      if (rlErr) {
        // Fail-open: si el RPC falla (p. ej. migración aún no aplicada),
        // log y seguimos. Prefiero servir a un usuario legítimo que caerle
        // a uno que quizás no está abusando por un error de DB.
        console.error("rate limit rpc error", rlErr);
      } else if (rl && rl.allowed === false) {
        const retryAfterSec = Math.max(1, Number(rl.retry_after) || 1);
        return new Response(
          JSON.stringify({ error: "rate_limited", retry_after: retryAfterSec }),
          {
            status: 429,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json",
              "Retry-After": String(retryAfterSec),
            },
          }
        );
      }
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
    // Fetch en paralelo: profile, diagnoses, mood logs (14d), sensory prefs,
    // crisis plan. Cualquier fallo puntual no aborta el chat — degradamos
    // a contexto parcial.
    const fourteenDaysAgo = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000
    ).toISOString();

    const [
      profileRes,
      diagnosesRes,
      moodLogsRes,
      sensoryRes,
      crisisPlanRes,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("user_diagnoses")
        .select("diagnosis")
        .eq("user_id", user.id),
      supabase
        .from("mood_logs")
        .select("mood, energy, created_at")
        .gte("created_at", fourteenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("sensory_preferences")
        .select("calming_inputs")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("crisis_plans")
        .select("anchor_phrase, what_helps")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const diagnoses: string[] =
      (diagnosesRes.data ?? []).map((d: any) => d.diagnosis).filter(Boolean);

    const moodSummary = summarizeMood(
      (moodLogsRes.data ?? []) as MoodLogRow[]
    );

    const calmingRaw = sensoryRes.data?.calming_inputs;
    const calmingInputs: string[] = Array.isArray(calmingRaw)
      ? calmingRaw.filter((s: unknown): s is string => typeof s === "string")
      : [];

    const cp = crisisPlanRes.data;
    const crisisPlan: CrisisPlanSummary | null =
      cp && (cp.anchor_phrase || cp.what_helps)
        ? {
            anchorPhrase: cp.anchor_phrase ?? null,
            whatHelps: cp.what_helps ?? null,
          }
        : null;

    // 7.3 RAG — ejercicios relevantes al mensaje, inyectados como contexto.
    const relevantContent = await retrieveRelevantExercises(supabase, message);

    const systemPrompt = buildSystemPrompt({
      displayName: profileRes.data?.display_name ?? null,
      diagnoses,
      crisisDetected: userCrisis.isCrisis,
      moodSummary,
      calmingInputs,
      crisisPlan,
      relevantContent,
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
    const convId = conversationId;

    // Persiste el mensaje del asistente + re-chequea crisis. Compartido por
    // la ruta JSON y la de streaming para no duplicar lógica.
    async function persistReply(reply: string): Promise<boolean> {
      const replyCrisis = detectCrisis(reply);
      const flagged = userCrisis.isCrisis || replyCrisis.isCrisis;
      const { error: insertAssistErr } = await supabase
        .from("ai_messages")
        .insert({
          conversation_id: convId,
          role: "assistant",
          content: reply,
          flagged_for_crisis: flagged,
        });
      if (insertAssistErr) {
        console.error("insert assistant msg error", insertAssistErr);
        // No abortamos: ya tenemos la respuesta aunque no se persista.
      }
      return flagged;
    }

    // 9a. Ruta STREAMING (SSE). El cliente web lee los deltas token a token.
    // Eventos: `meta` (conversation_id) → `delta` (fragmentos) → `done`
    // (flagged_for_crisis) | `error`.
    if (wantsStream && provider.completeStream) {
      const encoder = new TextEncoder();
      const sse = (event: string, data: unknown) =>
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let full = "";
          try {
            controller.enqueue(sse("meta", { conversation_id: convId }));
            for await (const delta of provider.completeStream!(llmMessages)) {
              full += delta;
              controller.enqueue(sse("delta", { text: delta }));
            }
            const reply =
              full.trim() || "Estoy aquí. ¿Puedes contarme un poco más?";
            const flagged = await persistReply(reply);
            // 2.3 (mejoras-pendientes-v2): `done` sale apenas la respuesta
            // está persistida — las sugerencias (segunda llamada LLM, 1-3 s)
            // ya no bloquean el fin del mensaje; llegan en su propio evento.
            controller.enqueue(
              sse("done", {
                conversation_id: convId,
                flagged_for_crisis: flagged,
              })
            );
            const suggestions = await generateSuggestions(provider, [
              ...llmMessages,
              { role: "assistant", content: reply },
            ]);
            if (suggestions.length > 0) {
              controller.enqueue(sse("suggestions", { suggestions }));
            }
          } catch (err) {
            console.error("llm stream error", err);
            // Si ya emitimos texto parcial, lo persistimos igual para no
            // perder la respuesta a medias.
            if (full.trim()) await persistReply(full.trim());
            controller.enqueue(sse("error", { error: "ai_provider_error" }));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // 9b. Ruta JSON (no-streaming): nativo y fallback.
    let reply: string;
    try {
      const resp = await provider.complete(llmMessages);
      reply = (resp.text ?? "").trim();
      if (!reply) reply = "Estoy aquí. ¿Puedes contarme un poco más?";
    } catch (err) {
      console.error("llm error", err);
      return jsonResponse({ error: "ai_provider_error" }, 502);
    }

    // Persist y sugerencias en paralelo (la respuesta JSON es una sola, pero
    // al menos no se suman las latencias).
    const [flagged, suggestions] = await Promise.all([
      persistReply(reply),
      generateSuggestions(provider, [
        ...llmMessages,
        { role: "assistant", content: reply },
      ]),
    ]);

    return jsonResponse({
      conversation_id: convId,
      reply,
      flagged_for_crisis: flagged,
      suggestions,
    });
  } catch (err) {
    // Log completo server-side para debug, respuesta genérica al cliente
    // para evitar information disclosure (stack traces, nombres de
    // columnas de Postgres, URLs internas, etc).
    console.error("server error", err);
    return jsonResponse({ error: "server_error" }, 500);
  }
});
