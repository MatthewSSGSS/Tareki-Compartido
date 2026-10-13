// =============================================================================
// piezas.js — Tarjetas que se repiten en varias pantallas (lección, racha).
// =============================================================================

import { esc, fechaBonita, DIAS_CORTOS, plural } from './util.js';
import { barra, estrellas } from './ui.js';
import { materia } from './carga.js';
import { MODO_DEMO, NUBE } from './config.js';

/** Franja de la versión de prueba (datos inventados). En la app real lleva "Salir de la prueba". */
export const bandaPrueba = ({ reiniciar = false } = {}) => (MODO_DEMO ? `
  <div class="banda-demo"><span>🧪 <b>Versión de prueba:</b> datos inventados que se guardan solo en este navegador.</span>
    <span class="fila envolver">${reiniciar ? '<button class="btn btn-peq btn-blanco" data-reiniciar>Reiniciar datos</button>' : ''}${NUBE.url ? '<a class="btn btn-peq btn-blanco" href="./">Salir de la prueba</a>' : ''}</span></div>` : '');

const ESTADO = {
  nueva: { texto: '¡Nueva!', boton: '¡Empezar! ▶' },
  empezada: { texto: 'En curso', boton: 'Seguir ▶' },
  terminada: { texto: 'Terminada', boton: 'Repasar 🔁' },
};

/** Tarjeta grande de una lección para el niño. */
export function tarjetaLeccion(a) {
  const m = materia(a.leccion.materia);
  const e = ESTADO[a.estado];
  return `<a class="card leccion ${a.estado}" href="#/leccion/${esc(a.leccion.id)}">
    ${a.estado === 'nueva' ? '<span class="sello-nueva">¡NUEVA!</span>' : ''}
    <span class="icono" style="background:${m.color}" aria-hidden="true">${m.emoji}</span>
    <span>
      <h3>${esc(a.leccion.titulo)}</h3>
      <p class="meta">${esc(m.nombre)} · ${a.estado === 'nueva' ? `llegó ${fechaBonita(a.leccion.creada)}` : a.ultimaVez ? `jugaste ${fechaBonita(a.ultimaVez)}` : e.texto}</p>
      ${a.estado === 'nueva' ? '' : barra(a.progreso, a.estado === 'terminada' ? 'verde' : 'sol')}
      <span class="pie">
        <span>${a.estrellasMax ? estrellas(Math.round((a.estrellas / a.estrellasMax) * 3)) + ` <span class="suave">${a.estrellas}/${a.estrellasMax}</span>` : ''}</span>
        <span class="chip ${a.estado === 'nueva' ? 'rosa' : a.estado === 'terminada' ? 'verde' : 'sol'}">${e.boton}</span>
      </span>
    </span>
  </a>`;
}

/** Tarjeta de la racha con los 7 días de la semana. */
export function tarjetaRacha(r) {
  const fria = r.actual === 0;
  const frase = r.hoyListo ? '¡Hoy ya cumpliste! 🎉' : r.enRiesgo ? '¡Estudia hoy para no perderla!' : 'Estudia hoy para encender el fuego';
  return `<section class="card racha ${fria ? 'fria' : ''}" aria-label="Racha">
    <div class="fuego" aria-hidden="true">${fria ? '🪵' : '🔥'}</div>
    <div class="numero">${r.actual}</div>
    <div class="que">${r.actual === 1 ? 'día seguido' : 'días seguidos'}</div>
    <p>${frase}${r.mejor > r.actual ? ` · Tu récord: ${plural(r.mejor, 'día', 'días')}` : ''}</p>
    <div class="semana">${r.semana.map((d) => {
      const dia = DIAS_CORTOS[new Date(`${d.dia}T12:00:00`).getDay()];
      return `<div class="${d.activo ? 'si' : ''} ${d.hoy ? 'hoy' : ''}"><i>${d.activo ? '🔥' : ''}</i><span>${dia}</span></div>`;
    }).join('')}</div>
  </section>`;
}
