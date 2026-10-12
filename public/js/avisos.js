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

/** Pide permiso y registra este dispositivo en la cuenta. Debe llamarse desde un toque. */
export async function activarAvisos() {
  if (MODO_DEMO) throw new Error('En la demostración no hay avisos reales.');
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error(permiso === 'denied' ? 'Los avisos quedaron bloqueados. Actívalos en la configuración del navegador.' : 'No se activaron los avisos.');
  const reg = await navigator.serviceWorker.register('sw.js');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64aBytes(VAPID_PUBLICA) });
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

// --- Tarjeta para activar (papás y equipo) ---------------------------------------------------
const PASOS_IOS = `<ol class="limpia pasos-ios">
  <li>Abre este link en <b>Safari</b>.</li>
  <li>Toca el botón <b>Compartir</b> <span class="ico-compartir" aria-hidden="true">⬆️</span> (abajo en iPhone, arriba en iPad).</li>
  <li>Elige <b>«Agregar a inicio»</b> y luego <b>Agregar</b>.</li>
  <li>Abre <b>Tareki desde el ícono</b> 🦉 de tu pantalla de inicio y vuelve aquí para activar los avisos.</li>
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
      </div></div></div></div>`;
  const repintar = () => tarjetaAvisos(el);
  el.querySelector('[data-activar]')?.addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = 'Activando…';
    try { await activarAvisos(); aviso('¡Avisos activados!', { emoji: '🔔' }); }
    catch (x) { aviso(x.message, { emoji: '⚠️', ms: 6000 }); }
    repintar();
  });
  el.querySelector('[data-probar]')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      const r = await datos.probarAvisos();
      aviso(r.enviados ? 'Aviso enviado. Debe llegar en unos segundos.' : 'No se pudo enviar. Apaga y vuelve a activar los avisos.', { emoji: r.enviados ? '📨' : '⚠️', ms: 5000 });
    } catch (x) { aviso(x.message, { emoji: '⚠️' }); }
    e.target.disabled = false;
  });
  el.querySelector('[data-apagar]')?.addEventListener('click', async () => { await desactivarAvisos(); aviso('Avisos apagados en este dispositivo.', { emoji: '🔕' }); repintar(); });
  el.querySelector('[data-instalar]')?.addEventListener('click', async () => { await instalar(); repintar(); });
}
