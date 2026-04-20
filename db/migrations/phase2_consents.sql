-- ============================================================
-- Cauce · Fase 2 · Consentimientos (Ley 19.628 + 21.719)
-- Ejecutar en Supabase Studio → SQL Editor
-- ============================================================
-- Registra un log inmutable de eventos de consentimiento.
-- Cada evento es un grant o revoke. El estado actual de un
-- consent_type se deriva del evento más reciente.
-- ============================================================

-- Tabla de eventos de consentimiento (audit log)
create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  consent_type text not null check (consent_type in (
    'data_processing',        -- tratamiento de datos personales (base)
    'sensitive_health_data',  -- datos sensibles: diagnósticos, mood, sesiones
    'ai_advisor',             -- envío de datos a proveedor de IA
    'anonymous_analytics'     -- analíticas anónimas
  )),
  policy_version text not null,
  action text not null check (action in ('grant', 'revoke')),
  created_at timestamptz default now() not null,
  device_info jsonb
);

create index if not exists consents_user_id_idx
  on public.consents(user_id);
create index if not exists consents_lookup_idx
  on public.consents(user_id, consent_type, created_at desc);

alter table public.consents enable row level security;

-- Un usuario solo puede ver sus consentimientos
drop policy if exists "own consents select" on public.consents;
create policy "own consents select" on public.consents
  for select using (auth.uid() = user_id);

-- Un usuario solo puede insertar sus consentimientos
drop policy if exists "own consents insert" on public.consents;
create policy "own consents insert" on public.consents
  for insert with check (auth.uid() = user_id);

-- Sin update / sin delete: inmutable por diseño.
-- El borrado solo ocurre via cascade cuando se elimina la cuenta.

-- ============================================================
-- Actualizar delete_my_account para incluir consents
-- (la FK con on delete cascade ya lo cubre, pero explícito
--  para claridad de auditoría)
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
  delete from public.consents where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account from public;
grant execute on function public.delete_my_account to authenticated;
