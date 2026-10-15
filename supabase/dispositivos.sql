-- =============================================================================
-- Learnground — dispositivos con los que entra cada cuenta
-- Se ejecuta DESPUÉS de esquema.sql y avisos.sql. Se puede repetir.
--
-- Cada navegador guarda una clave al azar (localStorage) y la manda al abrir la app.
-- Si una cuenta de familia aparece en un dispositivo nuevo (y ya tenía otro), la
-- función "avisos" (tipo 'dispositivo-nuevo') le avisa al equipo.
-- Ojo: en iPhone la app instalada y Safari cuentan como dos dispositivos, y borrar
-- los datos del navegador también crea uno nuevo.
-- =============================================================================

create table if not exists public.dispositivos (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfiles(id) on delete cascade,
  clave       text not null,
  descripcion text not null default '',
  primero     timestamptz not null default now(),
  ultimo      timestamptz not null default now(),
  unique (usuario_id, clave)
);

alter table public.dispositivos enable row level security;
drop policy if exists "dispositivos: ver" on public.dispositivos;
create policy "dispositivos: ver" on public.dispositivos for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.es_equipo()));
grant select on public.dispositivos to authenticated;

-- Anota este dispositivo (o actualiza su último uso). Dice si es nuevo y cuántos tiene la cuenta.
create or replace function public.registrar_dispositivo(p_clave text, p_descripcion text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_nuevo boolean; v_total int;
begin
  if auth.uid() is null or coalesce(p_clave, '') = '' then return null; end if;
  insert into public.dispositivos (usuario_id, clave, descripcion)
  values (auth.uid(), left(p_clave, 64), left(coalesce(p_descripcion, ''), 80))
  on conflict (usuario_id, clave) do update set ultimo = now(), descripcion = excluded.descripcion
  returning id, (xmax = 0) into v_id, v_nuevo;
  select count(*) into v_total from public.dispositivos where usuario_id = auth.uid();
  return jsonb_build_object('id', v_id, 'nuevo', v_nuevo, 'total', v_total);
end $$;
revoke all on function public.registrar_dispositivo(text, text) from public, anon;
grant execute on function public.registrar_dispositivo(text, text) to authenticated;
