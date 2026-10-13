// =============================================================================
// chat.js — Conversación entre cada familia y el equipo.
//   Familia: #/chat                 (su conversación con todo el equipo)
//   Equipo:  #/equipo/chat          (lista de conversaciones)
//            #/equipo/chat/<id>     (conversación con una familia)
//            #/equipo/interno       (chat interno del equipo; las familias no lo ven)
//            #/equipo/pedidos       (pedidos de lecciones: vistas/pedidos.js)
// Se revisa si hay mensajes nuevos cada 8 segundos mientras la pantalla está abierta.
// =============================================================================

import * as datos from '../datos.js';
import { esc, fechaBonita, plano, primerNombre } from '../util.js';
import { aviso, vacio, abrirHoja } from '../ui.js';
import { linkWa, numeroWa } from '../whatsapp.js';
import { abrirPedir, abrirVisor, chipEstado, llenarMiniaturas, miniaturas } from './pedidos.js';

const hora = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

/** Pestañas de la sección Mensajes del equipo (chat, equipo, pedidos y avisos). */
export const pestanasMensajes = (activa, sinLeer = 0, sinLeerEquipo = 0) => {
  // El número de pedidos nuevos llega después (así ninguna pantalla tiene que pedirlo)
  setTimeout(() => datos.pedidosNuevos().then((n) => document.querySelectorAll('[data-n-pedidos]').forEach((el) => { el.textContent = n; el.hidden = !n; })).catch(() => {}), 0);
  // En el celular, que la pestaña abierta quede a la vista
  setTimeout(() => { const t = document.querySelector('.pestanas-pagina [aria-selected="true"]'); if (t) t.parentElement.scrollLeft = t.offsetLeft - 12; }, 0);
  return `
  <div class="pestanas-pagina" role="tablist">
    <a href="#/equipo/chat" role="tab" aria-selected="${activa === 'chat'}">💬 Familias${sinLeer ? ` <span class="chip rosa">${sinLeer}</span>` : ''}</a>
    <a href="#/equipo/interno" role="tab" aria-selected="${activa === 'equipo'}">👥 Equipo${sinLeerEquipo ? ` <span class="chip rosa">${sinLeerEquipo}</span>` : ''}</a>
    <a href="#/equipo/pedidos" role="tab" aria-selected="${activa === 'pedidos'}">📚 Pedidos <span class="chip rosa" data-n-pedidos hidden></span></a>
    <a href="#/equipo/mensajes" role="tab" aria-selected="${activa === 'avisos'}">📢 Avisos</a>
  </div>`;
};

/** Conversación de una familia con el equipo (lo que necesita la vista genérica). */
const fuenteFamilia = (familiaId) => ({
  cargar: () => datos.chat(familiaId),
  enviar: (texto) => datos.enviarChat({ familiaId, texto }),
  marcar: () => datos.marcarChatLeido(familiaId),
});

// --- Familia ------------------------------------------------------------------------------
export async function render(root, ctx) {
  const cobro = await datos.ajustesCobro().catch(() => ({}));
  return hilo(root, ctx, {
    ...fuenteFamilia(ctx.usuario.id),
    titulo: 'Chat con el equipo',
    bajada: 'Escríbenos aquí: tu mensaje le llega a todo el equipo de Learnground.',
    volver: '#/papas',
    whatsapp: numeroWa(cobro.whatsapp) ? { numero: cobro.whatsapp, texto: `Hola 👋 Soy ${ctx.usuario.nombre}, de Learnground.`, etiqueta: '¿Urgente? WhatsApp' } : null,
    acciones: '<button type="button" class="btn btn-peq btn-sol" data-pedir>📚 Pedir una lección</button><small class="suave">Temas y fotos del cuaderno: nosotros la armamos.</small>',
  }).then((fin) => {
    root.querySelector('[data-pedir]')?.addEventListener('click', () => abrirPedir(ctx, { alEnviar: () => ctx.refrescar() }));
    return fin;
  });
}

// --- Equipo: lista de conversaciones --------------------------------------------------------
export async function lista(root, ctx) {
  const [resumen, familias, sinLeerEquipo] = await Promise.all([datos.chatResumen(), datos.familiasResumen(), datos.equipoSinLeer().catch(() => 0)]);
  const nombre = (id) => familias.find((f) => f.id === id)?.nombre || 'Familia';
  const filas = resumen.sort((a, b) => b.creado.localeCompare(a.creado));
  const sinLeer = filas.reduce((s, r) => s + r.sinLeer, 0);

  root.innerHTML = `
    <div class="cabecera"><div><h1>✉️ Mensajes</h1><p class="bajada">Lo que escriben las familias le llega a todo el equipo.</p></div>
      <button class="btn" data-nuevo>💬 Escribir a una familia</button></div>
    ${pestanasMensajes('chat', sinLeer, sinLeerEquipo)}
    <input type="search" id="buscar" placeholder="Buscar familia…" aria-label="Buscar" style="margin:4px 0 14px">
    <div class="tabla" id="tabla"></div>`;

  const pintar = () => {
    const t = plano(root.querySelector('#buscar').value);
    const vis = filas.filter((r) => !t || plano(nombre(r.familiaId)).includes(t));
    root.querySelector('#tabla').innerHTML = vis.length ? vis.map((r) => `
      <a class="tabla-fila chat-fila ${r.sinLeer ? 'sin-leer' : ''}" href="#/equipo/chat/${esc(r.familiaId)}">
        <span class="av" style="background:var(--sun-s)">👨‍👩‍👧</span>
        <span><b>${esc(nombre(r.familiaId))}</b><small>${r.deEquipo ? 'Tú: ' : ''}${esc(r.ultimo.slice(0, 80))}${r.ultimo.length > 80 ? '…' : ''}</small></span>
        <span class="lado-der"><small class="suave">${fechaBonita(r.creado)}</small>${r.sinLeer ? `<span class="chip rosa">${r.sinLeer}</span>` : ''}</span>
      </a>`).join('') : vacio({ emoji: '💬', titulo: filas.length ? 'Ninguna conversación con ese nombre' : 'Aún no hay conversaciones', texto: filas.length ? '' : 'Cuando una familia escriba, aparece aquí. También puedes escribirle tú primero.' });
  };
  root.querySelector('#buscar').addEventListener('input', pintar);
  root.querySelector('[data-nuevo]').addEventListener('click', () => {
    abrirHoja({
      titulo: '¿A qué familia le escribes?',
      cuerpo: `<div class="elegir-familias" style="max-height:none">${familias.length ? familias.map((f) => `<a class="check-fam" href="#/equipo/chat/${esc(f.id)}">👨‍👩‍👧 ${esc(f.nombre)}</a>`).join('') : '<p class="suave">Aún no hay familias.</p>'}</div>`,
    });
  });
  pintar();
}

// --- Equipo: conversación con una familia ---------------------------------------------------
export async function hiloEquipo(root, ctx) {
  const id = ctx.params[1];
  const familias = await datos.familiasResumen();
  const f = familias.find((x) => x.id === id);
  if (!f) { root.innerHTML = vacio({ emoji: '🤷', titulo: 'No encontramos esa familia', accion: '<a class="btn" href="#/equipo/chat">Volver</a>' }); return; }
  return hilo(root, ctx, {
    ...fuenteFamilia(id),
    titulo: f.nombre,
    bajada: `<a href="#/equipo/familia/${esc(id)}">Ver su ficha →</a>`,
    volver: '#/equipo/chat',
    whatsapp: numeroWa(f.celular) ? { numero: f.celular, texto: `Hola ${primerNombre(f.nombre)} 👋 `, etiqueta: 'WhatsApp' } : null,
  });
}

// --- La conversación (igual para los dos lados) ----------------------------------------------
async function hilo(root, ctx, { cargar, enviar: enviarMensaje, marcar, titulo, bajada, volver, whatsapp, interno = false, arriba = '', acciones = '' }) {
  const yo = ctx.usuario;
  // En el chat interno todo es del equipo: "mío" es lo que escribí yo
  const esMio = (m) => (interno ? m.autor === yo.id : yo.rol === 'equipo' ? m.deEquipo : !m.deEquipo);
  let mensajes = await cargar();
  marcar().catch(() => {});

  root.innerHTML = `${arriba}
    <div class="chat">
      <header class="chat-cab">
        <a class="btn-redondo" href="${volver}" aria-label="Volver">←</a>
        <div class="chat-titulo"><b>${esc(titulo)}</b><small>${bajada}</small></div>
        ${whatsapp ? `<a class="btn btn-peq btn-wa" href="${esc(linkWa(whatsapp.numero, whatsapp.texto))}" target="_blank" rel="noopener">💬 ${esc(whatsapp.etiqueta)}</a>` : ''}
      </header>
      <div class="chat-mensajes" id="lista" aria-live="polite"></div>
      ${acciones ? `<div class="chat-acciones">${acciones}</div>` : ''}
      <form class="chat-escribir" id="form">
        <textarea id="texto" rows="1" maxlength="1000" placeholder="Escribe un mensaje…" aria-label="Mensaje"></textarea>
        <button class="btn btn-verde" type="submit" aria-label="Enviar">➤</button>
      </form>
    </div>`;

  const $lista = root.querySelector('#lista');
  const $texto = root.querySelector('#texto');

  function pintar() {
    if (!mensajes.length) {
      $lista.innerHTML = `<div class="chat-vacio">${interno ? 'Este es el chat del equipo: coordínense aquí. Las familias no lo ven.' : yo.rol === 'equipo' ? 'Aún no hay mensajes con esta familia. ¡Salúdala!' : '¡Hola! 👋 ¿En qué te podemos ayudar? Escribe abajo y el equipo te responde aquí.'}</div>`;
      return;
    }
    let dia = '';
    $lista.innerHTML = mensajes.map((m) => {
      const d = fechaBonita(m.creado);
      const sep = d !== dia ? `<div class="chat-dia"><span>${d}</span></div>` : '';
      dia = d;
      const quien = interno
        ? (esMio(m) ? '' : `<span class="chat-autor">${esc(m.autorNombre || 'Equipo')}</span>`)
        : !esMio(m) && m.deEquipo ? `<span class="chat-autor">${esc(primerNombre(m.autorNombre) || 'Equipo')} · equipo</span>` : (esMio(m) && yo.rol === 'equipo' && m.autor !== yo.id ? `<span class="chat-autor">${esc(m.autorNombre)}</span>` : '');
      // El mensaje con que la familia pidió una lección lleva el estado y las fotos
      const pedido = m.pedido && !m.deEquipo
        ? `<div class="pedido-chat" data-pedido-fotos="${esc(m.pedido.id)}">${chipEstado(m.pedido.estado)}${yo.rol === 'equipo' ? ' <a href="#/equipo/pedidos" class="peq">Ver en Pedidos →</a>' : ''}${miniaturas(m.pedido.fotos)}</div>` : '';
      return `${sep}<div class="burbuja ${esMio(m) ? 'mia' : 'suya'}">${quien}<p>${esc(m.texto).replace(/\n/g, '<br>')}</p>${pedido}<small>${hora(m.creado)}${esMio(m) && m.leido ? ' · ✓✓' : ''}</small></div>`;
    }).join('');
    alFondo();
    llenarMiniaturas($lista);
  }

  // Al último mensaje (también cuando la pantalla termina de aparecer)
  function alFondo() {
    $lista.scrollTop = $lista.scrollHeight;
    requestAnimationFrame(() => { $lista.scrollTop = $lista.scrollHeight; });
    setTimeout(() => { $lista.scrollTop = $lista.scrollHeight; }, 400);
  }

  async function enviar() {
    const texto = $texto.value.trim();
    if (!texto) return;
    $texto.value = ''; $texto.style.height = '';
    try {
      const m = await enviarMensaje(texto);
      mensajes.push(m); pintar();
      if (yo.rol === 'equipo' && m.notificacion) mostrarEntrega(m.notificacion);
    } catch (x) { $texto.value = texto; aviso(x.message, { emoji: '⚠️' }); }
  }

  /** Debajo del último mensaje: si la notificación le llegó a la familia o no. */
  async function mostrarEntrega(promesa) {
    const r = await promesa;
    const burbuja = [...$lista.querySelectorAll('.burbuja.mia')].at(-1);
    if (!burbuja || !r) return;
    const nota = document.createElement('div');
    nota.className = 'entrega';
    if (r.demo) nota.textContent = '🧪 En la demostración no se envían notificaciones.';
    else if (interno && !r.llego) nota.textContent = r.enviados > 0 ? `🔔 Notificación enviada a ${r.enviados} ${r.enviados === 1 ? 'dispositivo' : 'dispositivos'} del equipo.` : '🔕 Nadie más del equipo tiene los avisos activados.';
    else if (interno) {
      const lista = (x) => (x.length > 1 ? `${x.slice(0, -1).join(', ')} y ${x.at(-1)}` : x[0]);
      const partes = [];
      if (r.llego?.length) partes.push(`🔔 Les llegó a ${lista(r.llego)}`);
      if (r.noLlego?.length) { partes.push(`🔕 ${lista(r.noLlego)} no ${r.noLlego.length > 1 ? 'tienen' : 'tiene'} avisos activados`); nota.classList.add('no'); }
      if (!partes.length) partes.push('Eres la única persona del equipo por ahora.');
      nota.textContent = partes.join(' · ');
    } else if (r.enviados > 0) nota.textContent = `🔔 Notificación enviada a ${r.enviados === 1 ? 'su celular' : `${r.enviados} de sus dispositivos`}.`;
    else {
      nota.classList.add('no');
      nota.innerHTML = r.total ? '⚠️ No se pudo entregar la notificación (su dispositivo la rechazó). Lo verá al abrir la app.'
        : `🔕 Esta familia no tiene los avisos activados: lo verá cuando abra la app.${whatsapp ? ' Si es urgente, escríbele por WhatsApp.' : ''}`;
    }
    burbuja.after(nota);
    $lista.scrollTop = $lista.scrollHeight;
  }

  $lista.addEventListener('click', (e) => {
    const foto = e.target.closest('[data-ruta]');
    if (!foto) return;
    const id = foto.closest('[data-pedido-fotos]')?.dataset.pedidoFotos;
    const p = mensajes.find((m) => m.pedido?.id === id)?.pedido;
    if (p) abrirVisor(p.fotos, Number(foto.dataset.i));
  });
  root.querySelector('#form').addEventListener('submit', (e) => { e.preventDefault(); enviar(); });
  $texto.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(min-width: 700px)').matches) { e.preventDefault(); enviar(); } });
  $texto.addEventListener('input', () => { $texto.style.height = 'auto'; $texto.style.height = `${Math.min(140, $texto.scrollHeight)}px`; });
  pintar();

  // Mensajes nuevos del otro lado
  const reloj = setInterval(async () => {
    if (document.visibilityState !== 'visible') return;
    const nuevos = await cargar().catch(() => null);
    if (nuevos && (nuevos.length !== mensajes.length || nuevos.some((m, i) => m.leido !== mensajes[i]?.leido || m.pedido?.estado !== mensajes[i]?.pedido?.estado))) {
      mensajes = nuevos; pintar();
      marcar().catch(() => {});
    }
  }, 8000);
  return () => clearInterval(reloj);
}


// --- Equipo: chat interno -------------------------------------------------------------------
export async function interno(root, ctx) {
  const resumen = await datos.chatResumen().catch(() => []);
  const sinLeer = resumen.reduce((n, r) => n + r.sinLeer, 0);
  return hilo(root, ctx, {
    cargar: () => datos.chatEquipo(),
    enviar: (texto) => datos.enviarChatEquipo(texto),
    marcar: () => datos.marcarEquipoVisto(),
    titulo: '👥 Chat del equipo',
    bajada: 'Solo lo ven ustedes. A los demás les llega una notificación.',
    volver: '#/equipo',
    interno: true,
    arriba: `<div class="cabecera"><div><h1>✉️ Mensajes</h1></div></div>${pestanasMensajes('equipo', sinLeer)}<div class="avisos-equipo" id="avisosEquipo"></div>`,
  }).then((fin) => {
    datos.equipoConAvisos().then((miembros) => {
      const el = root.querySelector('#avisosEquipo');
      if (!el) return;
      const sabe = miembros.filter((m) => m.dispositivos !== null);
      if (!sabe.length) { el.remove(); return; }
      el.innerHTML = sabe.map((m) => `<span class="chip ${m.dispositivos.length ? 'verde' : 'rojo'}" title="${m.dispositivos.length ? 'Le llegan las notificaciones' : 'No ha activado los avisos'}">${m.dispositivos.length ? '🔔' : '🔕'} ${m.id === ctx.usuario?.id ? 'Tú' : esc(m.nombre)}</span>`).join('');
    }).catch(() => {});
    return fin;
  });
}
