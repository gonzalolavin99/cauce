-- ============================================================
-- Cauce · Fase 6 · Preferencias de notificaciones
-- Ejecutar en Supabase Studio → SQL Editor
-- ============================================================
-- Guardamos en el servidor las preferencias de recordatorios del
-- usuario (no los scheduled IDs nativos, esos viven en el device).
-- Así se respetan sus elecciones aunque reinstale la app o cambie
-- de teléfono.
--
-- Todas las notificaciones están OFF por defecto. Importante para
-- TEA/TDAH/ansiedad: no queremos nunca disparar algo que la persona
-- no eligió conscientemente.
-- ============================================================

create table if not exists public.notification_preferences (
  user_id uuid primary key
    references auth.users(id) on delete cascade,

  -- Check-in diario de estado de ánimo
  daily_checkin_enabled boolean not null default false,
  -- Hora local (0-23). Presets sugeridos en la UI: 8, 12, 18, 20, 22.
  daily_checkin_hour smallint not null default 20
    check (daily_checkin_hour >= 0 and daily_checkin_hour <= 23),
  daily_checkin_minute smallint not null default 0
    check (daily_checkin_minute >= 0 and daily_checkin_minute <= 59),

  -- Empujón si hace varios días sin ejercicios de regulación
  exercise_reminder_enabled boolean not null default false,
  -- Cuántos días de inactividad antes de sugerir (1-14)
  exercise_reminder_days smallint not null default 3
    check (exercise_reminder_days >= 1 and exercise_reminder_days <= 14),

  -- Check-in 24h después de detección de crisis en el chat
  post_crisis_checkin_enabled boolean not null default false,

  updated_at timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================

alter table public.notification_preferences enable row level security;

drop policy if exists "notif_prefs_select_own" on public.notification_preferences;
create policy "notif_prefs_select_own" on public.notification_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "notif_prefs_insert_own" on public.notification_preferences;
create policy "notif_prefs_insert_own" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "notif_prefs_update_own" on public.notification_preferences;
create policy "notif_prefs_update_own" on public.notification_preferences
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notif_prefs_delete_own" on public.notification_preferences;
create policy "notif_prefs_delete_own" on public.notification_preferences
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Trigger updated_at
-- ============================================================

create or replace function public.set_updated_at_notification_preferences()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notif_prefs_set_updated_at on public.notification_preferences;
create trigger notif_prefs_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at_notification_preferences();

-- ============================================================
-- Actualizar delete_my_account para incluir notification_preferences
-- (la FK con on delete cascade ya lo cubre, pero mantenemos explícito
--  por consistencia con otros borrados)
-- ============================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  delete from public.ai_messages
    where conversation_id in (
      select id from public.ai_conversations where user_id = uid
    );
  delete from public.ai_conversations where user_id = uid;
  delete from public.mood_logs where user_id = uid;
  delete from public.regulation_sessions where user_id = uid;
  delete from public.sensory_preferences where user_id = uid;
  delete from public.user_diagnoses where user_id = uid;
  delete from public.crisis_plans where user_id = uid;
  delete from public.notification_preferences where user_id = uid;
  delete from public.consents where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account from public;
grant execute on function public.delete_my_account to authenticated;
