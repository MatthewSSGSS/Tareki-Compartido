// =============================================================================
// main.js — Arranque de la app, menú y navegación entre pantallas.
//
// Las rutas usan el "#" de la URL:
//   Públicas:  #/entrar   #/registro/<código>
//   Familia:   #/perfiles  #/inicio  #/logros  #/papas  #/leccion/<id>
//   Equipo:    #/equipo  #/equipo/subir  #/equipo/ninos  #/equipo/codigos  #/papas/<niñoId>
// Cada pantalla es un módulo en js/vistas/ con `render(root, ctx)` (puede ser async
// y puede devolver una función de limpieza que se llama al salir de la pantalla).
// =============================================================================

import * as datos from './datos.js';
import { MODO_DEMO } from './config.js';
import { leerLocal, guardarLocal, esc, primerNombre } from './util.js';
import { abrirHoja, cerrarHoja, hojaAbierta, aviso, animarPantalla } from './ui.js';
import * as ingreso from './vistas/ingreso.js';
import * as perfiles from './vistas/perfiles.js';
import * as inicio from './vistas/inicio.js';
import * as logros from './vistas/logros.js';
import * as papas from './vistas/papas.js';
import * as leccion from './vistas/leccion.js';
import * as equipo from './vistas/equipo.js';
import * as accesoVista from './vistas/acceso.js';
import * as chatVista from './vistas/chat.js';
import { estadoAcceso } from './acceso.js';
import { registrarServiceWorker, revisarAvisos, desactivarAvisos } from './avisos.js';
import { abrirMiNombre } from './cuenta.js';
import { aplicarTema, abrirApariencia } from './apariencia.js';

const RUTAS = {
  entrar:   { vista: ingreso, publica: true },
  registro: { vista: ingreso, publica: true },
  perfiles: { vista: perfiles, rol: 'familia', sinMenu: true },
  inicio:   { vista: inicio, rol: 'familia', perfil: true, nav: 'inicio' },
  logros:   { vista: logros, rol: 'familia', perfil: true, nav: 'logros' },
  papas:    { vista: papas, nav: 'papas' },
  leccion:  { vista: leccion, pantallaCompleta: true },
  equipo:   { vista: equipo, rol: 'equipo' },
  acceso:   { vista: accesoVista, rol: 'familia', sinMenu: true },
  chat:     { vista: chatVista, rol: 'familia', nav: 'papas' },
};

const CLAVE_PERFIL = 'tareki:perfil';
const $vista = document.getElementById('vista');
const $menu = document.getElementById('menu');
let rutaAnterior = '';
let turno = 0;
let limpiar = null;
let avisosRevisados = false;

export const perfilActivo = () => leerLocal(CLAVE_PERFIL, null);
export const elegirPerfil = (id) => guardarLocal(CLAVE_PERFIL, id);

function leerRuta() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { nombre: partes[0] || '', params: partes.slice(1), clave: location.hash };
}

export function navegar(hash) {
  if (location.hash === hash) render(); else location.hash = hash;
}

/** A dónde va cada quien cuando entra. */
async function inicioDe(u) {
  if (!u) return '#/entrar';
  if (u.rol === 'equipo') return '#/equipo';
  if (!estadoAcceso(u).activo) return '#/acceso';
  const id = perfilActivo();
  const lista = await datos.ninos();
  return lista.some((n) => n.id === id) ? '#/inicio' : '#/perfiles';
}

async function render() {
  const mio = ++turno;
  const ruta = leerRuta();
  const def = RUTAS[ruta.nombre];
  const u = await datos.usuario();

  if (!def) return navegar(await inicioDe(u));
  if (!u && !def.publica) return navegar('#/entrar');
  if (u && def.publica) return navegar(await inicioDe(u));
  if (def.rol && u.rol !== def.rol) return navegar(await inicioDe(u));
  // Familia con el acceso vencido o suspendido: solo la pantalla de pago (sus datos siguen guardados)
  if (u?.rol === 'familia') {
    const activo = estadoAcceso(u).activo;
    // (el chat sigue abierto: así pueden hablar con el equipo sobre el pago)
    if (!activo && ruta.nombre !== 'acceso' && ruta.nombre !== 'chat') return navegar('#/acceso');
    if (activo && ruta.nombre === 'acceso') return navegar(await inicioDe(u));
  }

  let perfil = null;
  if (u?.rol === 'familia') {
    const lista = await datos.ninos();
    perfil = lista.find((n) => n.id === perfilActivo()) || null;
    if (def.perfil && !perfil) return navegar('#/perfiles');
  }

  limpiar?.(); limpiar = null;
  if (hojaAbierta()) cerrarHoja();

  const ctx = { params: ruta.params, usuario: u, perfil, navegar, refrescar: render, elegirPerfil, salir };
  const root = document.createElement('div');
  root.className = `pantalla pantalla-${ruta.nombre}`;
  let fin;
  try {
    fin = await def.vista.render(root, ctx);
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="card centro pila"><div style="font-size:56px">🙈</div><h2>Algo salió mal</h2><p class="suave">${esc(e.message || 'Intenta de nuevo.')}</p><a class="btn" href="#/">Volver al inicio</a></div>`;
  }
  if (mio !== turno) { if (typeof fin === 'function') fin(); return; } // ya se pidió otra pantalla

  document.body.classList.toggle('sin-menu', !!def.publica || !!def.sinMenu);
  document.body.classList.toggle('en-leccion', !!def.pantallaCompleta);
  const subEquipo = ruta.params[0] === 'familia' ? 'familias' : ruta.params[0] === 'chat' || ruta.params[0] === 'interno' ? 'mensajes' : ruta.params[0] || 'resumen';
  pintarMenu(u, perfil, def.nav || (ruta.nombre === 'equipo' ? `equipo-${subEquipo}` : ''));
  $vista.replaceChildren(root);
  if (ruta.clave !== rutaAnterior) animarPantalla(root); // solo al cambiar de pantalla, no al refrescar
  limpiar = typeof fin === 'function' ? fin : null;
  if (ruta.clave !== rutaAnterior) { window.scrollTo(0, 0); rutaAnterior = ruta.clave; }
  if (u && datos.estaRecuperando()) pedirClaveNueva();
  if (u && !avisosRevisados) { avisosRevisados = true; revisarAvisos(); datos.marcarIngreso().catch(() => {}); }
  if (u) contarSinLeer(u);
}

/** Puntico con los mensajes de chat sin leer en el menú (Mensajes para el equipo, Papás para la familia). */
async function contarSinLeer(u) {
  const n = (await datos.chatSinLeer().catch(() => 0)) + (u.rol === 'equipo' ? await datos.equipoSinLeer().catch(() => 0) : 0);
  const a = $menu.querySelector(u.rol === 'equipo' ? 'a[href="#/equipo/chat"]' : 'a[href="#/papas"]');
  if (!a) return;
  a.querySelector('.punto-menu')?.remove();
  if (n) a.insertAdjacentHTML('beforeend', `<span class="punto-menu" aria-label="${n} sin leer">${n > 9 ? '9+' : n}</span>`);
}

/** Llegó del correo "Olvidé mi contraseña": ya entró, falta escoger la clave nueva. */
function pedirClaveNueva() {
  if (document.querySelector('#claveNueva')) return;
  abrirHoja({
    titulo: 'Crea tu contraseña nueva',
    cuerpo: `<div class="campo"><label for="claveNueva">Contraseña nueva</label><input id="claveNueva" type="password" autocomplete="new-password" minlength="8" autofocus><small>Mínimo 8 caracteres.</small></div><p class="error" id="cnErr" role="alert"></p>`,
    pie: '<button class="btn btn-verde" data-guardar>Guardar</button>',
    montar: (el) => el.querySelector('[data-guardar]').addEventListener('click', async () => {
      try {
        await datos.cambiarClave(el.querySelector('#claveNueva').value);
        cerrarHoja();
        aviso('Contraseña cambiada.', { emoji: '🔑' });
      } catch (x) { el.querySelector('#cnErr').textContent = x.message; }
    }),
  });
}

// --- Menú: abajo en celular, a la izquierda en computador -------------------------------
function pintarMenu(u, perfil, activo) {
  if (!u) { $menu.innerHTML = ''; return; }
  const item = (id, href, emoji, texto) =>
    `<a href="${href}" class="${id === activo ? 'activo' : ''}" ${id === activo ? 'aria-current="page"' : ''}><span class="mi-emoji" aria-hidden="true">${emoji}</span><span>${texto}</span></a>`;
  const items = u.rol === 'equipo'
    ? item('equipo-resumen', '#/equipo', '📊', 'Resumen') + item('equipo-subir', '#/equipo/subir', '⬆️', 'Subir')
      + item('equipo-familias', '#/equipo/familias', '👨‍👩‍👧', 'Familias') + item('equipo-mensajes', '#/equipo/chat', '✉️', 'Mensajes') + item('equipo-ninos', '#/equipo/ninos', '🧒', 'Niños') + item('equipo-codigos', '#/equipo/codigos', '🎟️', 'Códigos')
    : item('inicio', '#/inicio', '🏠', 'Inicio') + item('logros', '#/logros', '🏅', 'Logros')
      + item('papas', '#/papas', '👨‍👩‍👧', 'Papás') + `<a href="#/perfiles" class="solo-cel"><span class="mi-emoji" aria-hidden="true">${perfil ? esc(perfil.avatar) : '🔄'}</span><span>Cambiar</span></a>`;
  const tarjeta = u.rol === 'equipo'
    ? `<button type="button" class="menu-perfil" data-mi-nombre title="Cambiar mi nombre"><span class="av" style="background:var(--purple-s)">🧑‍🏫</span><span><b>${esc(u.nombre)}</b><small>✏️ Cambiar nombre</small></span></button>`
    : perfil ? `<a class="menu-perfil" href="#/perfiles" title="Cambiar de perfil"><span class="av" style="background:${esc(perfil.color)}">${esc(perfil.avatar)}</span><span><b>${esc(perfil.nombre)}</b><small>Cambiar de perfil</small></span></a>` : '';
  $menu.innerHTML = `
    <a class="menu-marca" href="#/"><img class="marca-logo" src="img/lulo-128.png" alt="" aria-hidden="true"><span class="marca-nombre">Learn<b>ground</b></span></a>
    ${tarjeta}
    <div class="menu-items">${items}</div>
    <div class="menu-pie">
      <button class="menu-item" type="button" data-apariencia><span class="mi-emoji" aria-hidden="true">🎨</span><span>Apariencia</span></button>
      <button class="menu-item" type="button" data-salir><span class="mi-emoji" aria-hidden="true">🚪</span><span>Salir</span></button>
    </div>`;
}
// En computador la tarjeta del perfil ya permite cambiar: ocultar el botón extra.
const estiloCel = document.createElement('style');
estiloCel.textContent = '@media (min-width: 900px) { .menu .solo-cel { display: none !important; } }';
document.head.appendChild(estiloCel);

$menu.addEventListener('click', async (e) => {
  if (e.target.closest('[data-apariencia]')) abrirApariencia();
  if (e.target.closest('[data-salir]')) salir();
  if (e.target.closest('[data-mi-nombre]')) abrirMiNombre(await datos.usuario(), () => render());
});

export async function salir() {
  await desactivarAvisos(); // este dispositivo deja de recibir los avisos de esta cuenta
  avisosRevisados = false;
  await datos.salir();
  elegirPerfil(null);
  aviso('Sesión cerrada. ¡Hasta pronto!', { emoji: '👋' });
  navegar('#/entrar');
}

// --- Tema claro / oscuro ----------------------------------------------------------------
// (tema y brillo: js/apariencia.js)

// --- Arranque -----------------------------------------------------------------------------
window.addEventListener('hashchange', render);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') datos.olvidarPerfil(); });
registrarServiceWorker();
aplicarTema();
render();

if (MODO_DEMO) console.info('Learnground en modo demostración: los datos viven solo en este navegador.');
