// =============================================================================
// avisos.js — Activar notificaciones en este dispositivo e instalar la app.
//
// Dónde funcionan (Web Push):
//   • Android (Chrome, Samsung Internet, Edge, Firefox): sí, con o sin instalar.
//   • Computador (Chrome, Edge, Firefox; Safari en Mac 16+): sí.
//   • iPhone y iPad (iOS/iPadOS 16.4 o más nuevo): SOLO si Tareki está instalada en
//     la pantalla de inicio desde Safari y se abre desde ese ícono. Apple lo exige así.
//   • Navegadores dentro de WhatsApp, Instagram o Facebook: no; hay que abrir el link
//     en Safari o Chrome.
// =============================================================================

import * as datos from './datos.js';
import { VAPID_PUBLICA, MODO_DEMO } from './config.js';
import { esc } from './util.js';
import { aviso } from './ui.js';

const ua = navigator.userAgent;
export const esIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const esAndroid = /Android/.test(ua);
export const esInstalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const esNavegadorDeApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)/.test(ua);
// Solo el iPhone/iPad dice su versión así; un iPad en modo escritorio se hace pasar por Mac (y es nuevo)
const versionIOS = () => { const m = /iPhone|iPad|iPod/.test(ua) && ua.match(/OS (\d+)_(\d+)/); return m ? Number(m[1]) + Number(m[2]) / 100 : 99; };
const soportaPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// --- Instalar (Android y computador: el navegador avisa cuando se puede) -------------------
let pedidoInstalar = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalar = e; });
window.addEventListener('appinstalled', () => { pedidoInstalar = null; aviso('¡Tareki quedó instalada! Búscala en tu pantalla de inicio.', { emoji: '📲' }); });
export const puedeInstalar = () => !!pedidoInstalar;
export async function instalar() {
  if (!pedidoInstalar) return false;
  pedidoInstalar.prompt();
  const { outcome } = await pedidoInstalar.userChoice;
  pedidoInstalar = null;
  return outcome === 'accepted';
}

export function registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  // En iPhone la app instalada casi nunca se cierra: al volver, buscar versión nueva
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {});
  });
}

const b64aBytes = (b64) => {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
const nombreDispositivo = () => (esIOS ? (/iPad/.test(ua) ? 'iPad' : 'iPhone') : esAndroid ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Navegador');

/**
 * ¿En qué punto está este dispositivo?
 * @returns {'activos'|'apagados'|'bloqueados'|'instalar-ios'|'ios-viejo'|'abrir-navegador'|'no-soporta'}
 */
export async function estadoAvisos() {
  if (esNavegadorDeApp) return 'abrir-navegador';
  if (esIOS && versionIOS() < 16.4) return 'ios-viejo';
  if (esIOS && !esInstalada()) return 'instalar-ios';
  if (!soportaPush()) return 'no-soporta';
  if (Notification.permission === 'denied') return 'bloqueados';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'activos' : 'apagados';
}

/** Se inscribe en el servicio de avisos del navegador (Google, Apple, Microsoft o Mozilla).
 *  Si falla, reintenta una vez y luego explica en español qué revisar. */
async function suscribir(reg) {
  const opciones = { userVisibleOnly: true, applicationServerKey: b64aBytes(VAPID_PUBLICA) };
  try {
    return await reg.pushManager.subscribe(opciones);
  } catch {
    await new Promise((r) => setTimeout(r, 1500));
    try { return await reg.pushManager.subscribe(opciones); } catch (e) {
      console.error('Suscripción push', e);
      const edge = /Edg\//.test(ua);
      throw new Error(esIOS || esAndroid
        ? 'El servicio de avisos del teléfono no respondió. Revisa tu conexión a internet e intenta de nuevo en un momento.'
        : `${edge ? 'Edge' : 'El navegador'} no pudo conectarse al servicio de avisos. Revisa en Windows: Configuración → Sistema → Notificaciones (activadas, y también para ${edge ? 'Microsoft Edge' : 'tu navegador'}), actualiza el navegador y revisa que el antivirus o la VPN no lo bloqueen. También puedes probar con otro navegador.`);
    }
  }
}

/** Pide permiso y registra este dispositivo en la cuenta. Debe llamarse desde un toque. */
export async function activarAvisos() {
  if (MODO_DEMO) throw new Error('En la demostración no hay avisos reales.');
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error(permiso === 'denied' ? 'Los avisos quedaron bloqueados. Actívalos en la configuración del navegador.' : 'No se activaron los avisos.');
  const reg = await navigator.serviceWorker.register('sw.js');
  // Si el service worker no queda listo en 15 s, mejor avisar que quedarse esperando
  await Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error('La app no terminó de prepararse. Recarga la página e intenta de nuevo.')), 15000))]);
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await suscribir(reg);
  const j = sub.toJSON();
  await datos.registrarPush({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, dispositivo: nombreDispositivo() });
}

/** Deja de recibir avisos en este dispositivo (por ejemplo, al cerrar sesión). */
export async function desactivarAvisos() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await datos.quitarPush(sub.endpoint).catch(() => {});
    await sub.unsubscribe();
  } catch { /* nada */ }
}

/** Si el dispositivo ya tenía avisos, se asegura de que estén a nombre de esta cuenta. */
export async function revisarAvisos() {
  if (MODO_DEMO || !soportaPush() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    const j = sub.toJSON();
    await datos.registrarPush({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, dispositivo: nombreDispositivo() });
  } catch { /* se intenta la próxima vez */ }
}

// Si el aviso salió pero el dispositivo no lo muestra, casi siempre es una configuración del teléfono
const AYUDA = esIOS
  ? `<ul class="limpia"><li>Ve a <b>Configuración → Notificaciones → Tareki</b> y activa <b>Permitir notificaciones</b> (y «Pantalla bloqueada» y «Banners»).</li>
     <li>Revisa que no esté activo <b>No molestar</b> o un <b>Modo de concentración</b> (luna 🌙 en el Centro de control).</li>
     <li>Si sigue sin llegar: toca <b>Apagar en este dispositivo</b>, cierra Tareki por completo y vuelve a abrirla desde el ícono para activarlos otra vez.</li></ul>`
  : esAndroid
    ? `<ul class="limpia"><li>Abre <b>Ajustes → Aplicaciones → Chrome</b> (o el navegador que uses, o «Tareki» si la instalaste) <b>→ Notificaciones</b> y actívalas.</li>
       <li>En Chrome: toca el candado 🔒 junto a la dirección <b>→ Permisos → Notificaciones → Permitir</b>.</li>
       <li>Revisa que no esté activo <b>No molestar</b> ni el <b>ahorro de batería</b> extremo.</li>
       <li>Si sigue sin llegar: toca <b>Apagar en este dispositivo</b> y vuelve a activarlos.</li></ul>`
    : `<ul class="limpia"><li>En Windows: <b>Configuración → Sistema → Notificaciones</b> y activa las del navegador (Edge o Chrome). Revisa que el «Asistente de concentración» / «No molestar» esté apagado.</li>
       <li>En Mac: <b>Configuración del Sistema → Notificaciones →</b> tu navegador <b>→ Permitir</b>.</li>
       <li>El navegador debe estar abierto (aunque sea minimizado) para recibir avisos en el computador.</li></ul>`;

// --- Tarjeta para activar (papás y equipo) ---------------------------------------------------
// Los pasos cambian según la versión de iOS: en iOS 26 "Compartir" está dentro del menú ⋯
const PASOS_IOS = `<ol class="limpia pasos-ios">
  <li>Abre este link en <b>Safari</b> (si llegaste desde WhatsApp, también sirve).</li>
  <li>Toca <b>Compartir</b> <span aria-hidden="true">⬆️</span>. Si no lo ves, toca primero los <b>tres puntos ⋯</b> y luego <b>Compartir</b>.</li>
  <li>Baja en la lista y elige <b>«Agregar a inicio»</b> (o «Agregar a pantalla de inicio»).</li>
  <li>Si aparece <b>«Abrir como app web»</b>, déjalo <b>activado</b>. Toca <b>Agregar</b>.</li>
  <li>Cierra Safari y abre <b>Tareki desde el ícono</b> 🦉 de tu pantalla de inicio. Ahí te aparece el botón para activar los avisos.</li>
</ol>`;

const TEXTOS = {
  'activos': { emoji: '🔔', titulo: 'Avisos activados en este dispositivo', texto: 'Te avisamos cuando llegue una lección nueva y a las 6 p. m. si la racha está en peligro.' },
  'apagados': { emoji: '🔕', titulo: 'Activa los avisos', texto: 'Te avisamos cuando llegue una lección nueva y si la racha está en peligro. Así nadie se pierde un día.' },
  'bloqueados': { emoji: '🚫', titulo: 'Los avisos están bloqueados', texto: 'Este navegador los bloqueó. Toca el candado 🔒 junto a la dirección (o ve a Configuración → Notificaciones) y permite las notificaciones de Tareki. Luego recarga la página.' },
  'instalar-ios': { emoji: '📲', titulo: 'En iPhone, primero instala Tareki', texto: `Apple solo permite avisos si la app está en tu pantalla de inicio:${PASOS_IOS}` },
  'ios-viejo': { emoji: '📱', titulo: 'Este iPhone no puede recibir avisos', texto: 'Se necesita iOS 16.4 o más nuevo (Configuración → General → Actualización de software). Igual puedes usar Tareki normalmente.' },
  'abrir-navegador': { emoji: '🌐', titulo: 'Abre Tareki en tu navegador', texto: 'Estás dentro de WhatsApp u otra app. Toca los tres puntos ⋯ y elige «Abrir en el navegador» (Safari o Chrome) para activar los avisos.' },
  'no-soporta': { emoji: '😕', titulo: 'Este navegador no recibe avisos', texto: 'Prueba con Chrome, Edge, Firefox o Safari actualizados.' },
};

/** Lo que anotó el service worker del último aviso que llegó a este dispositivo. */
async function ultimoAviso() {
  try {
    const r = await (await caches.open('diagnostico-tareki')).match('./__ultimo-aviso');
    return r ? await r.json() : null;
  } catch { return null; }
}

/** Pinta la tarjeta de avisos dentro de `el` y conecta sus botones. */
export async function tarjetaAvisos(el) {
  const estado = MODO_DEMO ? 'demo' : await estadoAvisos();
  const t = estado === 'demo'
    ? { emoji: '🧪', titulo: 'Avisos (demostración)', texto: 'En la demostración no se envían avisos reales.' }
    : TEXTOS[estado];
  el.innerHTML = `<div class="card tarjeta-avisos ${estado}">
    <div class="fila" style="align-items:flex-start"><span class="em" aria-hidden="true">${t.emoji}</span>
      <div class="pila chica" style="flex:1;min-width:0"><b>${esc(t.titulo)}</b><div class="suave peq">${t.texto}</div>
      <div class="fila envolver">
        ${estado === 'apagados' ? '<button class="btn btn-verde btn-peq" data-activar>🔔 Activar avisos</button>' : ''}
        ${estado === 'activos' ? '<button class="btn btn-blanco btn-peq" data-probar>Enviar aviso de prueba</button><button class="link peq" data-apagar>Apagar en este dispositivo</button>' : ''}
        ${puedeInstalar() && !esInstalada() ? '<button class="btn btn-sol btn-peq" data-instalar>📲 Instalar Tareki</button>' : ''}
      </div>
      <div class="diag-avisos" hidden></div>
      ${estado === 'activos' ? `<details class="ayuda-avisos"><summary>¿No te llegó el aviso de prueba?</summary>${AYUDA}</details>` : ''}
      </div></div></div>`;
  const repintar = () => tarjetaAvisos(el);
  el.querySelector('[data-activar]')?.addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = 'Activando…';
    // Algunos navegadores (Edge, Chrome) esconden la pregunta en una campanita junto a la dirección
    const pista = setTimeout(() => {
      e.target.textContent = '☝️ Toca «Permitir» arriba';
      aviso('Si no ves la pregunta, busca la campanita 🔔 o el candado 🔒 junto a la dirección y elige «Permitir».', { emoji: '👆', ms: 10000 });
    }, 3000);
    try { await activarAvisos(); aviso('¡Avisos activados! Toca «Enviar aviso de prueba» para revisar.', { emoji: '🔔', ms: 5000 }); }
    catch (x) { aviso(x.message, { emoji: '⚠️', ms: 6000 }); }
    clearTimeout(pista);
    repintar();
  });
  el.querySelector('[data-probar]')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    const diag = el.querySelector('.diag-avisos');
    const linea = (txt) => { diag.hidden = false; diag.insertAdjacentHTML('beforeend', `<div>${txt}</div>`); };
    diag.innerHTML = '';
    try {
      const antes = (await ultimoAviso())?.t || 0;
      const r = await datos.probarAvisos();
      linea(`📤 Servidor: entregado a <b>${r.enviados} de ${r.total}</b> ${r.total === 1 ? 'dispositivo' : 'dispositivos'} de tu cuenta.`);
      (r.errores || []).forEach((x) => linea(`⚠️ ${esc(x.servicio)} respondió ${x.status}${x.razon ? `: ${esc(x.razon)}` : ''}`));
      if (!r.enviados) { linea('❌ No se entregó a ningún dispositivo. Apaga y vuelve a activar los avisos.'); return; }
      linea('⏳ Esperando que llegue a este dispositivo…');
      for (let i = 0; i < 20; i++) {
        await new Promise((ok) => setTimeout(ok, 1000));
        const u = await ultimoAviso();
        if (u && u.t > antes) {
          linea(u.mostrado ? '✅ <b>Llegó a este dispositivo</b> y se mostró. Si no lo viste, revisa «No molestar» y los permisos del teléfono (abajo).' : `⚠️ Llegó, pero el teléfono no dejó mostrarlo: ${esc(u.error || '')}`);
          return;
        }
      }
      linea('❌ <b>No llegó a este dispositivo</b> en 20 segundos. Toca «Apagar en este dispositivo», recarga y actívalos otra vez.');
    } catch (x) { linea(`❌ ${esc(x.message)}`); }
    finally { e.target.disabled = false; }
  });
  el.querySelector('[data-apagar]')?.addEventListener('click', async () => { await desactivarAvisos(); aviso('Avisos apagados en este dispositivo.', { emoji: '🔕' }); repintar(); });
  el.querySelector('[data-instalar]')?.addEventListener('click', async () => { await instalar(); repintar(); });
}
