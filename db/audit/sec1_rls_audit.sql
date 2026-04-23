-- ============================================================
-- Cauce · SEC-1 · Auditoría de RLS
-- Ejecutar en Supabase Studio → SQL Editor
-- ============================================================
-- Este archivo NO modifica nada. Sólo lee catálogos de Postgres
-- para reportar el estado actual de Row Level Security en cada
-- tabla del schema `public`.
--
-- Cómo usarlo:
--   1. Abrí Supabase Studio → SQL Editor → New query
--   2. Pegá este archivo completo
--   3. Ejecutá (Ctrl+Enter)
--   4. Copiá las 3 tablas de output y mandámelas, o revisá
--      vos mismo con la leyenda que hay al final.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ¿RLS está habilitado en cada tabla?
-- ------------------------------------------------------------
-- Expected: todas las tablas con datos de usuario deben tener
-- rowsecurity = true. La tabla `exercises` (catálogo público)
-- también debería tenerla, con una policy permisiva sólo para SELECT.

select
  n.nspname  as schema,
  c.relname  as tabla,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;


-- ------------------------------------------------------------
-- 2. ¿Qué policies tiene cada tabla? (cmd, roles, USING, WITH CHECK)
-- ------------------------------------------------------------
-- Expected para la mayoría: una policy por SELECT/INSERT/UPDATE/DELETE
-- con USING o WITH CHECK que contiene `auth.uid() = user_id` (o `id`
-- para profiles).
--
-- Mirá especialmente:
--   - ai_messages: debería tener policies que refieren a ai_conversations
--     (via exists o in-subquery) porque no tiene user_id directo.
--   - exercises: idealmente sólo policy de SELECT, y ninguna permisiva
--     para INSERT/UPDATE/DELETE desde authenticated.

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual        as using_clause,
  with_check  as with_check_clause
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;


-- ------------------------------------------------------------
-- 3. Resumen: tablas SIN RLS o SIN policies
-- ------------------------------------------------------------
-- Cualquier fila en este resultado es un hallazgo. Si una tabla
-- tiene datos de usuario y no tiene RLS o no tiene policies,
-- los datos son accesibles por cualquier usuario autenticado.

with tables as (
  select
    c.relname  as tabla,
    c.relrowsecurity as rls_enabled
  from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
policy_counts as (
  select tablename as tabla, count(*) as n_policies
  from pg_policies
  where schemaname = 'public'
  group by tablename
)
select
  t.tabla,
  t.rls_enabled,
  coalesce(pc.n_policies, 0) as n_policies,
  case
    when not t.rls_enabled then '🔴 RLS desactivado'
    when coalesce(pc.n_policies, 0) = 0 then '🔴 RLS activo pero sin policies (rechaza todo)'
    else '🟢 OK'
  end as estado
from tables t
  left join policy_counts pc on pc.tabla = t.tabla
order by t.tabla;


-- ------------------------------------------------------------
-- 4. Grants directos (bypass de RLS)
-- ------------------------------------------------------------
-- Verifica que ningún rol anon/authenticated tenga permisos
-- que podrían saltar RLS. Normalmente queremos:
--   - authenticated: SELECT/INSERT/UPDATE/DELETE (con RLS aplicando)
--   - anon: ningún acceso a tablas con datos sensibles
-- Cualquier grant explícito sospechoso aparecerá aquí.

select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated', 'public')
order by table_name, grantee, privilege_type;


-- ------------------------------------------------------------
-- 5. Funciones con SECURITY DEFINER
-- ------------------------------------------------------------
-- Estas funciones corren con los privilegios del owner, saltando
-- RLS. Cada una debe validar auth.uid() al inicio. Esperado:
--   - delete_my_account (con check de auth.uid() is not null)
--   - posiblemente triggers set_updated_at_* (éstos son SECURITY
--     INVOKER por default, revisar).

select
  n.nspname as schema,
  p.proname as funcion,
  p.prosecdef as is_security_definer,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname;
