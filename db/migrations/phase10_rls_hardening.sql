-- ============================================================
-- Cauce · Fase 10 (SEC-1) · RLS hardening de tablas legacy
-- Ejecutar en Supabase Studio → SQL Editor
-- ============================================================
-- Contexto:
-- Las tablas `profiles`, `user_diagnoses`, `sensory_preferences`,
-- `mood_logs`, `regulation_sessions`, `ai_conversations`,
-- `ai_messages` y `exercises` no tienen migración en este repo —
-- fueron creadas en etapas tempranas directamente en el dashboard
-- de Supabase. Este script asegura que todas tengan RLS habilitado
-- y policies canónicas alineadas con el resto del schema.
--
-- Todo es idempotente (drop if exists + create). Si las policies
-- que tenías eran equivalentes, esto no cambia nada funcional;
-- si eran débiles o faltaban, esto las normaliza.
--
-- CUIDADO: este archivo asume que las tablas ya existen con la
-- estructura documentada en src/types/database.types.ts. No las
-- crea. Si alguna no existe, el ALTER/CREATE POLICY fallará con
-- mensaje claro — no se ejecuta silenciosamente.
-- ============================================================

-- ============================================================
-- 1. profiles — clave propia es `id`, no `user_id`
-- ============================================================

alter table public.profiles enable row level security;

-- Drop legacy (descubiertas en audit SEC-1)
drop policy if exists "own_profile_select" on public.profiles;
drop policy if exists "own_profile_update" on public.profiles;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);


-- ============================================================
-- 2. user_diagnoses — user_id
-- ============================================================

alter table public.user_diagnoses enable row level security;

-- Drop legacy (descubiertas en audit SEC-1)
drop policy if exists "own_diagnoses_all" on public.user_diagnoses;

drop policy if exists "user_diagnoses_select_own" on public.user_diagnoses;
create policy "user_diagnoses_select_own" on public.user_diagnoses
  for select using (auth.uid() = user_id);

drop policy if exists "user_diagnoses_insert_own" on public.user_diagnoses;
create policy "user_diagnoses_insert_own" on public.user_diagnoses
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_diagnoses_update_own" on public.user_diagnoses;
create policy "user_diagnoses_update_own" on public.user_diagnoses
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_diagnoses_delete_own" on public.user_diagnoses;
create policy "user_diagnoses_delete_own" on public.user_diagnoses
  for delete using (auth.uid() = user_id);


-- ============================================================
-- 3. sensory_preferences — user_id
-- ============================================================

alter table public.sensory_preferences enable row level security;

-- Drop legacy (descubiertas en audit SEC-1)
drop policy if exists "own_prefs_all" on public.sensory_preferences;

drop policy if exists "sensory_prefs_select_own" on public.sensory_preferences;
create policy "sensory_prefs_select_own" on public.sensory_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "sensory_prefs_insert_own" on public.sensory_preferences;
create policy "sensory_prefs_insert_own" on public.sensory_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "sensory_prefs_update_own" on public.sensory_preferences;
create policy "sensory_prefs_update_own" on public.sensory_preferences
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sensory_prefs_delete_own" on public.sensory_preferences;
create policy "sensory_prefs_delete_own" on public.sensory_preferences
  for delete using (auth.uid() = user_id);


-- ============================================================
-- 4. mood_logs — user_id
-- ============================================================

alter table public.mood_logs enable row level security;

-- Drop legacy (descubiertas en audit SEC-1)
drop policy if exists "own_moods_all" on public.mood_logs;

drop policy if exists "mood_logs_select_own" on public.mood_logs;
create policy "mood_logs_select_own" on public.mood_logs
  for select using (auth.uid() = user_id);

drop policy if exists "mood_logs_insert_own" on public.mood_logs;
create policy "mood_logs_insert_own" on public.mood_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "mood_logs_update_own" on public.mood_logs;
create policy "mood_logs_update_own" on public.mood_logs
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "mood_logs_delete_own" on public.mood_logs;
create policy "mood_logs_delete_own" on public.mood_logs
  for delete using (auth.uid() = user_id);


-- ============================================================
-- 5. regulation_sessions — user_id (nullable en el schema!)
-- ============================================================
-- Nota: user_id es nullable por decisión vieja. La policy rechaza
-- filas con user_id null para usuarios autenticados (auth.uid()
-- nunca es null para un user logueado, y null = null → null →
-- false en un WHERE). Así que rows huérfanos quedarán ocultos
-- sin borrarse. No es un exploit, pero sí deuda.

alter table public.regulation_sessions enable row level security;

-- Drop legacy (descubiertas en audit SEC-1)
drop policy if exists "own_sessions_all" on public.regulation_sessions;

drop policy if exists "reg_sessions_select_own" on public.regulation_sessions;
create policy "reg_sessions_select_own" on public.regulation_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "reg_sessions_insert_own" on public.regulation_sessions;
create policy "reg_sessions_insert_own" on public.regulation_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "reg_sessions_update_own" on public.regulation_sessions;
create policy "reg_sessions_update_own" on public.regulation_sessions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "reg_sessions_delete_own" on public.regulation_sessions;
create policy "reg_sessions_delete_own" on public.regulation_sessions
  for delete using (auth.uid() = user_id);


-- ============================================================
-- 6. ai_conversations — user_id (nullable en el schema!)
-- ============================================================

alter table public.ai_conversations enable row level security;

-- Drop legacy (descubiertas en audit SEC-1)
drop policy if exists "own_conv_all" on public.ai_conversations;

drop policy if exists "ai_conv_select_own" on public.ai_conversations;
create policy "ai_conv_select_own" on public.ai_conversations
  for select using (auth.uid() = user_id);

drop policy if exists "ai_conv_insert_own" on public.ai_conversations;
create policy "ai_conv_insert_own" on public.ai_conversations
  for insert with check (auth.uid() = user_id);

drop policy if exists "ai_conv_update_own" on public.ai_conversations;
create policy "ai_conv_update_own" on public.ai_conversations
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ai_conv_delete_own" on public.ai_conversations;
create policy "ai_conv_delete_own" on public.ai_conversations
  for delete using (auth.uid() = user_id);


-- ============================================================
-- 7. ai_messages — NO tiene user_id directo
-- ============================================================
-- La ownership se determina por la conversación. La policy usa
-- EXISTS en vez de IN por performance (EXISTS hace short-circuit
-- con un Hash Semi Join; IN puede planificar peor según tamaño).

alter table public.ai_messages enable row level security;

-- Drop legacy (descubiertas en audit SEC-1).
-- CUIDADO: `own_msg_all` era FOR ALL, habilitaba UPDATE/DELETE que el
-- diseño dice inmutable. Al dropearla, los usuarios pierden esa capacidad
-- (que nunca debieron tener desde el cliente). Correcto.
drop policy if exists "own_msg_all" on public.ai_messages;

drop policy if exists "ai_msg_select_own" on public.ai_messages;
create policy "ai_msg_select_own" on public.ai_messages
  for select using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "ai_msg_insert_own" on public.ai_messages;
create policy "ai_msg_insert_own" on public.ai_messages
  for insert with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

-- No update/delete: los mensajes son inmutables desde el punto
-- de vista del usuario. Sólo se borran vía cascade al borrar la
-- conversación o la cuenta.


-- ============================================================
-- 8. exercises — catálogo público de lectura
-- ============================================================
-- Cualquier user autenticado puede SELECT de ejercicios activos.
-- Nadie puede escribir desde el cliente — las mutaciones las hace
-- el equipo via service_role o directo en DB.

alter table public.exercises enable row level security;

-- CRÍTICO: `exercises_public_read` usaba `USING (true)` — dejaba pasar
-- TODO incluyendo ejercicios inactivos. Como las policies permissive
-- se combinan con OR, el filtro `active = true` de la otra policy
-- quedaba neutralizado. Este drop arregla el bug de gobernanza.
drop policy if exists "exercises_public_read" on public.exercises;

drop policy if exists "exercises_read_public" on public.exercises;
create policy "exercises_read_public" on public.exercises
  for select using (coalesce(active, true) = true);

-- Explícitamente: NO policies de insert/update/delete para
-- authenticated/anon. Sin policy permisiva, RLS rechaza.
-- Si hubiera alguna policy vieja permisiva, la quitamos:

drop policy if exists "exercises_insert_any"  on public.exercises;
drop policy if exists "exercises_update_any"  on public.exercises;
drop policy if exists "exercises_delete_any"  on public.exercises;
drop policy if exists "exercises_write_any"   on public.exercises;


-- ============================================================
-- 9. Defensa en profundidad · REVOKE privilegios peligrosos
-- ============================================================
-- Supabase hereda GRANT ALL a anon/authenticated por default. Los
-- DML (SELECT/INSERT/UPDATE/DELETE) son inofensivos porque RLS
-- filtra. Pero TRUNCATE, TRIGGER y REFERENCES saltan RLS (o habilitan
-- escalada) y no son necesarios desde el cliente. Los revocamos.
--
-- PostgREST no expone endpoint para TRUNCATE/TRIGGER, así que no es
-- explotable hoy vía SDK. Esto es defensa en profundidad: si mañana
-- alguien habilita pg_net o una extension que ejecute SQL raw, este
-- revoke es la última barrera.

revoke truncate, trigger, references on public.profiles               from anon, authenticated;
revoke truncate, trigger, references on public.user_diagnoses         from anon, authenticated;
revoke truncate, trigger, references on public.sensory_preferences    from anon, authenticated;
revoke truncate, trigger, references on public.mood_logs              from anon, authenticated;
revoke truncate, trigger, references on public.regulation_sessions    from anon, authenticated;
revoke truncate, trigger, references on public.ai_conversations       from anon, authenticated;
revoke truncate, trigger, references on public.ai_messages            from anon, authenticated;
revoke truncate, trigger, references on public.exercises              from anon, authenticated;
revoke truncate, trigger, references on public.crisis_plans           from anon, authenticated;
revoke truncate, trigger, references on public.consents               from anon, authenticated;
revoke truncate, trigger, references on public.notification_preferences from anon, authenticated;


-- ============================================================
-- 10. Re-verificación: listar lo que quedó
-- ============================================================
-- Este bloque sólo imprime el resultado esperable. Corrélo al
-- final para confirmar que nada quedó raro.

select
  c.relname as tabla,
  c.relrowsecurity as rls_enabled,
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname) as n_policies
from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
