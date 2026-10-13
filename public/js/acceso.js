// =============================================================================
// acceso.js — Mensualidad de las familias: estado del acceso, "cómo pagar" y
// el aviso de "tu acceso vence pronto". El cobro es manual (llave Bre-B, Nequi,
// efectivo…): la familia paga y el equipo registra el pago. Nada es automático.
// =============================================================================

import * as datos from './datos.js';
import { esc, hoy, diasEntre, fechaBonita, primerNombre, diaDe } from './util.js';
import { abrirHoja, aviso } from './ui.js';
import { VERSION_PRUEBA } from './config.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** "12 de noviembre" (siempre con la fecha, no "hace 3 días"). */
export const fechaLarga = (dia) => { if (!dia) return '—'; const f = new Date(`${diaDe(dia)}T12:00:00`); return `${f.getDate()} de ${MESES[f.getMonth()]}`; };
export const pesos = (n) => `$${Math.round(n || 0).toLocaleString('es-CO')}`;
/** 60000 → "60.000" (para las casillas de dinero). */
export const miles = (n) => (n ? Number(n).toLocaleString('es-CO') : '');
/** Hace que una casilla de dinero ponga los puntos de mil mientras se escribe. */
export function mascaraPesos(input) {
  input.addEventListener('input', () => {
    const digitos = input.value.replace(/\D/g, '').slice(0, 9);
    input.value = miles(digitos);
  });
}

/**
 * Estado del acceso de una familia (el equipo siempre tiene acceso).
 * @returns {{activo:boolean, motivo?:'suspendido'|'vencido'|'sin-fecha', dias?:number, hasta?:string}}
 */
export function estadoAcceso(f) {
  if (!f || f.rol === 'equipo') return { activo: true };
  if (f.suspendido) return { activo: false, motivo: 'suspendido', hasta: f.accesoHasta };
  if (!f.accesoHasta) return { activo: false, motivo: 'sin-fecha' };
  const dias = diasEntre(hoy(), f.accesoHasta);
  return dias < 0 ? { activo: false, motivo: 'vencido', dias, hasta: f.accesoHasta } : { activo: true, dias, hasta: f.accesoHasta };
}

/** Pastilla de estado para las listas del equipo. */
export function chipAcceso(f) {
  const e = estadoAcceso({ ...f, rol: 'familia' });
  if (e.motivo === 'suspendido') return '<span class="chip">⏸ Suspendida</span>';
  if (e.motivo === 'sin-fecha') return '<span class="chip rojo">Sin acceso</span>';
  if (!e.activo) return `<span class="chip rojo">Vencida ${fechaBonita(e.hasta)}</span>`;
  if (e.dias <= 3) return `<span class="chip sol">⏰ ${e.dias === 0 ? 'Vence hoy' : e.dias === 1 ? 'Vence mañana' : `Vence en ${e.dias} días`}</span>`;
  return `<span class="chip verde">✓ Hasta el ${fechaLarga(e.hasta)}</span>`;
}

// --- Precios: mensualidad POR NIÑO según el grado ------------------------------------------
/** 1.º a 5.º (primaria) o 6.º a 11.º (bachillerato). Si no hay precios por grado, el precio único de antes. */
export const precioDeGrado = (cobro, grado) => (Number(grado) <= 5 ? cobro.precioPrimaria : cobro.precioBachillerato) || cobro.precio || 0;
export const tienePrecios = (c) => !!(c?.precioPrimaria || c?.precioBachillerato || c?.precio);
/** Total del mes de una familia: un valor por cada niño. */
export function mensualidadDe(cobro, ninos = []) {
  const detalle = ninos.map((n) => ({ nombre: n.nombre, grado: n.grado, valor: precioDeGrado(cobro, n.grado) }));
  return { detalle, total: detalle.reduce((s, d) => s + d.valor, 0) };
}
/** Tabla de precios (pantalla de entrada y familias sin perfiles). */
export const tablaPrecios = (c) => (c.precioPrimaria || c.precioBachillerato ? `
  <div class="precios">
    <div><span>1.º a 5.º</span><b>${pesos(c.precioPrimaria || c.precio)}</b></div>
    <div><span>6.º a 11.º</span><b>${pesos(c.precioBachillerato || c.precio)}</b></div>
  </div><p class="suave peq precios-nota">Por cada niño, cada mes.</p>` : c.precio ? `<div class="pago-valor"><span>Mensualidad por niño</span><b>${pesos(c.precio)}</b></div>` : '');

/** La llave Bre-B con su botón de copiar y a nombre de quién. */
export const bloqueLlave = (cobro) => `${cobro.llave ? `<div class="pago-llave"><span>Llave ${esc(cobro.banco || '')} (Bre-B)</span><b data-llave>${esc(cobro.llave)}</b>
      <button class="btn btn-peq btn-blanco" type="button" data-copiar-llave>📋 Copiar llave</button></div>` : ''}
    ${cobro.titular ? `<p class="suave peq">A nombre de: <b>${esc(cobro.titular)}</b></p>` : ''}`;

/** Enlace de WhatsApp al número de cobro del equipo ('' si no hay). */
export const waCobro = (cobro, texto) => (cobro.whatsapp ? `https://wa.me/${cobro.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}` : '');

/** Bloque con los datos para pagar la mensualidad (familias con cuenta). ninos: sus perfiles, para el total. */
export function datosDePago(cobro, usuario, ninos = []) {
  // En la versión de prueba no se muestran datos de pago (nadie debe pagarle a una llave de ejemplo)
  if (VERSION_PRUEBA && usuario?.rol !== 'equipo') {
    return `<div class="pago"><div class="ok-caja">🧪 <b>Esto es la versión de prueba: aquí no se paga nada.</b></div>
      <p class="suave">En tu cuenta real, aquí aparecen el valor de la mensualidad, la llave Bre-B para pagar desde la app de tu banco (Davivienda, Bancolombia, Nequi, Daviplata…), los pasos y un botón para enviarnos el comprobante por WhatsApp.</p></div>`;
  }
  if (!cobro.llave && !tienePrecios(cobro)) return '<p class="suave">El equipo de Learnground te dirá cómo pagar.</p>';
  const { detalle, total } = mensualidadDe(cobro, ninos);
  const mensaje = `Hola 👋 Soy ${usuario?.nombre || ''}. Acabo de pagar la mensualidad de Learnground${total ? ` (${pesos(total)})` : ''}. Te envío el comprobante.`;
  const wa = waCobro(cobro, mensaje);
  return `<div class="pago">
    ${total ? `<div class="pago-valor"><span>Mensualidad de este mes</span><b>${pesos(total)}</b>
      <ul class="limpia pago-detalle">${detalle.map((d) => `<li><span>${esc(d.nombre)} · ${esc(d.grado)}.º</span><b>${pesos(d.valor)}</b></li>`).join('')}</ul></div>` : tablaPrecios(cobro)}
    ${bloqueLlave(cobro)}
    <ol class="limpia peq">
      <li>Abre la app de tu banco (Davivienda, Bancolombia, Nequi, Daviplata…) y elige <b>enviar con llave</b>.</li>
      <li>Pega la llave, revisa que salga el nombre de arriba y envía ${total ? pesos(total) : 'la mensualidad'}.</li>
      <li>Mándanos el comprobante por WhatsApp. Apenas lo veamos, ${usuario?.accesoHasta ? 'extendemos tu acceso' : 'activamos tu acceso'}.</li>
    </ol>
    ${cobro.nota ? `<p class="suave peq">${esc(cobro.nota)}</p>` : ''}
    ${wa ? `<a class="btn btn-wa bloque" href="${esc(wa)}" target="_blank" rel="noopener">💬 Avisar que ya pagué</a>` : ''}
  </div>`;
}

export function conectarPago(el) {
  el.querySelector('[data-copiar-llave]')?.addEventListener('click', async () => {
    const llave = el.querySelector('[data-llave]')?.textContent || '';
    try { await navigator.clipboard.writeText(llave); aviso('Llave copiada. Pégala en tu banco.', { emoji: '📋' }); }
    catch { aviso(`La llave es: ${llave}`, { emoji: '📋', ms: 8000 }); }
  });
}

export async function abrirComoPagar(usuario) {
  const [cobro, ninos] = await Promise.all([datos.ajustesCobro().catch(() => ({})), datos.ninos().catch(() => [])]);
  abrirHoja({ titulo: 'Cómo pagar la mensualidad', cuerpo: datosDePago(cobro, usuario, ninos), montar: conectarPago });
}

/** Aviso amarillo cuando faltan 3 días o menos (familias). Devuelve '' si no aplica. */
export function bannerVence(usuario) {
  if (VERSION_PRUEBA) return ''; // en la prueba no hay mensualidad: se paga antes de recibir el código
  const e = estadoAcceso(usuario);
  if (!e.activo || e.dias > 3) return '';
  const cuando = e.dias === 0 ? 'hoy es el último día' : e.dias === 1 ? 'vence mañana' : `vence en ${e.dias} días (${fechaLarga(e.hasta)})`;
  return `<div class="card banner-vence"><span class="em" aria-hidden="true">⏰</span>
    <div><b>Tu acceso a Learnground ${cuando}</b><p class="peq">Paga la mensualidad para seguir aprendiendo sin pausas. No se pierde nada de lo avanzado.</p></div>
    <button class="btn btn-peq btn-sol" data-como-pagar>Cómo pagar</button></div>`;
}
export function conectarBanner(root, usuario) {
  root.querySelector('[data-como-pagar]')?.addEventListener('click', () => abrirComoPagar(usuario));
}

export const saludoFamilia = (u) => primerNombre(u?.nombre || '');
