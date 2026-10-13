// =============================================================================
// inicio.js — Pantalla principal del niño: saludo de Lulo, racha, lecciones.
// =============================================================================

import { cargarNino, materia } from '../carga.js';
import { fraseRacha } from '../racha.js';
import { medallas } from '../analisis.js';
import { esc, minutosTexto } from '../util.js';
import { lulo, vacio } from '../ui.js';
import { tarjetaLeccion, tarjetaRacha } from '../piezas.js';
import { estadoAvisos, tarjetaAvisos } from '../avisos.js';
import { MODO_DEMO } from '../config.js';
import { bannerVence, conectarBanner } from '../acceso.js';
import { pintarMensajeNuevo } from '../buzon.js';

export async function render(root, ctx) {
  const d = await cargarNino(ctx.perfil.id);
  const { nino, analisis, racha, resumen } = d;
  const nuevas = analisis.filter((a) => a.estado === 'nueva');
  const enCurso = analisis.filter((a) => a.estado === 'empezada');
  const terminadas = analisis.filter((a) => a.estado === 'terminada');
  const siguiente = enCurso[0] || nuevas[0] || null;
  const ganadas = medallas({ resumen, racha, analisis }).filter((m) => m.ok);

  let mensaje = fraseRacha(racha, esc(nino.nombre));
  if (nuevas.length && !racha.enRiesgo) mensaje = `¡${esc(nino.nombre)}, tienes ${nuevas.length === 1 ? 'una lección nueva' : `${nuevas.length} lecciones nuevas`}! 🎁 ¿La abrimos?`;

  const seccion = (titulo, lista, rejilla = true) => lista.length
    ? `<div class="titulo-seccion"><h2>${titulo}</h2><span class="suave peq">${lista.length}</span></div>
       <div class="lecciones ${rejilla ? 'rejilla' : ''}">${lista.map(tarjetaLeccion).join('')}</div>` : '';

  root.innerHTML = `
    <div class="tablero">
      <div class="principal">
        <section class="card saludo" style="background:${esc(nino.color)}">
          <div class="saludo-cab"><h1>¡Hola, ${esc(nino.nombre)}!</h1><span class="av av-grande" aria-hidden="true">${esc(nino.avatar)}</span></div>
          ${lulo(mensaje)}
        </section>

        <div class="racha-cel ${racha.actual ? '' : 'fria'}" aria-label="Racha">
          <span class="fuego" aria-hidden="true">${racha.actual ? '🔥' : '🪵'}</span>
          <span class="rc-num"><b>${racha.actual}</b><small>${racha.actual === 1 ? 'día seguido' : 'días seguidos'}</small></span>
          <span class="rc-semana">${racha.semana.map((d) => `<i class="${d.activo ? 'si' : ''} ${d.hoy ? 'hoy' : ''}" title="${d.dia}"></i>`).join('')}</span>
        </div>
        <div id="msjNuevo"></div>

        ${siguiente ? (() => {
          const m = materia(siguiente.leccion.materia);
          return `<div class="titulo-seccion"><h2>${siguiente.estado === 'nueva' ? '🎁 Para hoy' : '▶ Sigue donde ibas'}</h2></div>
          <section class="card destacada">
            <div class="fila"><span class="icono" style="background:${m.color}" aria-hidden="true">${m.emoji}</span>
              <div><h2>${esc(siguiente.leccion.titulo)}</h2><p class="suave">${esc(m.nombre)}${siguiente.estado === 'empezada' ? ` · llevas ${siguiente.progreso}%` : ''}</p></div></div>
            <a class="btn bloque btn-verde" href="#/leccion/${esc(siguiente.leccion.id)}">${siguiente.estado === 'nueva' ? '¡Empezar ahora! 🚀' : '¡Seguir jugando! 🎮'}</a>
          </section>`;
        })() : ''}

        ${analisis.length ? '' : `<div class="sep"></div>${vacio({ emoji: '📭', titulo: 'Todavía no tienes lecciones', texto: 'Cuando el equipo de Tareki te mande una, aparecerá aquí. ¡Lulo te avisará! 🦉' })}`}
        ${seccion('🎁 ¡Nuevas para ti!', nuevas.filter((a) => a !== siguiente))}
        ${seccion('🎮 Sigue jugando', enCurso.filter((a) => a !== siguiente))}
        ${seccion('✅ Terminadas', terminadas)}
      </div>

      <aside class="lado pila">
        <div class="solo-pc">${tarjetaRacha(racha)}</div>
        <div id="avisos"></div>
        <div class="cifras">
          <div class="cifra"><b>⭐ ${resumen.estrellas}</b><span>estrellas</span></div>
          <div class="cifra"><b>🎓 ${resumen.terminadas}</b><span>terminadas</span></div>
          <div class="cifra"><b>${minutosTexto(d.minutosSemana)}</b><span>esta semana</span></div>
        </div>
        ${bannerVence(ctx.usuario)}
        <a class="card fila entre" href="#/logros" style="text-decoration:none;color:inherit">
          <span><b style="font-family:var(--f-head);font-size:1.15em">🏅 Mis medallas</b><br><span class="suave peq">${ganadas.length ? `${ganadas.length} ganadas` : 'Juega para ganar la primera'}</span></span>
          <span style="font-size:30px;letter-spacing:-6px">${ganadas.slice(-4).map((m) => m.emoji).join('') || '🔒'}</span>
        </a>
      </aside>
    </div>`;

  conectarBanner(root, ctx.usuario);
  pintarMensajeNuevo(root.querySelector('#msjNuevo'));
  // Si este dispositivo no recibe avisos, recordarlo (la racha se cuida mejor con ellos)
  if (!MODO_DEMO) estadoAvisos().then((e) => { if (e === 'apagados' || e === 'instalar-ios') tarjetaAvisos(root.querySelector('#avisos')); });
}
