-- Migración: índices de rendimiento (Roadmap sección 2.1)
--
-- Objetivo: acelerar las queries más frecuentes de la app, que filtran por
-- usuario y ordenan por fecha. Sin estos índices, Postgres hace un seq scan +
-- sort en cada consulta de historial, lo que escala mal a medida que crecen
-- las filas por usuario.
--
-- Todos usan IF NOT EXISTS para ser idempotentes y poder re-ejecutarse.

-- 2.1.1 — mood_logs: historial de ánimo del usuario, más recientes primero.
-- Cubre useMoodLogs (lista) y los cálculos de insights por rango de fechas.
CREATE INDEX IF NOT EXISTS mood_logs_user_recent
  ON mood_logs (user_id, created_at DESC);

-- 2.1.2 — ai_messages: carga del historial de una conversación en orden.
CREATE INDEX IF NOT EXISTS ai_messages_conversation
  ON ai_messages (conversation_id, created_at ASC);

-- 2.1.3 — consents: verificación del consentimiento vigente por tipo.
-- Permite resolver "el consentimiento más reciente de este tipo" sin sort.
CREATE INDEX IF NOT EXISTS consents_latest
  ON consents (user_id, consent_type, created_at DESC);

-- Extra — regulation_sessions: usado por insights y por el nudge de
-- inactividad (última sesión del usuario). Mismo patrón user_id + fecha.
CREATE INDEX IF NOT EXISTS regulation_sessions_user_recent
  ON regulation_sessions (user_id, created_at DESC);

-- Extra — ai_conversations: listado de conversaciones del usuario.
CREATE INDEX IF NOT EXISTS ai_conversations_user_recent
  ON ai_conversations (user_id, created_at DESC);
