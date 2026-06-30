-- Seguridad 1.8 (mejoras-pendientes-v2) — Cap de costo: límite MENSUAL de uso
-- del chat IA por usuario, además de la ventana de ráfaga de 15 min.
--
-- Motivo: la ventana de 15 min (20 msg) frena ráfagas, pero un usuario podría
-- mandar 20 msg cada 15 min de forma sostenida → costo OpenAI acumulado alto.
-- Este tope acota el gasto total por usuario y por mes. Cada "mensaje" del
-- usuario dispara ~3 llamadas a OpenAI (embedding RAG + completion + sugerencias),
-- así que contamos mensajes como proxy del costo.
--
-- Mismo patrón de blindaje que `check_and_increment_ai_rate_limit` (1.2):
-- función SECURITY DEFINER con auth.uid() (no acepta user_id por parámetro,
-- imposible suplantar) + tabla sin acceso directo para anon/authenticated, así
-- nadie puede resetear su propio contador vía PostgREST.
--
-- Idempotente: se puede aplicar más de una vez sin efectos.

-- 1. Tabla de uso agregado por (usuario, mes). El mes se guarda como el primer
--    día del mes en UTC (date_trunc), una fila por usuario y período.
create table if not exists public.ai_usage_monthly (
  user_id uuid not null references auth.users (id) on delete cascade,
  period date not null,
  request_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

-- 2. Función atómica de chequeo + incremento del contador mensual.
--    Clave: el incremento NO ocurre cuando ya se alcanzó el tope (WHERE en el
--    DO UPDATE), así no se acumulan escrituras inútiles ni el contador crece
--    sin límite. Devuelve null en `returning` cuando está capado → allowed=false.
create or replace function public.check_and_increment_ai_monthly_usage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  -- Tope mensual de mensajes por usuario. Ajustable: subir/bajar este número
  -- es el único cambio necesario para mover el cap de costo.
  v_max constant int := 500;
  v_period date := (date_trunc('month', timezone('utc', now())))::date;
  v_count int;
begin
  if v_user is null then
    -- Sin sesión no hay nada que contar; la edge function ya rechaza antes.
    return jsonb_build_object('allowed', false, 'used', 0, 'limit', v_max,
                              'remaining', 0);
  end if;

  -- Upsert con guarda: en conflicto, solo incrementa si aún no llegó al tope.
  -- Si la guarda falla (ya capado), el UPDATE no corre y no hay fila devuelta.
  insert into public.ai_usage_monthly as u
    (user_id, period, request_count, updated_at)
  values (v_user, v_period, 1, now())
  on conflict (user_id, period) do update set
    request_count = u.request_count + 1,
    updated_at = now()
  where u.request_count < v_max
  returning request_count into v_count;

  if v_count is null then
    -- No se devolvió fila => el conflicto existía y la guarda bloqueó el
    -- incremento (usuario ya en el tope este mes).
    return jsonb_build_object(
      'allowed', false,
      'used', v_max,
      'limit', v_max,
      'remaining', 0,
      'resets_at', (v_period + interval '1 month')::date
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'used', v_count,
    'limit', v_max,
    'remaining', greatest(0, v_max - v_count),
    'resets_at', (v_period + interval '1 month')::date
  );
end;
$$;

-- 3. Solo usuarios autenticados pueden ejecutarla (PUBLIC la recibe por
--    defecto → revocar).
revoke execute on function public.check_and_increment_ai_monthly_usage() from public, anon;
grant execute on function public.check_and_increment_ai_monthly_usage() to authenticated;

-- 4. Cerrar el acceso directo a la tabla (el chequeo de privilegios ocurre
--    ANTES que RLS → bloquea PostgREST aunque hubiera policy permisiva).
--    service_role conserva acceso (bypassa todo) para métricas/operación.
revoke all on table public.ai_usage_monthly from public, anon, authenticated;

-- 5. Defensa en profundidad: RLS activo (sin policies → nadie lee/escribe
--    directo; solo la función SECURITY DEFINER y service_role).
alter table public.ai_usage_monthly enable row level security;
