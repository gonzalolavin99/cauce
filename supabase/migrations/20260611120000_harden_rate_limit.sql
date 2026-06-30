-- Seguridad 1.2 (mejoras-pendientes-v2) — Blindar el rate limit del chat IA.
--
-- Problema: `ai_chat_rate_limits` se leía/escribía desde la edge function con
-- el JWT del usuario (rol authenticated). Con ese mismo JWT, el usuario podía
-- llamar a PostgREST directo y resetear su propia ventana (UPDATE/UPSERT de su
-- fila), anulando el límite de 20 msg/15min → costo LLM ilimitado.
--
-- Solución: toda la lógica pasa a una función SECURITY DEFINER que usa
-- auth.uid() (no acepta user_id por parámetro → no se puede suplantar a otro)
-- y se revoca el acceso directo a la tabla para anon/authenticated. La edge
-- function ahora llama al RPC.
--
-- Idempotente: se puede aplicar más de una vez sin efectos.

-- 1. Función atómica de chequeo+incremento (un solo upsert, sin carrera TOCTOU
--    como la versión anterior select→upsert de la edge function).
create or replace function public.check_and_increment_ai_rate_limit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_window constant interval := interval '15 minutes';
  v_max constant int := 20;
  v_row public.ai_chat_rate_limits%rowtype;
  v_retry int;
begin
  if v_user is null then
    -- Sin sesión no hay nada que contar; la edge function ya rechaza antes.
    return jsonb_build_object('allowed', false, 'retry_after', 0);
  end if;

  insert into public.ai_chat_rate_limits as rl
    (user_id, window_start, request_count, updated_at)
  values (v_user, v_now, 1, v_now)
  on conflict (user_id) do update set
    request_count = case
      when rl.window_start <= v_now - v_window then 1
      else rl.request_count + 1
    end,
    window_start = case
      when rl.window_start <= v_now - v_window then v_now
      else rl.window_start
    end,
    updated_at = v_now
  returning * into v_row;

  if v_row.request_count > v_max then
    v_retry := greatest(
      1,
      ceil(extract(epoch from (v_row.window_start + v_window - v_now)))::int
    );
    return jsonb_build_object('allowed', false, 'retry_after', v_retry);
  end if;

  return jsonb_build_object('allowed', true, 'retry_after', 0);
end;
$$;

-- 2. Solo usuarios autenticados pueden ejecutarla (PUBLIC la recibe por
--    defecto al crear funciones → revocar).
revoke execute on function public.check_and_increment_ai_rate_limit() from public, anon;
grant execute on function public.check_and_increment_ai_rate_limit() to authenticated;

-- 3. Cerrar el acceso directo a la tabla. El chequeo de privilegios ocurre
--    ANTES que RLS, así que esto bloquea PostgREST aunque exista alguna
--    policy permisiva vieja. service_role conserva acceso (bypassa todo).
revoke all on table public.ai_chat_rate_limits from public, anon, authenticated;

-- 4. Defensa en profundidad: RLS activo (si ya lo estaba, no-op).
alter table public.ai_chat_rate_limits enable row level security;
