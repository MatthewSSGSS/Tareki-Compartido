-- =============================================================================
-- Learnground — chat entre cada familia y el equipo
-- Se ejecuta DESPUÉS de esquema.sql. Se puede repetir.
--   • Cada familia tiene una sola conversación con todo el equipo.
--   • La familia solo ve la suya; el equipo ve todas y responde.
--   • Funciona aunque la familia tenga el acceso vencido (para hablar del pago).
-- =============================================================================

create table if not exists public.chat (
  id         uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.perfiles(id) on delete cascade,
  autor      uuid references public.perfiles(id) on delete set null,
  de_equipo  boolean not null,
  texto      text not null check (length(trim(texto)) between 1 and 1000),
  leido      boolean not null default false,   -- leído por el otro lado
  creado     timestamptz not null default now()
);
create index if not exists chat_familia on public.chat(familia_id, creado);
alter table public.chat enable row level security;

drop policy if exists "chat: ver" on public.chat;
drop policy if exists "chat: escribir" on public.chat;
create policy "chat: ver" on public.chat for select to authenticated
  using (familia_id = (select auth.uid()) or (select public.es_equipo()));
create policy "chat: escribir" on public.chat for insert to authenticated with check (
  autor = (select auth.uid()) and (
    (familia_id = (select auth.uid()) and not de_equipo)
    or ((select public.es_equipo()) and de_equipo)
  )
);
revoke all on public.chat from anon, authenticated;
grant select on public.chat to authenticated;
grant insert (familia_id, autor, de_equipo, texto) on public.chat to authenticated;
grant all on public.chat to service_role;

-- Marcar como leídos los mensajes del otro lado
create or replace function public.marcar_chat_leido(p_familia uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.es_equipo() then
    update public.chat set leido = true where familia_id = p_familia and not de_equipo and not leido;
  elsif p_familia = auth.uid() then
    update public.chat set leido = true where familia_id = p_familia and de_equipo and not leido;
  end if;
end $$;
revoke all on function public.marcar_chat_leido(uuid) from public, anon;
grant execute on function public.marcar_chat_leido(uuid) to authenticated;
