-- =============================================================================
-- Learnground — pedidos de lecciones (la familia pide, el equipo arma la lección)
-- Se ejecuta DESPUÉS de esquema.sql y chat.sql. Se puede repetir.
--   • La familia elige niño y materia, escribe los temas y sube fotos (cuaderno, guía…).
--   • Las fotos van al almacén privado "adjuntos": <familia_id>/<pedido_id>/<n>.jpg
--   • El pedido también aparece en el chat (chat.pedido_id), así llega la notificación.
--   • Estados: nuevo → en_proceso → listo. Al cambiarlo, la app le escribe a la familia.
-- =============================================================================

create table if not exists public.pedidos (
  id           uuid primary key default gen_random_uuid(),
  familia_id   uuid not null references public.perfiles(id) on delete cascade,
  nino_id      uuid references public.ninos(id) on delete set null,
  materia      text not null default 'otra',
  temas        text not null default '' check (length(temas) <= 2000),
  para         date,                                    -- para cuándo la necesitan (opcional)
  fotos        text[] not null default '{}' check (cardinality(fotos) <= 8),
  estado       text not null default 'nuevo' check (estado in ('nuevo', 'en_proceso', 'listo')),
  atendido_por uuid references public.perfiles(id) on delete set null,
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);
create index if not exists pedidos_familia on public.pedidos(familia_id, creado);
create index if not exists pedidos_estado on public.pedidos(estado, creado);
alter table public.pedidos enable row level security;

drop policy if exists "pedidos: ver" on public.pedidos;
drop policy if exists "pedidos: pedir" on public.pedidos;
drop policy if exists "pedidos: atender" on public.pedidos;
drop policy if exists "pedidos: borrar" on public.pedidos;
create policy "pedidos: ver" on public.pedidos for select to authenticated
  using (familia_id = (select auth.uid()) or (select public.es_equipo()));
-- La familia pide para sus propios hijos (aunque tenga el acceso vencido) y siempre empieza en "nuevo"
create policy "pedidos: pedir" on public.pedidos for insert to authenticated with check (
  familia_id = (select auth.uid()) and not (select public.es_equipo()) and estado = 'nuevo'
  and (nino_id is null or exists (select 1 from public.ninos n where n.id = nino_id and n.familia_id = (select auth.uid())))
  and not exists (select 1 from unnest(fotos) f where f not like (select auth.uid())::text || '/' || id::text || '/%')
);
create policy "pedidos: atender" on public.pedidos for update to authenticated
  using ((select public.es_equipo())) with check ((select public.es_equipo()));
-- El equipo borra cualquiera; la familia puede cancelar el suyo mientras siga "nuevo"
create policy "pedidos: borrar" on public.pedidos for delete to authenticated
  using ((select public.es_equipo()) or (familia_id = (select auth.uid()) and estado = 'nuevo'));
revoke all on public.pedidos from anon, authenticated;
grant select, delete on public.pedidos to authenticated;
grant insert (id, familia_id, nino_id, materia, temas, para, fotos) on public.pedidos to authenticated;
grant update (estado, atendido_por, actualizado) on public.pedidos to authenticated;
grant all on public.pedidos to service_role;

-- El mensaje del chat que acompaña al pedido (y los de "en proceso" / "lista")
alter table public.chat add column if not exists pedido_id uuid references public.pedidos(id) on delete set null;
grant insert (familia_id, autor, de_equipo, texto, pedido_id) on public.chat to authenticated;

-- --- Almacén privado de fotos ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('adjuntos', 'adjuntos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "adjuntos: subir los míos" on storage.objects;
drop policy if exists "adjuntos: ver" on storage.objects;
drop policy if exists "adjuntos: borrar" on storage.objects;
create policy "adjuntos: subir los míos" on storage.objects for insert to authenticated
  with check (bucket_id = 'adjuntos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "adjuntos: ver" on storage.objects for select to authenticated
  using (bucket_id = 'adjuntos' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.es_equipo())));
create policy "adjuntos: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'adjuntos' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.es_equipo())));
