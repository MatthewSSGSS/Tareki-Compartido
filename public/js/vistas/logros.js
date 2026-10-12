// =============================================================================
// logros.js — Medallas, récord de racha y estrellas por lección.
// =============================================================================

import { cargarNino, materia } from '../carga.js';
import { medallas } from '../analisis.js';
import { esc, plural } from '../util.js';
import { estrellas, lulo } from '../ui.js';
import { tarjetaRacha } from '../piezas.js';

export async function render(root, ctx) {
  const { nino, analisis, racha, resumen } = await cargarNino(ctx.perfil.id);
  const lista = medallas({ resumen, racha, analisis });
  const ganadas = lista.filter((m) => m.ok).length;
  const proxima = lista.find((m) => !m.ok);

  root.innerHTML = `
    <div class="cabecera"><h1>🏅 Mis logros</h1></div>
    <div class="tablero">
      <div class="principal pila">
        ${lulo(proxima ? `¡Llevas <b>${ganadas} de ${lista.length}</b> medallas, ${esc(nino.nombre)}! La próxima: <b>${proxima.emoji} ${esc(proxima.nombre)}</b> — ${esc(proxima.texto.toLowerCase())}.` : `¡Las ganaste TODAS, ${esc(nino.nombre)}! Eres una leyenda 🏆`)}
        <div class="medallas">${lista.map((m) => `
          <div class="card medalla ${m.ok ? 'ganada' : 'bloqueada'}">
            <span class="m" aria-hidden="true">${m.emoji}</span><b>${esc(m.nombre)}</b><small>${m.ok ? '¡Ganada!' : esc(m.texto)}</small>
          </div>`).join('')}</div>

        <div class="titulo-seccion"><h2>⭐ Estrellas por lección</h2><span class="suave">${resumen.estrellas} en total</span></div>
        <div class="pila chica">${analisis.length ? analisis.map((a) => {
          const m = materia(a.leccion.materia);
          return `<a class="fila-leccion" href="#/leccion/${esc(a.leccion.id)}" style="text-decoration:none">
            <span class="icono" style="background:${m.color}" aria-hidden="true">${m.emoji}</span>
            <span><b>${esc(a.leccion.titulo)}</b><small>${a.juegos.length ? `${a.jugados} de ${plural(a.juegos.length, 'juego', 'juegos')}` : 'Sin juegos todavía'}${a.jefe ? ' · ⚔️ jefe vencido' : ''}</small></span>
            <span>${estrellas(a.estrellasMax ? Math.round((a.estrellas / a.estrellasMax) * 3) : 0)}</span>
          </a>`;
        }).join('') : '<p class="suave">Aún no tienes lecciones.</p>'}</div>
      </div>
      <aside class="lado pila">
        ${tarjetaRacha(racha)}
        <div class="cifras">
          <div class="cifra"><b>🔥 ${Math.max(racha.mejor, racha.actual)}</b><span>récord</span></div>
          <div class="cifra"><b>📅 ${racha.totalDias}</b><span>días estudiando</span></div>
          <div class="cifra"><b>⚔️ ${resumen.jefes}</b><span>jefes vencidos</span></div>
        </div>
      </aside>
    </div>`;
}
