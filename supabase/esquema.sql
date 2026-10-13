-- =============================================================================
-- Learnground — base de datos en Supabase
-- Se pega completo en: Supabase → SQL Editor → New query → Run.
-- Se puede ejecutar varias veces sin dañar nada.
--
-- Quién ve qué (lo hace cumplir la base de datos, no la app):
--   • Familia: solo sus niños, las lecciones de sus niños y su progreso.
--   • Equipo: ve a todos los niños y su progreso; sube, corrige y quita lecciones.
--   • Dueño: además crea códigos para cuentas de equipo.
--   • Nadie se registra sin un código de invitación (lo revisa la función "registro").
-- =============================================================================

create extension if not exists pgcrypto;

-- 1) Perfiles: una fila por cuenta (la crea la función "registro") ------------------
create table if not exists public.perfiles (
  id     uuid primary key references auth.users(id) on delete cascade,
  rol    text not null default 'familia' check (rol in ('familia', 'equipo')),
  dueno  boolean not null default false,
  nombre text not null default '',
  correo text not null default '',
  creado timestamptz not null default now()
);

-- 2) Niños ---------------------------------------------------------------------------
create table if not exists public.ninos (
  id         uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.perfiles(id) on delete cascade,
  nombre     text not null check (length(trim(nombre)) between 1 and 40),
  avatar     text not null default '🦊',
  color      text not null default '#59c3ff',
  grado      text not null default '4',
  creado     timestamptz not null default now()
);
create index if not exists ninos_familia on public.ninos(familia_id);

-- 3) Lecciones (el HTML va en el almacén privado "lecciones") ------------------------
create table if not exists public.lecciones (
  id         uuid primary key default gen_random_uuid(),
  nino_id    uuid not null references public.ninos(id) on delete cascade,
  titulo     text not null check (length(trim(titulo)) between 1 and 120),
  materia    text not null default 'otra',
  archivo    text not null,                 -- ruta en el almacén: <nino_id>/<leccion_id>.html
  meta       jsonb,                         -- juegos, temas y tips que lee el puente
  version    int not null default 1,        -- sube cada vez que se reemplaza el archivo
  subida_por uuid references public.perfiles(id) on delete set null,
  creada     timestamptz not null default now(),
  actualizada timestamptz not null default now()
);
create index if not exists lecciones_nino on public.lecciones(nino_id);

-- 4) Progreso de cada lección (lo que la lección guardaba en su localStorage) ---------
create table if not exists public.estados (
  leccion_id  uuid primary key references public.lecciones(id) on delete cascade,
  datos       jsonb not null default '{}'::jsonb,
  abierta     timestamptz,
  actualizado timestamptz
);

-- 5) Actividad por día (racha y tiempo de estudio) ------------------------------------
create table if not exists public.actividad (
  nino_id uuid not null references public.ninos(id) on delete cascade,
  dia     date not null,
  minutos int not null default 0,
  logros  int not null default 0,
  primary key (nino_id, dia)
);

-- 6) Códigos de invitación -------------------------------------------------------------
create table if not exists public.invitaciones (
  codigo     text primary key,
  rol        text not null default 'familia' check (rol in ('familia', 'equipo', 'dueno')),
  nota       text not null default '',
  creada_por uuid references public.perfiles(id) on delete set null,
  creada     timestamptz not null default now(),
  expira     date not null default (current_date + 7),
  usada_por  uuid references public.perfiles(id) on delete set null,
  usada      timestamptz
);

-- --- Funciones de ayuda para los permisos -------------------------------------------------
create or replace function public.es_equipo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'equipo');
$$;
create or replace function public.es_dueno() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'equipo' and dueno);
$$;
create or replace function public.es_mi_nino(p_nino uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ninos where id = p_nino and familia_id = auth.uid());
$$;
-- Igual, pero con el id como texto (para las carpetas del almacén; no falla si no es un id)
create or replace function public.es_mi_nino_txt(p_nino text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ninos where id::text = p_nino and familia_id = auth.uid());
$$;
create or replace function public.nino_de_leccion(p_leccion uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select nino_id from public.lecciones where id = p_leccion;
$$;

-- --- Permisos (RLS) -------------------------------------------------------------------------
alter table public.perfiles     enable row level security;
alter table public.ninos        enable row level security;
alter table public.lecciones    enable row level security;
alter table public.estados      enable row level security;
alter table public.actividad    enable row level security;
alter table public.invitaciones enable row level security;

drop policy if exists "perfiles: ver" on public.perfiles;
drop policy if exists "perfiles: cambiar mi nombre" on public.perfiles;
create policy "perfiles: ver" on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select public.es_equipo()));
create policy "perfiles: cambiar mi nombre" on public.perfiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "ninos: ver" on public.ninos;
drop policy if exists "ninos: crear" on public.ninos;
drop policy if exists "ninos: cambiar" on public.ninos;
create policy "ninos: ver" on public.ninos for select to authenticated
  using (familia_id = (select auth.uid()) or (select public.es_equipo()));
create policy "ninos: crear" on public.ninos for insert to authenticated
  with check (familia_id = (select auth.uid()) and not (select public.es_equipo()));
create policy "ninos: cambiar" on public.ninos for update to authenticated
  using (familia_id = (select auth.uid()) or (select public.es_equipo()))
  with check (familia_id = (select auth.uid()) or (select public.es_equipo()));

drop policy if exists "lecciones: ver" on public.lecciones;
drop policy if exists "lecciones: equipo crea" on public.lecciones;
drop policy if exists "lecciones: equipo cambia" on public.lecciones;
drop policy if exists "lecciones: equipo quita" on public.lecciones;
create policy "lecciones: ver" on public.lecciones for select to authenticated
  using ((select public.es_equipo()) or public.es_mi_nino(nino_id));
create policy "lecciones: equipo crea" on public.lecciones for insert to authenticated
  with check ((select public.es_equipo()));
create policy "lecciones: equipo cambia" on public.lecciones for update to authenticated
  using ((select public.es_equipo())) with check ((select public.es_equipo()));
create policy "lecciones: equipo quita" on public.lecciones for delete to authenticated
  using ((select public.es_equipo()));

drop policy if exists "estados: ver" on public.estados;
create policy "estados: ver" on public.estados for select to authenticated
  using ((select public.es_equipo()) or public.es_mi_nino(public.nino_de_leccion(leccion_id)));

drop policy if exists "actividad: ver" on public.actividad;
create policy "actividad: ver" on public.actividad for select to authenticated
  using ((select public.es_equipo()) or public.es_mi_nino(nino_id));

drop policy if exists "invitaciones: equipo ve" on public.invitaciones;
drop policy if exists "invitaciones: equipo crea" on public.invitaciones;
drop policy if exists "invitaciones: equipo anula" on public.invitaciones;
create policy "invitaciones: equipo ve" on public.invitaciones for select to authenticated
  using ((select public.es_equipo()));
create policy "invitaciones: equipo crea" on public.invitaciones for insert to authenticated
  with check ((select public.es_equipo()) and creada_por = (select auth.uid()) and usada_por is null
              and (rol = 'familia' or (rol = 'equipo' and (select public.es_dueno()))));
create policy "invitaciones: equipo anula" on public.invitaciones for delete to authenticated
  using ((select public.es_equipo()) and (usada_por is null or (select public.es_dueno())));

-- Qué columnas puede tocar cada quien (nadie cambia su propio rol)
revoke all on public.perfiles, public.ninos, public.lecciones, public.estados, public.actividad, public.invitaciones from anon, authenticated;
grant select on public.perfiles, public.ninos, public.lecciones, public.estados, public.actividad, public.invitaciones to authenticated;
grant update (nombre) on public.perfiles to authenticated;
grant insert (familia_id, nombre, avatar, color, grado) on public.ninos to authenticated;
grant update (nombre, avatar, color, grado) on public.ninos to authenticated;
grant insert (id, nino_id, titulo, materia, archivo, subida_por) on public.lecciones to authenticated;
grant update (titulo, materia, version, actualizada) on public.lecciones to authenticated;
grant delete on public.lecciones to authenticated;
grant insert (codigo, rol, nota, creada_por, expira) on public.invitaciones to authenticated;
grant delete on public.invitaciones to authenticated;
grant all on public.perfiles, public.ninos, public.lecciones, public.estados, public.actividad, public.invitaciones to service_role;

-- --- Acciones del niño (pasan por funciones que revisan permisos) ---------------------------

-- Guardar lo que la lección guardó (máximo ~1 MB)
create or replace function public.guardar_estado(p_leccion uuid, p_datos jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_mi_nino(public.nino_de_leccion(p_leccion)) then raise exception 'Sin permiso'; end if;
  if pg_column_size(p_datos) > 1000000 then raise exception 'Demasiados datos'; end if;
  insert into public.estados (leccion_id, datos, abierta, actualizado) values (p_leccion, p_datos, now(), now())
  on conflict (leccion_id) do update set datos = excluded.datos, actualizado = now();
end $$;

-- Marcar la primera vez que se abre
create or replace function public.abrir_leccion(p_leccion uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_mi_nino(public.nino_de_leccion(p_leccion)) then raise exception 'Sin permiso'; end if;
  insert into public.estados (leccion_id, abierta) values (p_leccion, now())
  on conflict (leccion_id) do update set abierta = coalesce(public.estados.abierta, now());
end $$;

-- Nombres de juegos y temas que trae la lección (familia dueña o equipo)
create or replace function public.guardar_meta(p_leccion uuid, p_meta jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.es_equipo() or public.es_mi_nino(public.nino_de_leccion(p_leccion))) then raise exception 'Sin permiso'; end if;
  if pg_column_size(p_meta) > 200000 then raise exception 'Demasiados datos'; end if;
  update public.lecciones set meta = p_meta where id = p_leccion;
end $$;

-- Sumar minutos y logros del día (el día lo manda el celular: hora de Colombia)
create or replace function public.sumar_actividad(p_nino uuid, p_dia date, p_minutos int, p_logros int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_mi_nino(p_nino) then raise exception 'Sin permiso'; end if;
  if p_dia not between current_date - 1 and current_date + 1 then raise exception 'Fecha inválida'; end if;
  insert into public.actividad (nino_id, dia, minutos, logros)
  values (p_nino, p_dia, least(greatest(p_minutos, 0), 5), least(greatest(p_logros, 0), 5))
  on conflict (nino_id, dia) do update
    set minutos = least(public.actividad.minutos + least(greatest(p_minutos, 0), 5), 600),
        logros  = least(public.actividad.logros + least(greatest(p_logros, 0), 5), 500);
end $$;

-- Revisar un código antes de registrarse (no lo gasta; sirve sin cuenta)
create or replace function public.revisar_codigo(p_codigo text)
returns table (codigo text, nota text, rol text) language plpgsql security definer set search_path = public as $$
declare i public.invitaciones;
begin
  select * into i from public.invitaciones where invitaciones.codigo = upper(trim(p_codigo));
  if not found then raise exception 'Ese código no existe. Revisa que esté bien escrito.'; end if;
  if i.usada_por is not null or i.usada is not null then raise exception 'Ese código ya se usó. Pídele uno nuevo al equipo de Learnground.'; end if;
  if i.expira < current_date then raise exception 'Ese código ya venció. Pídele uno nuevo al equipo de Learnground.'; end if;
  return query select i.codigo, i.nota, i.rol;
end $$;

revoke all on function public.guardar_estado(uuid, jsonb), public.abrir_leccion(uuid), public.guardar_meta(uuid, jsonb),
  public.sumar_actividad(uuid, date, int, int), public.revisar_codigo(text) from public;
grant execute on function public.guardar_estado(uuid, jsonb), public.abrir_leccion(uuid), public.guardar_meta(uuid, jsonb),
  public.sumar_actividad(uuid, date, int, int) to authenticated;
grant execute on function public.revisar_codigo(text) to anon, authenticated;

-- --- Almacén privado de lecciones ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('lecciones', 'lecciones', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists "lecciones: leer las mías" on storage.objects;
drop policy if exists "lecciones: equipo sube" on storage.objects;
drop policy if exists "lecciones: equipo reemplaza" on storage.objects;
drop policy if exists "lecciones: equipo borra" on storage.objects;
create policy "lecciones: leer las mías" on storage.objects for select to authenticated
  using (bucket_id = 'lecciones' and ((select public.es_equipo()) or public.es_mi_nino_txt((storage.foldername(name))[1])));
create policy "lecciones: equipo sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'lecciones' and (select public.es_equipo()));
create policy "lecciones: equipo reemplaza" on storage.objects for update to authenticated
  using (bucket_id = 'lecciones' and (select public.es_equipo())) with check (bucket_id = 'lecciones' and (select public.es_equipo()));
create policy "lecciones: equipo borra" on storage.objects for delete to authenticated
  using (bucket_id = 'lecciones' and (select public.es_equipo()));

-- --- Primer código: tu cuenta de dueño ------------------------------------------------------------
-- Úsalo en la app ("Tengo un código") para crear TU cuenta. Sirve una vez y vence en 7 días.
insert into public.invitaciones (codigo, rol, nota, expira)
values ('__CODIGO_DUENO__', 'dueno', 'Cuenta del dueño', current_date + 7)
on conflict (codigo) do nothing;
