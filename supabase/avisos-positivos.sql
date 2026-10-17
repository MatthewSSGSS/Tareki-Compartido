-- =============================================================================
-- avisos-positivos.sql — Texto positivo en el aviso diario de racha (17-oct-2026).
-- Antes: "tu racha está en peligro… para no perderla". Ahora: "hoy puedes llegar a N días".
-- Solo reemplaza la función avisos_diarios (es la misma de avisos.sql). No trae secretos
-- y se puede correr las veces que sea.
-- =============================================================================

-- 3) Avisos del día: un mensaje por niño que todavía no estudia hoy ----------------------------
create or replace function public.avisos_diarios(p_dia date)
returns table (user_id uuid, titulo text, cuerpo text, url text, clave text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  n record;
  f record;
  d date;
  racha int;
  nuevas int;
begin
  -- El acceso vence pronto (3 días antes, 1 día antes y el último día)
  for f in
    select p.id, p.acceso_hasta, (p.acceso_hasta - p_dia) as faltan,
      (select string_agg(ni.nombre, ', ' order by ni.nombre) from public.ninos ni where ni.familia_id = p.id) as hijos
    from public.perfiles p
    where p.rol = 'familia' and not p.suspendido and (p.acceso_hasta - p_dia) in (3, 1, 0)
      and exists (select 1 from public.suscripciones s where s.user_id = p.id)
  loop
    return query select f.id,
      case f.faltan when 0 then '⏰ Hoy es el último día de acceso a Learnground' when 1 then '⏰ Tu acceso a Learnground vence mañana' else '⏰ Tu acceso a Learnground vence en 3 días' end,
      case when f.hijos is null then 'Paga la mensualidad para seguir aprendiendo sin pausas. Toca para ver cómo pagar.'
           else format('Paga la mensualidad para que %s no se pierda%s ni un día de Learnground. Toca para ver cómo pagar.', f.hijos, case when f.hijos like '%%,%%' then 'n' else '' end) end,
      '#/papas', format('vence:%s:%s:%s', f.id, f.acceso_hasta, f.faltan);
  end loop;

  -- Racha y lecciones nuevas (solo familias con acceso vigente)
  for n in
    select ni.id, ni.nombre, ni.familia_id from public.ninos ni
    join public.perfiles pf on pf.id = ni.familia_id and not pf.suspendido and pf.acceso_hasta >= p_dia
    where exists (select 1 from public.suscripciones s where s.user_id = ni.familia_id)
      and not exists (select 1 from public.actividad a where a.nino_id = ni.id and a.dia = p_dia and (a.minutos >= 5 or a.logros > 0))
  loop
    racha := 0; d := p_dia - 1;
    while exists (select 1 from public.actividad a where a.nino_id = n.id and a.dia = d and (a.minutos >= 5 or a.logros > 0)) loop
      racha := racha + 1; d := d - 1;
    end loop;
    select count(*) into nuevas from public.lecciones l
      where l.nino_id = n.id and not exists (select 1 from public.estados e where e.leccion_id = l.id and e.abierta is not null);

    if racha > 0 then
      return query select n.familia_id,
        format('🔥 ¡%s, hoy puedes llegar a %s días de racha!', n.nombre, racha + 1),
        'Juega un ratico y sigue sumando. ¡Lulo te espera! 🐬', '#/inicio', format('racha:%s:%s', n.id, p_dia);
    elsif nuevas > 0 then
      return query select n.familia_id,
        format('🎁 ¡%s, tienes %s esperándote!', n.nombre, case when nuevas = 1 then 'una lección nueva' else nuevas || ' lecciones nuevas' end),
        'Ábrela hoy y empieza una racha 🔥', '#/inicio', format('nuevas:%s:%s', n.id, p_dia);
    end if;
  end loop;
end $$;
revoke all on function public.avisos_diarios(date) from public, anon, authenticated;
grant execute on function public.avisos_diarios(date) to service_role;
