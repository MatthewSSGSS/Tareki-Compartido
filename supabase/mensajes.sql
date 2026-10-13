-- =============================================================================
-- Learnground — mensajes programados del equipo y quitar una familia
-- Se ejecuta DESPUÉS de esquema.sql, accesos.sql y avisos.sql. Se puede repetir.
-- Antes de ejecutarlo, reemplaza __CRON_SECRET__ (privado/mensajes-listo.sql ya viene listo).
-- =============================================================================

-- 1) Mensajes del equipo a las familias (o al equipo) ---------------------------------------
create table if not exists public.mensajes (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null check (length(trim(titulo)) between 1 and 80),
  cuerpo     text not null default '' check (length(cuerpo) <= 500),
  url        text not null default '#/',
  destino    text not null check (destino in ('todas', 'familias', 'equipo')),
  familias   uuid[] not null default '{}',      -- si destino = 'familias'
  programado timestamptz not null default now(),
  enviado    timestamptz,                       -- null = todavía no sale
  creado_por uuid references public.perfiles(id) on delete set null,
  creado     timestamptz not null default now()
);
create index if not exists mensajes_pendientes on public.mensajes(programado) where enviado is null;
alter table public.mensajes enable row level security;

drop policy if exists "mensajes: ver" on public.mensajes;
drop policy if exists "mensajes: equipo crea" on public.mensajes;
drop policy if exists "mensajes: equipo cambia" on public.mensajes;
drop policy if exists "mensajes: equipo borra" on public.mensajes;
-- La familia ve los ya enviados que le tocan; el equipo ve todos
create policy "mensajes: ver" on public.mensajes for select to authenticated using (
  (select public.es_equipo())
  or (enviado is not null and (destino = 'todas' or (destino = 'familias' and (select auth.uid()) = any(familias))))
);
create policy "mensajes: equipo crea" on public.mensajes for insert to authenticated
  with check ((select public.es_equipo()) and creado_por = (select auth.uid()) and enviado is null);
create policy "mensajes: equipo cambia" on public.mensajes for update to authenticated
  using ((select public.es_equipo()) and enviado is null) with check ((select public.es_equipo()) and enviado is null);
create policy "mensajes: equipo borra" on public.mensajes for delete to authenticated
  using ((select public.es_equipo()));
revoke all on public.mensajes from anon, authenticated;
grant select on public.mensajes to authenticated;
grant insert (titulo, cuerpo, url, destino, familias, programado, creado_por) on public.mensajes to authenticated;
grant update (titulo, cuerpo, url, destino, familias, programado) on public.mensajes to authenticated;
grant delete on public.mensajes to authenticated;
grant all on public.mensajes to service_role;

-- 2) Quitar una familia por completo (solo el dueño) --------------------------------------------
-- Borra su cuenta y, en cascada, sus niños, lecciones, progreso, actividad, historial y avisos.
-- Los archivos de sus lecciones los borra la app antes de llamar esta función.
create or replace function public.quitar_familia(p_familia uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_dueno() then raise exception 'Solo el dueño puede quitar una familia.'; end if;
  if not exists (select 1 from public.perfiles where id = p_familia and rol = 'familia') then raise exception 'Esa familia no existe.'; end if;
  delete from auth.users where id = p_familia;
end $$;
revoke all on function public.quitar_familia(uuid) from public, anon;
grant execute on function public.quitar_familia(uuid) to authenticated;

-- 3) Tarea programada: cada 10 minutos sale lo que ya toca ----------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname = 'tareki-mensajes';
select cron.schedule('tareki-mensajes', '*/10 * * * *', $$
  select net.http_post(
    url     := 'https://qnvovuqubmgbkwycjzrr.supabase.co/functions/v1/avisos',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "__CRON_SECRET__"}'::jsonb,
    body    := '{"tipo": "programados"}'::jsonb
  );
$$);
