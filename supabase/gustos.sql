-- =============================================================================
-- gustos.sql — Gustos e intereses del niño (17-oct-2026). Se ejecuta DESPUÉS de esquema.sql.
--
-- La familia los escribe en el perfil del niño ("¿Qué le gusta?") o en Papás.
-- El equipo los ve en "📋 Perfil para la próxima lección" para hacer la lección a su medida.
-- Se puede correr las veces que sea. No trae secretos.
-- =============================================================================

alter table public.ninos add column if not exists gustos text not null default '';

alter table public.ninos drop constraint if exists ninos_gustos_largo;
alter table public.ninos add constraint ninos_gustos_largo check (length(gustos) <= 200);

-- Mismos permisos que el resto del perfil: la familia (y el equipo) lo pueden escribir.
grant insert (gustos) on public.ninos to authenticated;
grant update (gustos) on public.ninos to authenticated;
