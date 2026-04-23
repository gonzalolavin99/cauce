-- ============================================================
-- Cauce · Fase 11 (SEC-2) · Rate limiting para ai-chat
-- Ejecutar en Supabase Studio → SQL Editor
-- ============================================================
-- Contexto:
-- La edge function `ai-chat` procesa mensajes contra OpenAI
-- (dinero real) y hace 5+ queries a Postgres por invocación.
-- Sin rate limit, un usuario con JWT válido puede disparar
-- N llamadas por segundo y agotar el budget.
--
-- Estrategia: tabla sliding-window por user_id.
-- Ventana: 15 minutos. Cap: 20 mensajes por ventana.
-- Ajustables en la function, no acá.
--
-- El conteo se mantiene en la misma function que lo consulta,
-- con RLS filtrando por auth.uid() = user_id. El usuario NO
-- puede modificar su propio conteo desde el cliente porque la
-- policy de UPDATE require auth.uid() = user_id, pero la function
-- corre CON ese JWT, así que puede. Un ataque desde el cliente
-- directo a esta tabla también estaría sujeto a RLS — si un user
-- quisiera "resetear" su conteo haciendo DELETE/UPDATE desde el
-- cliente, NO LO BLOQUEAMOS. Esto es una limitación consciente:
--
-- TODO futuro: hacer esta tabla read-only para authenticated y
-- que solo service_role la modifique (requiere cambiar la edge
-- function a usar service_role para este update puntual).
-- Por ahora, confiamos en que la gran mayoría de usuarios no va
-- a buscar la tabla en la SDK. Si se vuelve problema, endurecemos.
-- ============================================================

create table if not exists public.ai_chat_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  request_count int not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.ai_chat_rate_limits is
  'Sliding-window rate limit para la edge function ai-chat. Una fila por usuario.';

alter table public.ai_chat_rate_limits enable row level security;

-- Drop defensivo por si se re-ejecuta la migración
drop policy if exists "rate_limit_select_own" on public.ai_chat_rate_limits;
drop policy if exists "rate_limit_insert_own" on public.ai_chat_rate_limits;
drop policy if exists "rate_limit_update_own" on public.ai_chat_rate_limits;

create policy "rate_limit_select_own" on public.ai_chat_rate_limits
  for select using (auth.uid() = user_id);

create policy "rate_limit_insert_own" on public.ai_chat_rate_limits
  for insert with check (auth.uid() = user_id);

create policy "rate_limit_update_own" on public.ai_chat_rate_limits
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sin policy de DELETE: el registro queda y se "resetea" vía update
-- cuando la ventana expira. Si el usuario se elimina vía
-- `delete_my_account`, cascade lo borra por la FK.

-- Revocar privilegios peligrosos (consistente con phase10)
revoke truncate, trigger, references on public.ai_chat_rate_limits from anon, authenticated;

-- ============================================================
-- Verificación
-- ============================================================

select
  c.relname as tabla,
  c.relrowsecurity as rls_enabled,
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname) as n_policies
from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname = 'ai_chat_rate_limits';

-- Expected:
-- tabla                  | rls_enabled | n_policies
-- ai_chat_rate_limits    | true        | 3
