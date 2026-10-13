-- =============================================================================
-- Learnground — celular (WhatsApp) de cada familia
-- Se ejecuta DESPUÉS de esquema.sql y accesos.sql. Se puede repetir.
-- =============================================================================

alter table public.perfiles add column if not exists celular text not null default '';

-- La familia puede cambiar su nombre y su celular (nada más de su perfil)
grant update (nombre, celular) on public.perfiles to authenticated;

-- Cambiar el celular: la propia familia o alguien del equipo
create or replace function public.cambiar_celular(p_familia uuid, p_celular text)
returns text language plpgsql security definer set search_path = public as $$
declare limpio text := left(regexp_replace(coalesce(p_celular, ''), '\D', '', 'g'), 15);
begin
  if not (p_familia = auth.uid() or public.es_equipo()) then raise exception 'Solo el equipo o la misma familia pueden cambiarlo.'; end if;
  if length(limpio) = 10 and left(limpio, 1) = '3' then limpio := '57' || limpio; end if; -- celular colombiano sin indicativo
  update public.perfiles set celular = limpio where id = p_familia and rol = 'familia';
  return limpio;
end $$;
revoke all on function public.cambiar_celular(uuid, text) from public, anon;
grant execute on function public.cambiar_celular(uuid, text) to authenticated;

-- El resumen de familias ahora incluye el celular
drop function if exists public.familias_resumen();
create function public.familias_resumen()
returns table (id uuid, nombre text, correo text, celular text, creado timestamptz, acceso_hasta date, suspendido boolean,
               ultimo_ingreso timestamptz, ultimo_estudio date, minutos_7 int, ninos int, lecciones int)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.es_equipo() then raise exception 'Solo el equipo puede ver esto.'; end if;
  return query
    select p.id, p.nombre, p.correo, p.celular, p.creado, p.acceso_hasta, p.suspendido, p.ultimo_ingreso,
      (select max(a.dia) from public.actividad a join public.ninos n on n.id = a.nino_id where n.familia_id = p.id and (a.minutos > 0 or a.logros > 0)),
      coalesce((select sum(a.minutos)::int from public.actividad a join public.ninos n on n.id = a.nino_id where n.familia_id = p.id and a.dia > public.hoy_co() - 7), 0),
      (select count(*)::int from public.ninos n where n.familia_id = p.id),
      (select count(*)::int from public.lecciones l join public.ninos n on n.id = l.nino_id where n.familia_id = p.id)
    from public.perfiles p where p.rol = 'familia' order by p.nombre;
end $$;
revoke all on function public.familias_resumen() from public, anon;
grant execute on function public.familias_resumen() to authenticated;
