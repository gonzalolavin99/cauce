// deno-lint-ignore-file no-explicit-any
// Edge Function: embed-exercises
//
// Genera (o regenera) los embeddings de la tabla `exercises` para el RAG
// (7.3). Idempotente: hace upsert por exercise_id.
//
// Protección: requiere el SERVICE ROLE KEY en el header Authorization. Es una
// operación administrativa de un solo uso (o cuando cambian los ejercicios),
// NO un endpoint para usuarios. Así evitamos que cualquiera dispare gasto de
// embeddings.
//
// Uso:
//   curl -X POST https://<ref>.functions.supabase.co/embed-exercises \
//     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const EMBED_MODEL = "text-embedding-3-small"; // 1536 dims

/** Decodifica el claim `role` de un JWT (sin verificar firma: el gateway de
 *  Supabase ya la validó antes de llegar acá). */
function jwtRole(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1];
    const norm = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(norm));
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

// Sin CORS a propósito (Seguridad 1.1, mejoras-pendientes-v2): este endpoint
// es administrativo (curl/CI con service role), nunca se invoca desde un
// navegador. Sin header ACAO, cualquier intento cross-origin queda bloqueado
// por el propio navegador.

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Extrae texto humano (text/label) de los `steps` JSON, recursivamente. */
function extractStepText(steps: unknown): string {
  const out: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (typeof node === "object") {
      if (typeof node.text === "string") out.push(node.text);
      if (typeof node.label === "string") out.push(node.label);
      if (Array.isArray(node.phases)) node.phases.forEach(walk);
    }
  };
  walk(steps);
  return out.join(". ");
}

/** Texto canónico de un ejercicio que se va a embeber. */
function buildContent(ex: any): string {
  const parts = [
    ex.name_es,
    ex.short_description_es ?? "",
    ex.category ? `Categoría: ${ex.category}` : "",
    extractStepText(ex.steps),
  ].filter((s) => typeof s === "string" && s.trim().length > 0);
  return parts.join(". ").slice(0, 2000);
}

async function embed(text: string): Promise<number[]> {
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!resp.ok) {
    throw new Error(`OpenAI embeddings ${resp.status}: ${await resp.text()}`);
  }
  const data = await resp.json();
  return data?.data?.[0]?.embedding as number[];
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Auth: solo el service role puede ejecutar esto. Verificamos el claim
  // `role` del JWT (firma ya validada por el gateway de Supabase).
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || jwtRole(token) !== "service_role") {
    return json({ error: "forbidden" }, 403);
  }

  try {
    // Usamos el propio token de service role para el cliente admin (bypassa
    // RLS para el upsert), sin depender de envs que el runtime no inyecte.
    const supabase = createClient(SUPABASE_URL, token);

    const { data: exercises, error } = await supabase
      .from("exercises")
      .select("id, name_es, short_description_es, category, steps");
    if (error) throw error;

    let embedded = 0;
    const errors: string[] = [];

    for (const ex of exercises ?? []) {
      try {
        const content = buildContent(ex);
        const embedding = await embed(content);
        const { error: upErr } = await supabase
          .from("exercise_embeddings")
          .upsert(
            {
              exercise_id: ex.id,
              content,
              embedding: embedding as unknown as string,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "exercise_id" }
          );
        if (upErr) throw upErr;
        embedded++;
      } catch (e) {
        errors.push(`${ex.id}: ${(e as Error).message}`);
      }
    }

    return json({
      ok: true,
      total: exercises?.length ?? 0,
      embedded,
      errors,
    });
  } catch (err) {
    console.error("embed-exercises error", err);
    return json({ error: "server_error", detail: String(err) }, 500);
  }
});
