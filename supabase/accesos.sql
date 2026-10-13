-- =============================================================================
-- Learnground — acceso por mensualidad, pagos manuales y actividad de familias
-- Se ejecuta DESPUÉS de esquema.sql. Se puede ejecutar varias veces.
-- (Para instalar desde cero: esquema.sql → accesos.sql → avisos.sql)
--
-- Cómo funciona:
--   • Cada familia tiene "acceso_hasta" (último día con acceso, hora de Colombia).
--   • Si venció o está suspendida, la base de datos NO le entrega lecciones, progreso
--     ni actividad (aunque toque la app). Sus datos quedan guardados.
--   • El equipo registra pagos (manuales: llave Bre-B, Nequi, efectivo…) y eso
--     extiende el acceso. Todo queda en historial_acceso con quién lo hizo.
--   • Nada se cobra automáticamente.
-- =============================================================================

-- 1) Columnas nuevas ------------------------------------------------------------------------
alter table public.perfiles add column if not exists acceso_hasta date;
alter table public.perfiles add column if not exists suspendido boolean not null default false;
alter table public.perfiles add column if not exists ultimo_ingreso timestamptz;
alter table public.invitaciones add column if not exists dias_acceso int not null default 30;
alter table public.invitaciones drop constraint if exists invitaciones_dias_acceso_check;
alter table public.invitaciones add constraint invitaciones_dias_acceso_check check (dias_acceso between 1 and 400);
grant insert (codigo, rol, nota, creada_por, expira, dias_acceso) on public.invitaciones to authenticated;

create or replace function public.hoy_co() returns date
language sql stable as $$ select (now() at time zone 'America/Bogota')::date $$;

-- Familias que ya existían: 30 días desde hoy, para no bloquear a nadie de golpe
update public.perfiles set acceso_hasta = public.hoy_co() + 30 where rol = 'familia' and acceso_hasta is null;

-- 2) ¿La cuenta actual tiene acceso? (el equipo siempre) -----------------------------------------
create or replace function public.acceso_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid()
      and (rol = 'equipo' or (not suspendido and acceso_hasta is not null and acceso_hasta >= public.hoy_co()))
  );
$$;

-- Los permisos de la familia sobre sus niños ahora exigen acceso vigente.
-- Con esto quedan bloqueadas lecciones, archivos, progreso, actividad y racha.
create or replace function public.es_mi_nino(p_nino uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ninos where id = p_nino and familia_id = auth.uid()) and public.acceso_ok();
$$;
create or replace function public.es_mi_nino_txt(p_nino text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ninos where id::text = p_nino and familia_id = auth.uid()) and public.acceso_ok();
$$;

drop policy if exists "ninos: crear" on public.ninos;
create policy "ninos: crear" on public.ninos for insert to authenticated
  with check (familia_id = (select auth.uid()) and not (select public.es_equipo()) and (select public.acceso_ok()));

-- 3) Historial: pagos, suspensiones, reactivaciones y cambios de fecha -----------------------------
create table if not exists public.historial_acceso (
  id         bigint generated always as identity primary key,
  familia_id uuid not null references public.perfiles(id) on delete cascade,
  accion     text not null check (accion in ('registro', 'pago', 'suspender', 'reactivar', 'fecha')),
  meses      int,
  monto      int,
  metodo     text,
  nota       text not null default '',
  hasta      date,
  por        uuid references public.perfiles(id) on delete set null,
  creado     timestamptz not null default now()
);
create index if not exists historial_acceso_familia on public.historial_acceso(familia_id, creado desc);
alter table public.historial_acceso enable row level security;
drop policy if exists "historial: ver" on public.historial_acceso;
create policy "historial: ver" on public.historial_acceso for select to authenticated
  using (familia_id = (select auth.uid()) or (select public.es_equipo()));
revoke all on public.historial_acceso from anon, authenticated;
grant select on public.historial_acceso to authenticated;
grant all on public.historial_acceso to service_role;

-- 4) Datos para cobrar (los ve cualquier cuenta; solo el dueño los cambia) --------------------------
create table if not exists public.ajustes_cobro (
  id       int primary key default 1 check (id = 1),
  precio   int not null default 0,
  llave    text not null default '',
  banco    text not null default 'Davivienda',
  titular  text not null default '',
  whatsapp text not null default '',
  nota     text not null default ''
);
insert into public.ajustes_cobro (id) values (1) on conflict (id) do nothing;
alter table public.ajustes_cobro enable row level security;
drop policy if exists "cobro: ver" on public.ajustes_cobro;
drop policy if exists "cobro: dueño cambia" on public.ajustes_cobro;
create policy "cobro: ver" on public.ajustes_cobro for select to authenticated using (true);
create policy "cobro: dueño cambia" on public.ajustes_cobro for update to authenticated
  using ((select public.es_dueno())) with check ((select public.es_dueno()));
revoke all on public.ajustes_cobro from anon, authenticated;
grant select on public.ajustes_cobro to authenticated;
grant update (precio, llave, banco, titular, whatsapp, nota) on public.ajustes_cobro to authenticated;

-- 5) Acciones del equipo ---------------------------------------------------------------------------
-- Registrar un pago: si el acceso sigue vigente, se suma desde su fecha; si ya venció, desde hoy.
create or replace function public.registrar_pago(p_familia uuid, p_meses int, p_monto int, p_metodo text, p_nota text)
returns date language plpgsql security definer set search_path = public as $$
declare
  actual date;
  base date;
  nuevo date;
begin
  if not public.es_equipo() then raise exception 'Solo el equipo puede registrar pagos.'; end if;
  if p_meses not between 1 and 24 then raise exception 'Los meses deben ser entre 1 y 24.'; end if;
  select acceso_hasta into actual from public.perfiles where id = p_familia and rol = 'familia';
  if not found then raise exception 'Esa familia no existe.'; end if;
  base := case when actual is not null and actual >= public.hoy_co() then actual else public.hoy_co() - 1 end;
  nuevo := (base + make_interval(months => p_meses))::date;
  update public.perfiles set acceso_hasta = nuevo, suspendido = false where id = p_familia;
  insert into public.historial_acceso (familia_id, accion, meses, monto, metodo, nota, hasta, por)
  values (p_familia, 'pago', p_meses, greatest(coalesce(p_monto, 0), 0), left(coalesce(p_metodo, ''), 40), left(coalesce(p_nota, ''), 200), nuevo, auth.uid());
  return nuevo;
end $$;

-- Suspender, reactivar o poner una fecha a mano
create or replace function public.cambiar_acceso(p_familia uuid, p_accion text, p_hasta date, p_nota text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_equipo() then raise exception 'Solo el equipo puede cambiar el acceso.'; end if;
  if not exists (select 1 from public.perfiles where id = p_familia and rol = 'familia') then raise exception 'Esa familia no existe.'; end if;
  if p_accion = 'suspender' then update public.perfiles set suspendido = true where id = p_familia;
  elsif p_accion = 'reactivar' then update public.perfiles set suspendido = false where id = p_familia;
  elsif p_accion = 'fecha' then
    if p_hasta is null then raise exception 'Elige la fecha.'; end if;
    update public.perfiles set acceso_hasta = p_hasta where id = p_familia;
  else raise exception 'Acción no válida.';
  end if;
  insert into public.historial_acceso (familia_id, accion, hasta, nota, por)
  values (p_familia, p_accion, (select acceso_hasta from public.perfiles where id = p_familia), left(coalesce(p_nota, ''), 200), auth.uid());
end $$;

-- La app avisa cada vez que alguien la abre (para "último ingreso")
create or replace function public.marcar_ingreso() returns void
language sql security definer set search_path = public as $$
  update public.perfiles set ultimo_ingreso = now() where id = auth.uid();
$$;

-- Resumen de todas las familias para el equipo (una sola consulta)
create or replace function public.familias_resumen()
returns table (id uuid, nombre text, correo text, creado timestamptz, acceso_hasta date, suspendido boolean,
               ultimo_ingreso timestamptz, ultimo_estudio date, minutos_7 int, ninos int, lecciones int)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.es_equipo() then raise exception 'Solo el equipo puede ver esto.'; end if;
  return query
    select p.id, p.nombre, p.correo, p.creado, p.acceso_hasta, p.suspendido, p.ultimo_ingreso,
      (select max(a.dia) from public.actividad a join public.ninos n on n.id = a.nino_id where n.familia_id = p.id and (a.minutos > 0 or a.logros > 0)),
      coalesce((select sum(a.minutos)::int from public.actividad a join public.ninos n on n.id = a.nino_id where n.familia_id = p.id and a.dia > public.hoy_co() - 7), 0),
      (select count(*)::int from public.ninos n where n.familia_id = p.id),
      (select count(*)::int from public.lecciones l join public.ninos n on n.id = l.nino_id where n.familia_id = p.id)
    from public.perfiles p where p.rol = 'familia' order by p.nombre;
end $$;

revoke all on function public.registrar_pago(uuid, int, int, text, text), public.cambiar_acceso(uuid, text, date, text),
  public.marcar_ingreso(), public.familias_resumen() from public, anon;
grant execute on function public.registrar_pago(uuid, int, int, text, text), public.cambiar_acceso(uuid, text, date, text),
  public.marcar_ingreso(), public.familias_resumen() to authenticated;
