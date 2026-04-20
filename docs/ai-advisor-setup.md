# Setup del AI Advisor (Edge Function `ai-chat`)

Esta guía cubre cómo desplegar y configurar la Edge Function `ai-chat` que alimenta el asistente conversacional de Cauce.

---

## 1. Arquitectura

```
App (React Native)
  └── src/features/ai-advisor/hooks/useSendMessage.ts
        └── supabase.functions.invoke("ai-chat", { body })
              │  Authorization: Bearer <JWT del usuario>
              ▼
Supabase Edge Function: ai-chat  (Deno)
  ├── Valida JWT (supabase.auth.getUser)
  ├── Verifica consentimiento 'ai_advisor' (latest = grant)
  ├── Detecta crisis (crisis.ts — twin del detector cliente)
  ├── Crea/valida conversación (ai_conversations)
  ├── Persiste mensaje user (ai_messages)
  ├── Construye system prompt con contexto (display_name, diagnoses)
  ├── Trae últimos 20 mensajes de historia
  ├── Llama al proveedor de LLM (providers.ts — pluggable)
  ├── Re-verifica crisis en la respuesta
  └── Persiste mensaje assistant + devuelve al cliente
```

La API key **nunca** sale del servidor. El cliente sólo ve el JWT del usuario y el endpoint de Supabase.

---

## 2. Pre-requisitos

- Cuenta de Supabase con el proyecto ya creado.
- Schema aplicado (tablas `profiles`, `user_diagnoses`, `consents`, `ai_conversations`, `ai_messages` con sus RLS).
- API key de un proveedor de LLM. Para el arranque: **OpenAI** (https://platform.openai.com/api-keys).
- Supabase CLI instalado (Windows, PowerShell):
  ```powershell
  scoop install supabase
  # o
  npm install -g supabase
  ```

Verifica:
```bash
supabase --version
```

---

## 3. Vincular el proyecto local con Supabase

Desde la raíz del repo:

```bash
cd C:\Users\GLavin\Documents\Cauce
supabase login                          # abre el browser
supabase link --project-ref <PROJECT_REF>
```

Donde `<PROJECT_REF>` es el ID del proyecto (lo ves en el dashboard → Settings → General → Reference ID).

---

## 4. Configurar secrets (variables de entorno del servidor)

**Con OpenAI (default, lo que queremos ahora):**

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-4o-mini         # opcional, default gpt-4o-mini
```

**Si más adelante quieres cambiar a Anthropic:**

```bash
supabase secrets set AI_PROVIDER=anthropic
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set ANTHROPIC_MODEL=claude-3-5-haiku-latest   # opcional
```

Los secrets `SUPABASE_URL` y `SUPABASE_ANON_KEY` ya los inyecta Supabase automáticamente en las Edge Functions.

Verifica que quedaron seteados:

```bash
supabase secrets list
```

---

## 5. Desplegar la función

```bash
supabase functions deploy ai-chat
```

Esto compila y sube `supabase/functions/ai-chat/index.ts` (+ `crisis.ts`, `prompt.ts`, `providers.ts`) al runtime Deno de Supabase.

---

## 6. Probar

### 6.1 Desde la app

1. Inicia sesión como un usuario con consentimientos `data_processing` y `sensitive_health_data` ya otorgados (onboarding completo).
2. En Home, toca **"Hablar con Cauce"**.
3. La primera vez aparece el gate de consentimiento `ai_advisor`. Acéptalo.
4. Envía un mensaje. Deberías ver la respuesta del modelo en ~1-3s.

### 6.2 Con `curl` (más directo para debug)

Necesitas un JWT de usuario real. Lo puedes extraer desde la app añadiendo un `console.log(session.access_token)` temporal en `useAuth`.

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/ai-chat" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"conversation_id": null, "message": "Hola, estoy ansioso."}'
```

Respuesta esperada:

```json
{
  "conversation_id": "uuid-...",
  "reply": "Te escucho. ¿Dónde lo estás sintiendo en el cuerpo ahora?",
  "flagged_for_crisis": false
}
```

### 6.3 Ver logs en tiempo real

```bash
supabase functions logs ai-chat --tail
```

---

## 7. Códigos de error del endpoint

| HTTP | `error`                     | Cuándo ocurre |
|------|-----------------------------|---------------|
| 401  | `unauthorized`              | Falta `Authorization` o JWT inválido |
| 400  | `missing_message`           | Body sin `message` o vacío |
| 400  | `message_too_long`          | `message.length > 4000` |
| 403  | `ai_consent_missing`        | Último evento de `ai_advisor` no es `grant` |
| 404  | `conversation_not_found`    | `conversation_id` enviado no pertenece al usuario |
| 500  | `conversation_create_failed` | Falla al insertar en `ai_conversations` |
| 500  | `persist_failed`            | Falla al insertar mensaje del usuario |
| 502  | `ai_provider_error`         | El LLM devolvió error (ver logs para detalle) |
| 500  | `server_error`              | Excepción no manejada (ver `detail` en la respuesta) |

El cliente (`useSendMessage`) ya extrae `ai_consent_missing` y muestra el alert adecuado.

---

## 8. Cambiar de proveedor

El archivo `supabase/functions/ai-chat/providers.ts` define la interfaz `LlmProvider`:

```ts
export interface LlmProvider {
  complete(messages: LlmMessage[]): Promise<LlmResponse>;
}
```

Ya incluye `OpenAIProvider` y `AnthropicProvider`. Para agregar otro (Gemini, Mistral, local, etc.):

1. Implementa una clase que cumpla `LlmProvider`.
2. Agrega un caso al factory `makeProvider()` leyendo de `Deno.env`.
3. `supabase functions deploy ai-chat`.
4. `supabase secrets set AI_PROVIDER=<nombre>` y los secrets del nuevo proveedor.

No hay que tocar el cliente.

---

## 9. Redeploy después de cambios

Cada vez que edites `index.ts`, `crisis.ts`, `prompt.ts` o `providers.ts`:

```bash
supabase functions deploy ai-chat
```

Los secrets se mantienen entre deploys. Sólo hay que volver a setearlos si los rotas.

---

## 10. Consideraciones de privacidad (Ley 19.628 / 21.719)

- El prompt al LLM incluye `display_name` y `diagnoses` del usuario → esto se considera **dato sensible de salud**.
- Por eso el gate `ai_advisor` es **obligatorio y separado** de los otros consentimientos.
- Texto mostrado al usuario antes de activar el asistente (ver `app/chat.tsx` → `AiConsentGate`):
  - "Tus mensajes salen del servidor de Cauce hacia un proveedor de IA (ubicado fuera de Chile)."
  - "No diagnostica ni recomienda medicamentos."
  - "Puedes revocar este consentimiento cuando quieras desde Perfil → Mis datos."
- En `my-data.tsx` el usuario puede revocar `ai_advisor` en cualquier momento. Tras revocar, el endpoint devuelve `ai_consent_missing` y el chat queda bloqueado.
- Las conversaciones se guardan en `ai_messages` con RLS (sólo el dueño las ve). El botón "Eliminar mi cuenta" en my-data borra todo vía `delete_my_account`.

---

## 11. Checklist de puesta en producción

- [ ] `supabase secrets set OPENAI_API_KEY=...` ejecutado
- [ ] `supabase functions deploy ai-chat` sin errores
- [ ] `supabase functions logs ai-chat --tail` muestra requests válidos
- [ ] Un usuario de prueba consiente `ai_advisor` y recibe respuesta
- [ ] Un usuario sin consentimiento recibe `ai_consent_missing` y ve el alert
- [ ] Al escribir un mensaje con palabras de crisis (ej: "no quiero vivir"), el banner cliente aparece antes de enviar
- [ ] Tras enviar ese mensaje, `flagged_for_crisis=true` queda registrado en `ai_messages`
- [ ] `supabase secrets list` no expone las keys en logs
