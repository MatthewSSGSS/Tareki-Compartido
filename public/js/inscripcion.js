// =============================================================================
// inscripcion.js — "¿Quieres inscribir a tu familia?" en la pantalla de entrada.
// Las familias pagan ANTES: pagan con la llave, mandan el comprobante por WhatsApp
// y el equipo les envía el código de invitación. Los datos salen de los ajustes de
// cobro (los cambia el dueño en Familias → Datos de cobro; ver supabase/inscripcion.sql).
// =============================================================================

import { esc } from './util.js';
import { tablaPrecios, bloqueLlave, waCobro, tienePrecios } from './acceso.js';

const INCLUYE = [
  ['📚', 'Lecciones hechas para tu hijo o hija, según lo que está viendo en el colegio.'],
  ['🎮', 'Juegos, fichas y simulacros para practicar sin aburrirse.'],
  ['🔥', 'Racha, estrellas y logros que los motivan a estudiar cada día.'],
  ['📈', 'Reporte para papás: notas, temas que cuestan y consejos para ayudar en casa.'],
  ['📷', 'Pide lecciones nuevas con fotos del cuaderno o de la guía.'],
  ['💬', 'Chat con el equipo y avisos en el celular.'],
];

/** '' si todavía no hay datos de cobro (o falta correr inscripcion.sql). */
export function seccionInscripcion(cobro) {
  if (!cobro || (!tienePrecios(cobro) && !cobro.llave)) return '';
  const comprobante = waCobro(cobro, 'Hola 👋 Ya pagué la mensualidad de Learnground y quiero mi código.\nMi nombre: \nMi correo: \nNiños y grado: \nTe envío el comprobante.');
  const preguntas = waCobro(cobro, 'Hola 👋 Quiero saber más de Learnground.');
  return `
    <div class="card inscribirse-caja">
      <h2>🎟️ ¿Quieres inscribir a tu familia?</h2>
      <p class="suave">Primero pagas la mensualidad y te enviamos tu <b>código de invitación</b> para crear la cuenta.</p>

      <h3>✨ Qué incluye</h3>
      <ul class="limpia incluye">${INCLUYE.map(([e, t]) => `<li><span aria-hidden="true">${e}</span>${esc(t)}</li>`).join('')}</ul>

      <h3>💳 Mensualidad</h3>
      ${tablaPrecios(cobro)}

      <h3>🪜 Cómo inscribirte</h3>
      <ol class="pasos-inscripcion">
        <li><b>Paga</b> desde la app de tu banco con la llave de abajo: una mensualidad por cada niño.</li>
        <li><b>Envíanos el comprobante</b> por WhatsApp con tu nombre, tu correo y el nombre y grado de cada niño.</li>
        <li><b>Te enviamos tu código</b> de invitación.</li>
        <li><b>Crea tu cuenta</b> en <button type="button" class="link" data-ir-codigo>«Tengo un código»</button> y arma el perfil de cada niño.</li>
      </ol>

      ${cobro.llave ? `<div class="pago">${bloqueLlave(cobro)}</div>` : ''}
      ${cobro.nota ? `<p class="suave peq">${esc(cobro.nota)}</p>` : ''}
      ${comprobante || preguntas ? `<div class="fila envolver inscribirse-botones">
        ${comprobante ? `<a class="btn btn-wa" href="${esc(comprobante)}" target="_blank" rel="noopener">💬 Enviar comprobante</a>` : ''}
        ${preguntas ? `<a class="btn btn-blanco" href="${esc(preguntas)}" target="_blank" rel="noopener">❓ Tengo preguntas</a>` : ''}
      </div>` : ''}
    </div>`;
}
