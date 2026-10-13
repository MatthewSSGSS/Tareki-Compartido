-- =============================================================================
-- Learnground — precios por grado e inscripción desde la pantalla de entrada
-- Se ejecuta DESPUÉS de accesos.sql. Se puede repetir.
--   • Mensualidad POR NIÑO: 1.º a 5.º (primaria) y 6.º a 11.º (bachillerato).
--   • Los datos de cobro los puede ver cualquiera (también sin cuenta), porque las
--     familias pagan ANTES de recibir su código. Solo el dueño los cambia.
--   • Grados del 1 al 11.
-- =============================================================================

alter table public.ajustes_cobro add column if not exists precio_primaria int not null default 80000;
alter table public.ajustes_cobro add column if not exists precio_bachillerato int not null default 120000;
grant update (precio, llave, banco, titular, whatsapp, nota, precio_primaria, precio_bachillerato) on public.ajustes_cobro to authenticated;

-- Ver los datos de cobro sin iniciar sesión (pantalla de entrada)
drop policy if exists "cobro: ver sin cuenta" on public.ajustes_cobro;
create policy "cobro: ver sin cuenta" on public.ajustes_cobro for select to anon using (true);
grant select on public.ajustes_cobro to anon;

-- Grados del 1.º al 11.º (antes solo 1 a 6)
do $$
declare r record;
begin
  for r in select conname from pg_constraint
           where conrelid = 'public.ninos'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%grado%'
  loop
    execute format('alter table public.ninos drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.ninos add constraint ninos_grado_valido check (grado in ('1','2','3','4','5','6','7','8','9','10','11'));
