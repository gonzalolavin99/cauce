-- Seguridad 1.5 + hallazgos de la auditoría 1.4 (docs/mejoras-pendientes-v2.md)
--
-- (a) CHECK constraints server-side: hasta ahora la validación vivía solo en
--     el cliente (zod). Un atacante con su propio JWT podía escribir directo a
--     PostgREST: moods de 10 MB (DoS de storage/insights), enums inválidos.
--     Los CHECK de texto van con NOT VALID: aplican a escrituras nuevas sin
--     fallar si existiera alguna fila vieja fuera de rango.
--
-- (b) Limpieza de grants peligrosos detectados en la auditoría:
--     - exercise_embeddings: anon/authenticated tenían INSERT,UPDATE,DELETE,
--       TRUNCATE,REFERENCES,TRIGGER. ¡TRUNCATE no pasa por RLS!
--     - exercises (catálogo): anon/authenticated tenían INSERT,UPDATE,DELETE.
--     - consents: debe ser un ledger append-only → sin UPDATE/DELETE.
--
-- (c) Tope de 50 mood logs por usuario/día (anti-flood) vía trigger.
--
-- Idempotente: constraints con DROP IF EXISTS antes de crear.

-- ============================================================
-- (a) CHECK constraints
-- ============================================================

-- mood_logs: enum de mood (valores de src/features/mood/data/options.ts)
alter table public.mood_logs drop constraint if exists mood_logs_mood_check;
alter table public.mood_logs add constraint mood_logs_mood_check
  check (mood is null or mood in
    ('bien','neutral','bajo','ansioso','sobrecargado','agitado'))
  not valid;

alter table public.mood_logs drop constraint if exists mood_logs_note_len;
alter table public.mood_logs add constraint mood_logs_note_len
  check (note is null or char_length(note) <= 2000) not valid;

-- ai_messages: el server corta el input del usuario en 4000; las respuestas
-- del asistente son más largas pero acotadas. 16000 deja margen amplio y
-- bloquea el abuso de MBs.
alter table public.ai_messages drop constraint if exists ai_messages_content_len;
alter table public.ai_messages add constraint ai_messages_content_len
  check (char_length(content) <= 16000) not valid;

-- ai_conversations: el título se genera con message.slice(0, 60)
alter table public.ai_conversations drop constraint if exists ai_conversations_title_len;
alter table public.ai_conversations add constraint ai_conversations_title_len
  check (title is null or char_length(title) <= 200) not valid;

-- crisis_plans: campos de texto libres, tope generoso por campo
alter table public.crisis_plans drop constraint if exists crisis_plans_text_len;
alter table public.crisis_plans add constraint crisis_plans_text_len
  check (
    coalesce(char_length(warning_signs), 0) <= 4000 and
    coalesce(char_length(what_helps), 0) <= 4000 and
    coalesce(char_length(anchor_phrase), 0) <= 500 and
    coalesce(char_length(safe_place), 0) <= 1000 and
    coalesce(char_length(trusted_contact_name), 0) <= 200 and
    coalesce(char_length(trusted_contact_phone), 0) <= 50 and
    coalesce(char_length(trusted_contact_relation), 0) <= 200 and
    coalesce(char_length(reasons_to_stay), 0) <= 4000 and
    coalesce(char_length(avoid_list), 0) <= 4000 and
    coalesce(char_length(notes), 0) <= 4000
  ) not valid;

-- profiles
alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles add constraint profiles_display_name_len
  check (display_name is null or char_length(display_name) <= 120) not valid;

-- regulation_sessions: notes con tope
alter table public.regulation_sessions drop constraint if exists regulation_sessions_notes_len;
alter table public.regulation_sessions add constraint regulation_sessions_notes_len
  check (notes is null or char_length(notes) <= 2000) not valid;

-- ============================================================
-- (b) Limpieza de grants (defensa en profundidad; RLS ya bloqueaba
--     las filas, pero TRUNCATE no es filtrable por RLS y los grants
--     amplios son superficie innecesaria)
-- ============================================================

-- Catálogo de ejercicios: solo lectura para clientes
revoke insert, update, delete, truncate, references, trigger
  on table public.exercises from anon, authenticated;

-- Embeddings: escritura solo service role (la edge function embed-exercises)
revoke insert, update, delete, truncate, references, trigger
  on table public.exercise_embeddings from anon, authenticated;
revoke select on table public.exercise_embeddings from anon;

-- Consents: ledger append-only — nadie actualiza ni borra desde el cliente
revoke update, delete, truncate, references, trigger
  on table public.consents from anon, authenticated;

-- anon no debería escribir datos de usuario (todas las policies exigen
-- auth.uid(), pero el grant amplio es superficie innecesaria)
revoke insert, update, delete on table public.mood_logs from anon;
revoke insert, update, delete on table public.crisis_plans from anon;
revoke insert, update, delete on table public.ai_conversations from anon;
revoke insert, update, delete on table public.ai_messages from anon;
revoke insert, update, delete on table public.profiles from anon;
revoke insert, update, delete on table public.regulation_sessions from anon;
revoke insert, update, delete on table public.sensory_preferences from anon;
revoke insert, update, delete on table public.user_diagnoses from anon;
revoke insert, update, delete on table public.notification_preferences from anon;
revoke insert on table public.consents from anon;

-- ============================================================
-- (c) Tope diario de mood logs por usuario (anti-flood)
-- ============================================================

create or replace function public.enforce_mood_log_daily_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.mood_logs
  where user_id = new.user_id
    and created_at >= date_trunc('day', now());
  if v_count >= 50 then
    raise exception 'daily mood log limit reached'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists mood_logs_daily_cap on public.mood_logs;
create trigger mood_logs_daily_cap
  before insert on public.mood_logs
  for each row execute function public.enforce_mood_log_daily_cap();
