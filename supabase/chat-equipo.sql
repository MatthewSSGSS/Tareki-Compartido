-- =============================================================================
-- Learnground — chat interno del equipo (las familias no lo ven)
-- Se ejecuta DESPUÉS de esquema.sql. Se puede repetir.
-- =============================================================================

create table if not exists public.chat_equipo (
  id     uuid primary key default gen_random_uuid(),
  autor  uuid references public.perfiles(id) on delete set null,
  texto  text not null check (length(trim(texto)) between 1 and 1000),
  creado timestamptz not null default now()
);
create index if not exists chat_equipo_creado on public.chat_equipo(creado);
alter table public.chat_equipo enable row level security;
drop policy if exists "chat equipo: ver" on public.chat_equipo;
drop policy if exists "chat equipo: escribir" on public.chat_equipo;
create policy "chat equipo: ver" on public.chat_equipo for select to authenticated using ((select public.es_equipo()));
create policy "chat equipo: escribir" on public.chat_equipo for insert to authenticated
  with check ((select public.es_equipo()) and autor = (select auth.uid()));
revoke all on public.chat_equipo from anon, authenticated;
grant select on public.chat_equipo to authenticated;
grant insert (autor, texto) on public.chat_equipo to authenticated;
grant all on public.chat_equipo to service_role;

-- Hasta dónde leyó cada persona del equipo
create table if not exists public.chat_equipo_visto (
  user_id uuid primary key references public.perfiles(id) on delete cascade,
  visto   timestamptz not null default now()
);
alter table public.chat_equipo_visto enable row level security;
revoke all on public.chat_equipo_visto from anon, authenticated;
grant all on public.chat_equipo_visto to service_role;

create or replace function public.marcar_equipo_visto() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_equipo() then return; end if;
  insert into public.chat_equipo_visto (user_id, visto) values (auth.uid(), now())
  on conflict (user_id) do update set visto = now();
end $$;

create or replace function public.equipo_sin_leer() returns int
language sql stable security definer set search_path = public as $$
  select case when not public.es_equipo() then 0 else (
    select count(*)::int from public.chat_equipo c
    where c.autor is distinct from auth.uid()
      and c.creado > coalesce((select visto from public.chat_equipo_visto where user_id = auth.uid()), '-infinity'::timestamptz)
  ) end;
$$;
revoke all on function public.marcar_equipo_visto(), public.equipo_sin_leer() from public, anon;
grant execute on function public.marcar_equipo_visto(), public.equipo_sin_leer() to authenticated;
