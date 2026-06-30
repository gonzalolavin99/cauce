# 🔒 Auditoría RLS + grants — Cauce (cauce-dev)

> Mejora 1.4 de `mejoras-pendientes-v2.md`. Esquema extraído de producción el
> 2026-06-11 vía Management API (`scripts/dump-schema-api.mjs`, sin Docker).
> Snapshot crudo: no se commitea (contiene metadata del proyecto); regenerable.

## Resumen

- **13 tablas en `public`, todas con RLS habilitado** ✅
- Las políticas de fila estaban **correctas** (aislamiento por `auth.uid()`); no
  se encontró ninguna tabla con RLS apagado ni policy permisiva (`using(true)`)
  sobre datos de usuario.
- El problema real eran **grants de tabla demasiado amplios** a `anon`/
  `authenticated` (escritura sobre catálogo, `TRUNCATE` sobre embeddings, etc.).
  Corregidos en la migración `20260611121000_server_side_validation.sql`.
- Faltaban **CHECK constraints** de longitud/enum server-side. Agregados en la
  misma migración.

## Políticas RLS por tabla (estado verificado)

Todas las tablas de datos de usuario siguen el patrón dueño-único:
`SELECT/UPDATE/DELETE` con `qual = auth.uid() = user_id` y `INSERT` con
`with_check = auth.uid() = user_id`.

| Tabla | RLS | Patrón |
|---|---|---|
| `mood_logs` | ✅ | dueño (SELECT/INSERT/UPDATE/DELETE) |
| `crisis_plans` | ✅ | dueño |
| `ai_conversations` | ✅ | dueño |
| `ai_messages` | ✅ | dueño vía `EXISTS` sobre la conversación (no expone msgs ajenos) |
| `consents` | ✅ | dueño; **append-only** (solo SELECT/INSERT tras la migración) |
| `user_diagnoses` | ✅ | dueño |
| `sensory_preferences` | ✅ | dueño |
| `regulation_sessions` | ✅ | dueño |
| `notification_preferences` | ✅ | dueño |
| `profiles` | ✅ | dueño (`auth.uid() = id`) |
| `ai_chat_rate_limits` | ✅ | **cerrado al cliente** (solo RPC SECURITY DEFINER, migración 1.2) |
| `exercise_embeddings` | ✅ | SELECT solo `authenticated`; escritura solo service role |
| `exercises` | ✅ | catálogo: SELECT público (`active = true`), sin escritura cliente |

## Hallazgos corregidos (migración 20260611121000)

1. **`exercise_embeddings`**: `anon` y `authenticated` tenían
   `INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER`. `TRUNCATE` **no pasa por
   RLS** → un usuario podía vaciar la tabla del RAG. Ahora: `authenticated`
   solo `SELECT`; `anon` sin acceso.
2. **`exercises`** (catálogo clínico): `anon`/`authenticated` con
   `INSERT,UPDATE,DELETE`. Ahora: solo `SELECT`.
3. **`consents`** (ledger legal, Ley 19.628): tenía `UPDATE,DELETE`. Un consent
   no se edita ni borra: se registra un nuevo evento `grant`/`revoke`. Ahora:
   solo `SELECT,INSERT`.
4. **`anon`** tenía escritura sobre todas las tablas de usuario. Revocado
   (las policies ya lo bloqueaban por fila, pero es superficie innecesaria).
5. **CHECK constraints nuevos**: enum de `mood`, y límites de longitud en
   `note`, `ai_messages.content` (16k), `ai_conversations.title`, todos los
   campos de `crisis_plans`, `profiles.display_name`, `regulation_sessions.notes`.
   (Ya existían buenos CHECKs de enum/rango en la mayoría de columnas — ver
   abajo.)
6. **Tope diario**: trigger `enforce_mood_log_daily_cap` (máx 50 mood logs/día
   por usuario) contra flood.

## CHECK constraints que YA existían (buena base previa)

`ai_messages.role`, `consents.action`/`consent_type`, `exercises.*` (category,
duration, evidence_level, mobility), `mood_logs.energy` (1-5),
`notification_preferences.*` (horas/minutos/días), `profiles.birth_year`/
`onboarding_level`, `regulation_sessions.*` (feeling_before, intensidades,
was_helpful), `sensory_preferences.*` (mobility, time_available),
`user_diagnoses.diagnosis`.

## Pendiente (no bloqueante)

- Codificar el **esquema completo como migración baseline** en el repo
  (`supabase migration repair` ya registró las 4 migraciones existentes en el
  historial remoto). Falta el dump del DDL inicial de las 13 tablas; hoy el
  esquema base vive solo en el proyecto. Requiere Docker o `pg_dump` directo.
- Validar los CHECK marcados `NOT VALID` contra los datos existentes
  (`VALIDATE CONSTRAINT`) una vez confirmado que no hay filas fuera de rango.

---

**Auditoría**: 2026-06-11.
