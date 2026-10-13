// =============================================================================
// acceso.js — Mensualidad de las familias: estado del acceso, "cómo pagar" y
// el aviso de "tu acceso vence pronto". El cobro es manual (llave Bre-B, Nequi,
// efectivo…): la familia paga y el equipo registra el pago. Nada es automático.
// =============================================================================

import * as datos from './datos.js';
import { esc, hoy, diasEntre, fechaBonita, primerNombre, diaDe } from './util.js';
import { abrirHoja, aviso } from './ui.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** "12 de noviembre" (siempre con la fecha, no "hace 3 días"). */
export const fechaLarga = (dia) => { if (!dia) return '—'; const f = new Date(`${diaDe(dia)}T12:00:00`); return `${f.getDate()} de ${MESES[f.getMonth()]}`; };
export const pesos = (n) => `$${Math.round(n || 0).toLocaleString('es-CO')}`;

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

/** Bloque con los datos para pagar (llave, valor, a nombre de quién y botón de WhatsApp). */
export function datosDePago(cobro, usuario) {
  const mensaje = `Hola 👋 Soy ${usuario?.nombre || ''}. Acabo de pagar la mensualidad de Tareki${cobro.precio ? ` (${pesos(cobro.precio)})` : ''}. Te envío el comprobante.`;
  const wa = cobro.whatsapp ? `https://wa.me/${cobro.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}` : '';
  if (!cobro.llave && !cobro.precio) return '<p class="suave">El equipo de Tareki te dirá cómo pagar.</p>';
  return `<div class="pago">
    ${cobro.precio ? `<div class="pago-valor"><span>Mensualidad</span><b>${pesos(cobro.precio)}</b></div>` : ''}
    ${cobro.llave ? `<div class="pago-llave"><span>Llave ${esc(cobro.banco || '')} (Bre-B)</span><b data-llave>${esc(cobro.llave)}</b>
      <button class="btn btn-peq btn-blanco" type="button" data-copiar-llave>📋 Copiar llave</button></div>` : ''}
    ${cobro.titular ? `<p class="suave peq">A nombre de: <b>${esc(cobro.titular)}</b></p>` : ''}
    <ol class="limpia peq">
      <li>Abre la app de tu banco (Davivienda, Bancolombia, Nequi, Daviplata…) y elige <b>enviar con llave</b>.</li>
      <li>Pega la llave, revisa que salga el nombre de arriba y envía ${cobro.precio ? pesos(cobro.precio) : 'la mensualidad'}.</li>
      <li>Mándanos el comprobante por WhatsApp. Apenas lo veamos, reactivamos el acceso.</li>
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
  const cobro = await datos.ajustesCobro().catch(() => ({}));
  abrirHoja({ titulo: 'Cómo pagar la mensualidad', cuerpo: datosDePago(cobro, usuario), montar: conectarPago });
}

/** Aviso amarillo cuando faltan 3 días o menos (familias). Devuelve '' si no aplica. */
export function bannerVence(usuario) {
  const e = estadoAcceso(usuario);
  if (!e.activo || e.dias > 3) return '';
  const cuando = e.dias === 0 ? 'hoy es el último día' : e.dias === 1 ? 'vence mañana' : `vence en ${e.dias} días (${fechaLarga(e.hasta)})`;
  return `<div class="card banner-vence"><span class="em" aria-hidden="true">⏰</span>
    <div><b>Tu acceso a Tareki ${cuando}</b><p class="peq">Paga la mensualidad para seguir aprendiendo sin pausas. No se pierde nada de lo avanzado.</p></div>
    <button class="btn btn-peq btn-sol" data-como-pagar>Cómo pagar</button></div>`;
}
export function conectarBanner(root, usuario) {
  root.querySelector('[data-como-pagar]')?.addEventListener('click', () => abrirComoPagar(usuario));
}

export const saludoFamilia = (u) => primerNombre(u?.nombre || '');
