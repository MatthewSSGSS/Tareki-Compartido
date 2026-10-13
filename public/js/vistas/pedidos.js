// =============================================================================
// pedidos.js — Pedidos de lecciones.
//   Familia: "📚 Pedir una lección" (en el chat y en Papás): niño, materia, temas,
//            para cuándo y fotos del cuaderno o la guía.
//   Equipo:  #/equipo/pedidos — los ve con sus fotos, los toma ("en proceso") y los
//            marca "lista"; cada cambio le puede escribir a la familia por el chat.
// El pedido también queda en el chat, así le llega la notificación al equipo.
// =============================================================================

import * as datos from '../datos.js';
import { MATERIAS } from '../config.js';
import { esc, fechaBonita, hoy, diasEntre, plural } from '../util.js';
import { abrirHoja, cerrarHoja, confirmar, aviso, vacio, confeti } from '../ui.js';
import { comprimirFoto } from '../fotos.js';
import { fechaLarga } from '../acceso.js';
import { pestanasMensajes } from './chat.js';

const MAX_FOTOS = 8;
const FORMATOS = ['image/jpeg', 'image/png', 'image/webp'];

export const ESTADOS = {
  nuevo: { nombre: 'Nuevo', emoji: '🆕', chip: 'rosa' },
  en_proceso: { nombre: 'En proceso', emoji: '🛠️', chip: 'sol' },
  listo: { nombre: 'Lista', emoji: '✅', chip: 'verde' },
};
const mat = (id) => MATERIAS.find((m) => m.id === id) || MATERIAS.at(-1);
export const chipEstado = (estado) => { const e = ESTADOS[estado] || ESTADOS.nuevo; return `<span class="chip ${e.chip}">${e.emoji} ${e.nombre}</span>`; };

/** "para el 17 de octubre (en 3 días)"; rojo si ya pasó o es hoy/mañana. */
function chipPara(para, estado) {
  if (!para) return '';
  const n = diasEntre(hoy(), para);
  const cuando = n < 0 ? 'ya pasó' : n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`;
  return `<span class="chip ${estado !== 'listo' && n <= 1 ? 'rojo' : ''}">📅 Para el ${fechaLarga(para)} · ${cuando}</span>`;
}

/** El texto que queda en el chat (y en la notificación al equipo). */
function textoPedido({ nino, materia, temas, para, fotos }) {
  const m = mat(materia);
  return [
    `📚 Pedido de lección${nino ? ` para ${nino.nombre}` : ''}`,
    `${m.emoji} ${m.nombre}${para ? ` · para el ${fechaLarga(para)}` : ''}`,
    temas ? `📝 ${temas}` : '',
    fotos ? `📷 ${plural(fotos, 'foto', 'fotos')}` : '',
  ].filter(Boolean).join('\n').slice(0, 1000);
}

// --- Fotos: miniaturas y visor ----------------------------------------------------------------
const enlaces = new Map(); // ruta → enlace temporal (para no pedirlo en cada repintada)

/** Pone las fotos en los botones [data-foto-de] que haya dentro de `cont`. */
export async function llenarMiniaturas(cont) {
  const botones = [...cont.querySelectorAll('[data-ruta]')].filter((b) => !b.style.backgroundImage);
  const faltan = [...new Set(botones.map((b) => b.dataset.ruta).filter((r) => !enlaces.has(r)))];
  if (faltan.length) {
    const urls = await datos.urlsFotos(faltan).catch(() => []);
    faltan.forEach((r, i) => urls[i] && enlaces.set(r, urls[i]));
  }
  for (const b of botones) {
    const u = enlaces.get(b.dataset.ruta);
    if (u) { b.style.backgroundImage = `url("${u.replace(/"/g, '%22')}")`; b.classList.remove('cargando'); }
    else b.classList.add('rota');
  }
}
export const miniaturas = (fotos) => (fotos?.length ? `<div class="fotos-mini">${fotos.map((r, i) => `<button type="button" class="foto-mini cargando" data-ruta="${esc(r)}" data-i="${i}" aria-label="Ver foto ${i + 1}"></button>`).join('')}</div>` : '');

/** Abre una foto en grande, con anterior/siguiente y descargar. */
export async function abrirVisor(rutas, inicio = 0) {
  let i = inicio;
  const ver = await datos.urlsFotos(rutas);
  const bajar = await datos.urlsFotos(rutas, { descargar: true });
  const pintar = (el) => {
    el.querySelector('.visor-foto img').src = ver[i] || '';
    el.querySelector('[data-cuenta]').textContent = `Foto ${i + 1} de ${rutas.length}`;
    const a = el.querySelector('[data-bajar]');
    a.href = bajar[i] || ver[i] || '#';
    a.download = `pedido-foto-${i + 1}.jpg`;
    el.querySelectorAll('[data-mover]').forEach((b) => { b.hidden = rutas.length < 2; });
  };
  abrirHoja({
    titulo: '📷 Fotos del pedido',
    ancha: true,
    cuerpo: `<div class="visor-foto"><img alt="Foto del pedido"></div>
      <div class="fila visor-nav"><button class="btn-redondo" data-mover="-1" aria-label="Anterior">←</button><span class="suave" data-cuenta></span><button class="btn-redondo" data-mover="1" aria-label="Siguiente">→</button></div>`,
    pie: '<a class="btn btn-blanco" data-abrir target="_blank" rel="noopener">↗️ Abrir aparte</a><a class="btn" data-bajar target="_blank" rel="noopener">⬇️ Descargar</a>',
    montar: (el) => {
      el.querySelectorAll('[data-mover]').forEach((b) => b.addEventListener('click', () => { i = (i + Number(b.dataset.mover) + rutas.length) % rutas.length; pintar(el); el.querySelector('[data-abrir]').href = ver[i] || '#'; }));
      el.querySelector('[data-abrir]').href = ver[i] || '#';
      pintar(el);
    },
  });
}

// --- Familia: pedir una lección ---------------------------------------------------------------
export async function abrirPedir(ctx, { alEnviar } = {}) {
  const hijos = await datos.ninos().catch(() => []);
  let ninoId = hijos.some((n) => n.id === ctx.perfil?.id) ? ctx.perfil.id : hijos.length === 1 ? hijos[0].id : null;
  let materia = null;
  const fotos = []; // { blob, url }

  abrirHoja({
    titulo: '📚 Pedir una lección',
    ancha: true,
    cuerpo: `
      <p class="suave">Cuéntanos qué están viendo en el colegio y armamos la lección. Las fotos del cuaderno o de la guía nos ayudan mucho.</p>
      ${hijos.length > 1 ? `<div class="campo"><span class="etiqueta">¿Para quién es?</span><div class="selector-ninos">${hijos.map((n) => `<button type="button" data-nino="${esc(n.id)}" aria-pressed="${n.id === ninoId}"><span class="av" style="background:${esc(n.color)}">${esc(n.avatar)}</span>${esc(n.nombre)}</button>`).join('')}</div></div>` : ''}
      <div class="campo"><span class="etiqueta">Materia</span><div class="materias">${MATERIAS.map((m) => `<button type="button" data-mat="${m.id}" aria-pressed="false">${m.emoji} ${esc(m.nombre)}</button>`).join('')}</div></div>
      <div class="campo"><label for="pTemas">Temas</label><textarea id="pTemas" rows="4" maxlength="2000" placeholder="Ej.: multiplicación por 2 cifras y problemas con dinero. Tiene evaluación el viernes."></textarea></div>
      <div class="campo"><label for="pPara">¿Para cuándo la necesitan? <small>(opcional)</small></label><input id="pPara" type="date" min="${hoy()}"></div>
      <div class="campo"><span class="etiqueta">Fotos <small>(opcional, hasta ${MAX_FOTOS}: cuaderno, guía o tareas)</small></span>
        <div class="fotos-mini" id="pFotos"></div>
        <label class="btn btn-blanco btn-peq subir-foto" id="pAgregar">📷 Agregar fotos<input type="file" accept="image/*" multiple id="pArchivo"></label></div>
      <p class="error" id="pErr" role="alert"></p>`,
    pie: '<button class="btn btn-verde" data-enviar>📨 Enviar pedido</button>',
    cerrar: () => fotos.forEach((f) => URL.revokeObjectURL(f.url)),
    montar: (el) => {
      const $err = el.querySelector('#pErr');
      const $agregar = el.querySelector('#pAgregar');
      el.addEventListener('click', (e) => { if (e.target.closest('[data-nino], [data-mat]')) $err.textContent = ''; });
      el.querySelector('#pTemas').addEventListener('input', () => { $err.textContent = ''; });
      const pintarFotos = () => {
        el.querySelector('#pFotos').innerHTML = fotos.map((f, i) => `<div class="foto-mini" style="background-image:url('${f.url}')"><button type="button" data-quitar="${i}" aria-label="Quitar foto ${i + 1}">✕</button></div>`).join('');
        $agregar.hidden = fotos.length >= MAX_FOTOS;
      };
      el.querySelectorAll('[data-nino]').forEach((b) => b.addEventListener('click', () => { ninoId = b.dataset.nino; el.querySelectorAll('[data-nino]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
      el.querySelectorAll('[data-mat]').forEach((b) => b.addEventListener('click', () => { materia = b.dataset.mat; el.querySelectorAll('[data-mat]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
      el.querySelector('#pFotos').addEventListener('click', (e) => {
        const b = e.target.closest('[data-quitar]');
        if (!b) return;
        const [f] = fotos.splice(Number(b.dataset.quitar), 1);
        URL.revokeObjectURL(f.url);
        pintarFotos();
      });
      el.querySelector('#pArchivo').addEventListener('change', async (e) => {
        const archivos = [...e.target.files];
        e.target.value = '';
        const lugar = MAX_FOTOS - fotos.length;
        if (archivos.length > lugar) aviso(`Caben ${MAX_FOTOS} fotos por pedido.`, { emoji: '📷' });
        $agregar.firstChild.textContent = '⏳ Preparando…';
        let raras = 0;
        for (const a of archivos.slice(0, lugar)) {
          const blob = await comprimirFoto(a);
          if (!FORMATOS.includes(blob.type)) { raras++; continue; }
          fotos.push({ blob, url: URL.createObjectURL(blob) });
          pintarFotos();
        }
        $agregar.firstChild.textContent = '📷 Agregar fotos';
        if (raras) aviso(`${raras === 1 ? 'Una foto está' : `${raras} fotos están`} en un formato que no pudimos abrir. Tómale captura de pantalla y súbela de nuevo.`, { emoji: '⚠️', ms: 6000 });
      });
      el.querySelector('[data-enviar]').addEventListener('click', async (e) => {
        const b = e.currentTarget;
        const temas = el.querySelector('#pTemas').value.trim();
        const para = el.querySelector('#pPara').value;
        $err.textContent = '';
        if (hijos.length > 1 && !ninoId) { $err.textContent = '¿Para cuál de tus hijos es la lección?'; return; }
        if (!materia) { $err.textContent = 'Elige la materia.'; return; }
        if (!temas && !fotos.length) { $err.textContent = 'Escribe los temas o agrega fotos.'; return; }
        if (para && para < hoy()) { $err.textContent = 'Esa fecha ya pasó.'; return; }
        b.disabled = true;
        b.textContent = fotos.length ? `Subiendo ${plural(fotos.length, 'foto', 'fotos')}…` : 'Enviando…';
        try {
          const nino = hijos.find((n) => n.id === ninoId) || null;
          await datos.crearPedido({ ninoId, materia, temas, para, fotos: fotos.map((f) => f.blob), textoChat: textoPedido({ nino, materia, temas, para, fotos: fotos.length }) });
          cerrarHoja();
          confeti(60);
          aviso('¡Pedido enviado! El equipo ya lo recibió y te avisa por el chat cuando la lección esté lista.', { emoji: '📚', ms: 6000 });
          alEnviar?.();
        } catch (x) { b.disabled = false; b.textContent = '📨 Enviar pedido'; $err.textContent = x.message; }
      });
    },
  });
}

/** Familia (Papás): sus pedidos con el estado de cada uno. */
export async function pintarMisPedidos(el, ctx) {
  const lista = await datos.pedidos().catch(() => []);
  if (!lista.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<section class="card" style="margin-top:14px"><h2>📚 Tus pedidos</h2>
    <div class="tabla">${lista.slice(0, 6).map((p) => {
      const m = mat(p.materia);
      return `<div class="tabla-fila"><span class="av" style="background:${m.color}">${m.emoji}</span>
        <span><b>${esc(m.nombre)}${p.nino ? ` · ${esc(p.nino.nombre)}` : ''}</b><small>${esc(p.temas.slice(0, 70) || plural(p.fotos.length, 'foto', 'fotos'))}${p.temas.length > 70 ? '…' : ''} · ${fechaBonita(p.creado)}</small></span>
        <span class="lado-der">${chipEstado(p.estado)}${p.estado === 'nuevo' ? `<button class="link peq" data-cancelar="${esc(p.id)}">Cancelar</button>` : ''}</span></div>`;
    }).join('')}</div></section>`;
  el.querySelectorAll('[data-cancelar]').forEach((b) => b.addEventListener('click', async () => {
    const ok = await confirmar({ titulo: '¿Cancelar este pedido?', texto: 'El equipo ya no lo verá. Puedes volver a pedirlo cuando quieras.', si: 'Cancelar pedido', no: 'Dejarlo', peligro: true });
    if (!ok) return;
    try { await datos.borrarPedido(lista.find((p) => p.id === b.dataset.cancelar)); aviso('Pedido cancelado.', { emoji: '🗑️' }); pintarMisPedidos(el, ctx); }
    catch (x) { aviso(x.message, { emoji: '⚠️' }); }
  }));
}

// --- Equipo: #/equipo/pedidos -----------------------------------------------------------------
const FILTROS = [
  { id: 'abiertos', nombre: 'Por hacer', ve: (p) => p.estado !== 'listo' },
  { id: 'nuevo', nombre: '🆕 Nuevos', ve: (p) => p.estado === 'nuevo' },
  { id: 'en_proceso', nombre: '🛠️ En proceso', ve: (p) => p.estado === 'en_proceso' },
  { id: 'listo', nombre: '✅ Listos', ve: (p) => p.estado === 'listo' },
  { id: 'todos', nombre: 'Todos', ve: () => true },
];
let filtroGuardado = 'abiertos';

export async function render(root, ctx) {
  const [lista, resumen, sinLeerEquipo] = await Promise.all([datos.pedidos(), datos.chatResumen().catch(() => []), datos.equipoSinLeer().catch(() => 0)]);
  const sinLeer = resumen.reduce((n, r) => n + r.sinLeer, 0);
  let filtro = filtroGuardado;

  root.innerHTML = `
    <div class="cabecera"><div><h1>✉️ Mensajes</h1><p class="bajada">Las familias piden lecciones con temas y fotos. Tómalas, ármalas y avísales cuando estén listas.</p></div></div>
    ${pestanasMensajes('pedidos', sinLeer, sinLeerEquipo)}
    <div class="filtros" role="group" aria-label="Filtrar pedidos" id="filtros"></div>
    <div class="pedidos" id="pedidos"></div>`;

  const pintar = () => {
    root.querySelector('#filtros').innerHTML = FILTROS.map((f) => {
      const n = lista.filter(f.ve).length;
      return `<button data-filtro="${f.id}" aria-pressed="${f.id === filtro}">${f.nombre}${f.id !== 'todos' && n ? ` · ${n}` : ''}</button>`;
    }).join('');
    const vis = lista.filter(FILTROS.find((f) => f.id === filtro).ve);
    root.querySelector('#pedidos').innerHTML = vis.length ? vis.map(tarjeta).join('')
      : vacio({ emoji: '📚', titulo: lista.length ? 'Nada por aquí' : 'Aún no hay pedidos', texto: lista.length ? 'Prueba con otro filtro.' : 'Cuando una familia pida una lección (desde el chat o desde Papás), aparece aquí con sus fotos y te llega la notificación.' });
    llenarMiniaturas(root.querySelector('#pedidos'));
  };

  root.querySelector('#filtros').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filtro]');
    if (!b) return;
    filtro = filtroGuardado = b.dataset.filtro;
    pintar();
  });
  root.querySelector('#pedidos').addEventListener('click', async (e) => {
    const card = e.target.closest('[data-pedido]');
    if (!card) return;
    const p = lista.find((x) => x.id === card.dataset.pedido);
    const foto = e.target.closest('[data-ruta]');
    if (foto) return abrirVisor(p.fotos, Number(foto.dataset.i));
    const est = e.target.closest('[data-estado]');
    if (est) return cambiarEstado(p, est.dataset.estado, () => ctx.refrescar());
    if (e.target.closest('[data-borrar]')) {
      const ok = await confirmar({ titulo: '¿Borrar este pedido?', texto: `Se borran también sus fotos. ${p.estado === 'listo' ? 'Como ya está lista, no se pierde nada importante.' : 'Aún no está lista: la familia no recibe ningún aviso.'}`, si: 'Borrar', peligro: true });
      if (!ok) return;
      try { await datos.borrarPedido(p); aviso('Pedido borrado.', { emoji: '🗑️' }); ctx.refrescar(); } catch (x) { aviso(x.message, { emoji: '⚠️' }); }
    }
  });
  pintar();
}

function tarjeta(p) {
  const m = mat(p.materia);
  const n = p.nino;
  return `<article class="card pedido" data-pedido="${esc(p.id)}">
    <header class="pedido-cab">
      <span class="av" style="background:${esc(n?.color || m.color)}">${esc(n?.avatar || m.emoji)}</span>
      <div><b>${n ? `Para ${esc(n.nombre)}` : 'Pedido de lección'}</b><small>${esc(p.familiaNombre || 'Familia')} · ${fechaBonita(p.creado)}</small></div>
      ${chipEstado(p.estado)}
    </header>
    <div class="fila envolver"><span class="chip" style="background:${m.color};color:#1f2544">${m.emoji} ${esc(m.nombre)}</span>${chipPara(p.para, p.estado)}</div>
    ${p.temas ? `<p class="pedido-temas">${esc(p.temas).replace(/\n/g, '<br>')}</p>` : ''}
    ${miniaturas(p.fotos)}
    ${p.estado !== 'nuevo' && p.atendidoNombre ? `<p class="suave peq">${p.estado === 'listo' ? '✅ La armó' : '🛠️ La está armando'} ${esc(p.atendidoNombre)} · ${fechaBonita(p.actualizado)}</p>` : ''}
    <footer class="fila envolver pedido-acciones">
      ${p.estado === 'nuevo' ? '<button class="btn btn-peq btn-sol" data-estado="en_proceso">🛠️ Yo la armo</button>' : ''}
      ${p.estado !== 'listo' ? '<button class="btn btn-peq btn-verde" data-estado="listo">✅ Marcar lista</button>' : '<button class="btn btn-peq btn-blanco" data-estado="en_proceso">↩️ Reabrir</button>'}
      ${p.ninoId ? `<a class="btn btn-peq btn-blanco" href="#/equipo/subir/${esc(p.ninoId)}">⬆️ Subir lección</a>` : ''}
      <a class="btn btn-peq btn-blanco" href="#/equipo/chat/${esc(p.familiaId)}">💬 Chat</a>
      <button class="btn-redondo peq" data-borrar aria-label="Borrar pedido" title="Borrar pedido">🗑️</button>
    </footer>
  </article>`;
}

/** Cambia el estado y (si se quiere) le escribe a la familia por el chat: le llega la notificación. */
function cambiarEstado(p, estado, alCambiar) {
  const m = mat(p.materia);
  const para = p.nino ? ` para ${p.nino.nombre}` : '';
  const reabrir = p.estado === 'listo';
  const texto = estado === 'listo'
    ? `✅ ¡Ya está lista la lección de ${m.nombre}${para}! La encuentran en Learnground. 🐬`
    : `🛠️ ¡Hola! Ya estamos armando la lección de ${m.nombre}${para}. Les avisamos por aquí cuando esté lista.`;
  abrirHoja({
    titulo: reabrir ? 'Reabrir el pedido' : estado === 'listo' ? '✅ Marcar como lista' : '🛠️ Tomar el pedido',
    cuerpo: `${estado === 'listo' ? `<p>${p.ninoId ? 'Recuerda subir la lección antes (botón «Subir lección»).' : 'Recuerda subir la lección antes.'}</p>` : reabrir ? '<p class="suave">Vuelve a «En proceso». Si quieres, cuéntale a la familia por qué.</p>' : '<p class="suave">Queda a tu nombre para que el resto del equipo sepa que tú la armas.</p>'}
      <label class="check-fam" style="margin-top:6px"><input type="checkbox" id="eAvisar" ${reabrir ? '' : 'checked'}> Escribirle a la familia por el chat</label>
      <div class="campo" id="eCaja" ${reabrir ? 'hidden' : ''}><textarea id="eTexto" rows="3" maxlength="1000">${reabrir ? '' : esc(texto)}</textarea><small>Le llega como notificación.</small></div>
      <p class="error" id="eErr" role="alert"></p>`,
    pie: `<button class="btn ${estado === 'listo' ? 'btn-verde' : 'btn-sol'}" data-ok>${reabrir ? 'Reabrir' : estado === 'listo' ? 'Marcar lista' : 'Tomarlo'}</button>`,
    montar: (el) => {
      const $avisar = el.querySelector('#eAvisar');
      $avisar.addEventListener('change', () => { el.querySelector('#eCaja').hidden = !$avisar.checked; });
      el.querySelector('[data-ok]').addEventListener('click', async (e) => {
        const msg = el.querySelector('#eTexto').value.trim();
        if ($avisar.checked && !msg) { el.querySelector('#eErr').textContent = 'Escribe el mensaje o quita la casilla.'; return; }
        e.target.disabled = true;
        try {
          await datos.cambiarEstadoPedido(p.id, estado);
          if ($avisar.checked) await datos.enviarChat({ familiaId: p.familiaId, texto: msg, pedidoId: p.id });
          cerrarHoja();
          if (estado === 'listo' && !reabrir) confeti(60);
          aviso(estado === 'listo' ? '¡Pedido listo!' : reabrir ? 'Pedido reabierto.' : 'El pedido quedó a tu nombre.', { emoji: estado === 'listo' ? '✅' : '🛠️' });
          alCambiar();
        } catch (x) { e.target.disabled = false; el.querySelector('#eErr').textContent = x.message; }
      });
    },
  });
}
