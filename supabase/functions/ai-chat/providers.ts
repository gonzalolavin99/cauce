// Abstracción de proveedor de LLM.
// Para cambiar de OpenAI a Anthropic/Gemini/Mistral/etc., implementar
// la interfaz LlmProvider y actualizar la factory en index.ts.

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmResponse {
  text: string;
  /** Identificador del modelo usado, para log */
  model: string;
  /** Uso de tokens si el proveedor lo reporta */
  usage?: { prompt: number; completion: number };
}

export interface LlmProvider {
  complete(messages: LlmMessage[]): Promise<LlmResponse>;
}

// ----------------------------------------------------------------
// OpenAI
// ----------------------------------------------------------------
export class OpenAIProvider implements LlmProvider {
  constructor(
    private apiKey: string,
    private model: string = "gpt-4o-mini",
    private maxTokens: number = 400,
    private temperature: number = 0.7
  ) {}

  async complete(messages: LlmMessage[]): Promise<LlmResponse> {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`OpenAI ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    return {
      text,
      model: this.model,
      usage: data?.usage
        ? {
            prompt: data.usage.prompt_tokens ?? 0,
            completion: data.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
  }
}

// ----------------------------------------------------------------
// Stub de Anthropic (cuando quieras activarlo, set ANTHROPIC_API_KEY)
// ----------------------------------------------------------------
export class AnthropicProvider implements LlmProvider {
  constructor(
    private apiKey: string,
    private model: string = "claude-3-5-haiku-latest",
    private maxTokens: number = 400
  ) {}

  async complete(messages: LlmMessage[]): Promise<LlmResponse> {
    // Anthropic separa el system prompt del resto de mensajes
    const systemMsg = messages.find((m) => m.role === "system");
    const convo = messages.filter((m) => m.role !== "system");

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemMsg?.content ?? "",
        messages: convo.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Anthropic ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    const text: string =
      data?.content?.map((c: { text: string }) => c.text).join("") ?? "";
    return { text, model: this.model };
  }
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------
export function makeProvider(): LlmProvider {
  const providerName = (Deno.env.get("AI_PROVIDER") ?? "openai").toLowerCase();

  if (providerName === "anthropic") {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) throw new Error("ANTHROPIC_API_KEY no definida");
    const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-3-5-haiku-latest";
    return new AnthropicProvider(key, model);
  }

  // default: openai
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY no definida");
  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
  return new OpenAIProvider(key, model);
}
