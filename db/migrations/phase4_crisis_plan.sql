-- ============================================================
-- Cauce · Fase 4 · Plan de crisis personal
-- Ejecutar en Supabase Studio → SQL Editor
-- ============================================================
-- El usuario escribe en calma su plan para momentos difíciles.
-- Un plan por usuario. Todos los campos son opcionales: la idea
-- es que cada persona llene lo que le hace sentido.
--
-- RLS: sólo el dueño puede leer, crear, editar o borrar su plan.
-- Cascade: si el usuario elimina la cuenta, el plan se borra.
-- ============================================================

create table if not exists public.crisis_plans (
  user_id uuid primary key
    references auth.users(id) on delete cascade,

  -- ¿Cómo me doy cuenta que estoy mal?
  warning_signs text,

  -- ¿Qué me ha ayudado antes? (ejercicios, acciones concretas)
  what_helps text,

  -- Frase ancla / recordatorio corto
  anchor_phrase text,

  -- Lugar donde me siento más seguro/a
  safe_place text,

  -- Contacto de confianza
  trusted_contact_name text,
  trusted_contact_phone text,
  trusted_contact_relation text,

  -- Motivos para quedarme / sostenerme (muy sensible, opcional)
  reasons_to_stay text,

  -- Cosas / situaciones a evitar cuando estoy mal
  avoid_list text,

  -- Notas libres
  notes text,

  updated_at timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================

alter table public.crisis_plans enable row level security;

drop policy if exists "crisis_plan_select_own" on public.crisis_plans;
create policy "crisis_plan_select_own" on public.crisis_plans
  for select using (auth.uid() = user_id);

drop policy if exists "crisis_plan_insert_own" on public.crisis_plans;
create policy "crisis_plan_insert_own" on public.crisis_plans
  for insert with check (auth.uid() = user_id);

drop policy if exists "crisis_plan_update_own" on public.crisis_plans;
create policy "crisis_plan_update_own" on public.crisis_plans
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crisis_plan_delete_own" on public.crisis_plans;
create policy "crisis_plan_delete_own" on public.crisis_plans
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Trigger updated_at
-- ============================================================

create or replace function public.set_updated_at_crisis_plans()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists crisis_plans_set_updated_at on public.crisis_plans;
create trigger crisis_plans_set_updated_at
  before update on public.crisis_plans
  for each row execute function public.set_updated_at_crisis_plans();

-- ============================================================
-- Actualizar delete_my_account para incluir crisis_plans
-- (la FK con on delete cascade ya lo cubre, pero explícito
--  para claridad y consistencia con los otros borrados)
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
  delete from public.consents where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account from public;
grant execute on function public.delete_my_account to authenticated;
