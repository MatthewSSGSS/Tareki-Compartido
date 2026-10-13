// =============================================================================
// buzon.js — Mensajes del equipo que le llegan a una familia.
// Qué está leído se guarda en este dispositivo (no hace falta en la nube).
// =============================================================================

import * as datos from './datos.js';
import { esc, fechaBonita, leerLocal, guardarLocal } from './util.js';
import { abrirHoja, cerrarHoja } from './ui.js';

const CLAVE = 'tareki:leidos';
const leidos = () => new Set(leerLocal(CLAVE, []));
const marcarLeido = (id) => { const s = leidos(); s.add(id); guardarLocal(CLAVE, [...s].slice(-300)); };

export async function sinLeer() {
  const lista = await datos.mensajes().catch(() => []);
  const ya = leidos();
  return lista.filter((m) => m.enviado && !ya.has(m.id));
}

function abrirMensaje(m, alLeer) {
  marcarLeido(m.id);
  abrirHoja({
    titulo: m.titulo,
    cuerpo: `<p class="suave peq">Del equipo de Tareki · ${fechaBonita(m.enviado)}</p>${m.cuerpo ? `<p style="font-size:1.08em">${esc(m.cuerpo)}</p>` : ''}`,
    pie: m.url && m.url !== '#/' ? `<a class="btn" href="${esc(m.url)}">Ir ahora</a>` : '<button class="btn" data-ok>¡Listo!</button>',
    montar: (el) => el.querySelector('[data-ok]')?.addEventListener('click', () => cerrarHoja()),
    cerrar: alLeer,
  });
}

/** Lista de mensajes (vista Papás). */
export async function pintarBuzon(el) {
  const lista = (await datos.mensajes().catch(() => [])).filter((m) => m.enviado).slice(0, 8);
  const ya = leidos();
  if (!lista.length) { el.innerHTML = '<p class="suave">Aquí aparecen los avisos del equipo de Tareki.</p>'; return; }
  el.innerHTML = `<div class="buzon">${lista.map((m) => `
    <button class="buzon-fila ${ya.has(m.id) ? '' : 'nuevo'}" data-m="${esc(m.id)}">
      <span class="em" aria-hidden="true">${ya.has(m.id) ? '📭' : '📬'}</span>
      <span class="bf-texto"><b>${esc(m.titulo)}</b><small>${esc(m.cuerpo || '').slice(0, 90)}${(m.cuerpo || '').length > 90 ? '…' : ''}</small></span>
      <span class="bf-fecha">${ya.has(m.id) ? '' : '<span class="chip rosa">Nuevo</span>'}<small>${fechaBonita(m.enviado)}</small></span>
    </button>`).join('')}</div>`;
  el.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => abrirMensaje(lista.find((m) => m.id === b.dataset.m), () => pintarBuzon(el))));
}

/** Tarjeta "tienes un mensaje" para el inicio del niño (solo si hay sin leer). */
export async function pintarMensajeNuevo(el) {
  const nuevos = await sinLeer();
  if (!nuevos.length) { el.innerHTML = ''; return; }
  const m = nuevos[0];
  el.innerHTML = `<button class="card mensaje-nuevo" data-leer>
    <span class="sobre" aria-hidden="true">💌</span>
    <span><small>${nuevos.length > 1 ? `${nuevos.length} mensajes nuevos del equipo` : 'Mensaje nuevo del equipo'}</small><b>${esc(m.titulo)}</b></span>
    <span class="chip rosa">Leer</span></button>`;
  el.querySelector('[data-leer]').addEventListener('click', () => abrirMensaje(m, () => pintarMensajeNuevo(el)));
}
