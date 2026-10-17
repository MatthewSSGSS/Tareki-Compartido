// =============================================================================
// inscripcion.js — "¿Aún no tienes cuenta?" en la pantalla de entrada.
// Las familias pagan ANTES: pagan con la llave, mandan el comprobante por WhatsApp
// y el equipo les envía el código de invitación. Los datos salen de los ajustes de
// cobro (los cambia el dueño en Familias → Datos de cobro; ver supabase/inscripcion.sql).
//   tarjetaInscripcion(): tarjeta compacta con los precios y dos botones.
//   abrirInscripcion():   ventana con qué incluye, precios, pasos, llave y WhatsApp.
// =============================================================================

import { esc } from './util.js';
import { abrirHoja, cerrarHoja } from './ui.js';
import { tablaPrecios, bloqueLlave, waCobro, tienePrecios, conectarPago, pesos } from './acceso.js';

const INCLUYE = [
  ['📚', 'Lecciones a su medida', 'Hechas para tu hijo o hija con lo que ve en el colegio.'],
  ['🎮', 'Aprender jugando', 'Juegos, fichas y simulacros para practicar.'],
  ['🔥', 'Racha y logros', 'Estrellas y medallas que los motivan cada día.'],
  ['📈', 'Reporte para papás', 'Notas, su próximo reto y consejos.'],
  ['📷', 'Pide lecciones', 'Con fotos del cuaderno o de la guía.'],
  ['💬', 'Siempre cerca', 'Chat con el equipo y avisos en el celular.'],
];

export const hayInscripcion = (cobro) => !!cobro && (tienePrecios(cobro) || !!cobro.llave);

/** Tarjeta de la pantalla de entrada (con "Probar la app" incluido). */
export function tarjetaInscripcion(cobro) {
  const p1 = cobro.precioPrimaria || cobro.precio, p2 = cobro.precioBachillerato || cobro.precio;
  return `
    <div class="nueva-cuenta">
      <img class="nc-lulo" src="img/lulo-128.png" alt="" aria-hidden="true">
      <b class="nc-titulo">¿Aún no tienes cuenta?</b>
      <p class="nc-texto">Inscribe a tu familia: pagas la mensualidad y te enviamos tu código para entrar.</p>
      ${p1 || p2 ? `<div class="nc-precios">
        ${p1 ? `<span><small>1.º a 5.º</small><b>${pesos(p1)}</b></span>` : ''}
        ${p2 && p2 !== p1 ? `<span><small>6.º a 11.º</small><b>${pesos(p2)}</b></span>` : ''}
        <em>por niño<br>al mes</em>
      </div>` : ''}
      <div class="nc-botones">
        <button type="button" class="btn" data-inscribirme>🎟️ Inscribirme</button>
        <a class="btn btn-blanco" href="?demo&familia#/entrar">🎮 Probar la app</a>
      </div>
    </div>`;
}

/** Ventana con todo lo necesario para inscribirse. */
export function abrirInscripcion(cobro, { alTengoCodigo } = {}) {
  const comprobante = waCobro(cobro, 'Hola 👋 Ya pagué la mensualidad de Learnground y quiero mi código.\nMi nombre: \nMi correo: \nNiños y grado: \nTe envío el comprobante.');
  const preguntas = waCobro(cobro, 'Hola 👋 Quiero saber más de Learnground.');
  abrirHoja({
    titulo: '🎟️ Inscribe a tu familia',
    ancha: true,
    cuerpo: `
      <div class="insc">
        <section>
          <h3>✨ Qué incluye</h3>
          <div class="incluye">${INCLUYE.map(([e, t, d]) => `<div><span aria-hidden="true">${e}</span><b>${esc(t)}</b><small>${esc(d)}</small></div>`).join('')}</div>
        </section>
        <section>
          <h3>💳 Mensualidad</h3>
          ${tablaPrecios(cobro)}
        </section>
        <section>
          <h3>🪜 Cómo inscribirte</h3>
          <ol class="pasos-num">
            <li><span><b>Paga</b> desde la app de tu banco con la llave de abajo: una mensualidad por cada niño.</span></li>
            <li><span><b>Envíanos el comprobante</b> por WhatsApp con tu nombre, tu correo y el nombre y grado de cada niño.</span></li>
            <li><span><b>Te enviamos tu código</b> de invitación.</span></li>
            <li><span><b>Crea tu cuenta</b> en <button type="button" class="link" data-tengo-codigo>«Tengo un código»</button> y arma el perfil de cada niño.</span></li>
          </ol>
        </section>
        ${cobro.llave ? `<section class="pago">${bloqueLlave(cobro)}</section>` : ''}
        ${cobro.nota ? `<p class="suave peq">${esc(cobro.nota)}</p>` : ''}
      </div>`,
    pie: `${preguntas ? `<a class="btn btn-blanco" href="${esc(preguntas)}" target="_blank" rel="noopener">❓ Preguntar</a>` : ''}
      ${comprobante ? `<a class="btn btn-wa" href="${esc(comprobante)}" target="_blank" rel="noopener">💬 Enviar comprobante</a>` : ''}`,
    montar: (el) => {
      conectarPago(el);
      el.querySelector('[data-tengo-codigo]').addEventListener('click', () => { cerrarHoja(); alTengoCodigo?.(); });
    },
  });
}
