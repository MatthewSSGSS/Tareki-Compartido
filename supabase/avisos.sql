-- =============================================================================
-- Tareki — notificaciones push (se ejecuta DESPUÉS de esquema.sql)
-- Se pega completo en: Supabase → SQL Editor → New query → Run.
-- Se puede ejecutar varias veces sin dañar nada.
--
-- Antes de ejecutarlo, reemplaza __CRON_SECRET__ por el mismo valor del secreto
-- CRON_SECRET de la función "avisos" (privado/avisos-listo.sql ya viene listo).
--
-- Qué avisos hay:
--   • Lección nueva: la pide el equipo al asignarla (función "avisos").
--   • Todos los días a las 6:00 p. m. (hora de Colombia): racha en peligro o
--     lecciones nuevas sin abrir, a las familias de niños que no han estudiado hoy.
--   • El acceso vence en 3 días, mañana u hoy (necesita accesos.sql).
-- Orden para instalar desde cero: esquema.sql → accesos.sql → avisos.sql
-- =============================================================================

-- 1) Dispositivos de cada cuenta (celular, tablet o computador) -------------------------
create table if not exists public.suscripciones (
  endpoint    text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  dispositivo text not null default '',
  creado      timestamptz not null default now()
);
create index if not exists suscripciones_user on public.suscripciones(user_id);
alter table public.suscripciones enable row level security;
drop policy if exists "suscripciones: ver las mías" on public.suscripciones;
create policy "suscripciones: ver las mías" on public.suscripciones for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.suscripciones from anon, authenticated;
grant select on public.suscripciones to authenticated;
grant all on public.suscripciones to service_role;

-- Registrar este dispositivo (si era de otra cuenta, pasa a esta) y quitarlo
create or replace function public.registrar_push(p_endpoint text, p_p256dh text, p_auth text, p_dispositivo text)
returns void language sql security definer set search_path = public as $$
  insert into public.suscripciones (endpoint, user_id, p256dh, auth, dispositivo)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, left(coalesce(p_dispositivo, ''), 80))
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, dispositivo = excluded.dispositivo, creado = now();
$$;
create or replace function public.quitar_push(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.suscripciones where endpoint = p_endpoint and user_id = auth.uid();
$$;
revoke all on function public.registrar_push(text, text, text, text), public.quitar_push(text) from public, anon;
grant execute on function public.registrar_push(text, text, text, text), public.quitar_push(text) to authenticated;

-- 2) Avisos ya enviados (para no repetir). Solo la usa el servidor. --------------------------
create table if not exists public.avisos_enviados (
  user_id uuid not null references auth.users(id) on delete cascade,
  clave   text not null,
  enviado timestamptz not null default now(),
  primary key (user_id, clave)
);
alter table public.avisos_enviados enable row level security;
grant all on public.avisos_enviados to service_role;

-- 3) Avisos del día: un mensaje por niño que todavía no estudia hoy ----------------------------
create or replace function public.avisos_diarios(p_dia date)
returns table (user_id uuid, titulo text, cuerpo text, url text, clave text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  n record;
  f record;
  d date;
  racha int;
  nuevas int;
begin
  -- El acceso vence pronto (3 días antes, 1 día antes y el último día)
  for f in
    select p.id, p.acceso_hasta, (p.acceso_hasta - p_dia) as faltan,
      (select string_agg(ni.nombre, ', ' order by ni.nombre) from public.ninos ni where ni.familia_id = p.id) as hijos
    from public.perfiles p
    where p.rol = 'familia' and not p.suspendido and (p.acceso_hasta - p_dia) in (3, 1, 0)
      and exists (select 1 from public.suscripciones s where s.user_id = p.id)
  loop
    return query select f.id,
      case f.faltan when 0 then '⏰ Hoy es el último día de acceso a Tareki' when 1 then '⏰ Tu acceso a Tareki vence mañana' else '⏰ Tu acceso a Tareki vence en 3 días' end,
      case when f.hijos is null then 'Paga la mensualidad para seguir aprendiendo sin pausas. Toca para ver cómo pagar.'
           else format('Paga la mensualidad para que %s no se pierda%s ni un día de Tareki. Toca para ver cómo pagar.', f.hijos, case when f.hijos like '%%,%%' then 'n' else '' end) end,
      '#/papas', format('vence:%s:%s:%s', f.id, f.acceso_hasta, f.faltan);
  end loop;

  -- Racha y lecciones nuevas (solo familias con acceso vigente)
  for n in
    select ni.id, ni.nombre, ni.familia_id from public.ninos ni
    join public.perfiles pf on pf.id = ni.familia_id and not pf.suspendido and pf.acceso_hasta >= p_dia
    where exists (select 1 from public.suscripciones s where s.user_id = ni.familia_id)
      and not exists (select 1 from public.actividad a where a.nino_id = ni.id and a.dia = p_dia and (a.minutos >= 5 or a.logros > 0))
  loop
    racha := 0; d := p_dia - 1;
    while exists (select 1 from public.actividad a where a.nino_id = n.id and a.dia = d and (a.minutos >= 5 or a.logros > 0)) loop
      racha := racha + 1; d := d - 1;
    end loop;
    select count(*) into nuevas from public.lecciones l
      where l.nino_id = n.id and not exists (select 1 from public.estados e where e.leccion_id = l.id and e.abierta is not null);

    if racha > 0 then
      return query select n.familia_id,
        format('🔥 ¡%s, tu racha de %s %s está en peligro!', n.nombre, racha, case when racha = 1 then 'día' else 'días' end),
        'Juega un ratico hoy para no perderla. ¡Lulo te espera! 🦉', '#/inicio', format('racha:%s:%s', n.id, p_dia);
    elsif nuevas > 0 then
      return query select n.familia_id,
        format('🎁 ¡%s, tienes %s esperándote!', n.nombre, case when nuevas = 1 then 'una lección nueva' else nuevas || ' lecciones nuevas' end),
        'Ábrela hoy y empieza una racha 🔥', '#/inicio', format('nuevas:%s:%s', n.id, p_dia);
    end if;
  end loop;
end $$;
revoke all on function public.avisos_diarios(date) from public, anon, authenticated;
grant execute on function public.avisos_diarios(date) to service_role;

-- 4) Tarea programada: todos los días a las 6:00 p. m. de Colombia (23:00 UTC) ----------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname in ('tareki-avisos-diarios', 'tareki-limpieza');

select cron.schedule('tareki-avisos-diarios', '0 23 * * *', $$
  select net.http_post(
    url     := 'https://qnvovuqubmgbkwycjzrr.supabase.co/functions/v1/avisos',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "__CRON_SECRET__"}'::jsonb,
    body    := '{"tipo": "diario"}'::jsonb
  );
$$);

select cron.schedule('tareki-limpieza', '0 9 * * *', $$
  delete from public.avisos_enviados where enviado < now() - interval '30 days';
$$);
