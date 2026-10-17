// =============================================================================
// inscripcion.js — "¿Aún no tienes cuenta?" en la pantalla de entrada.
// Las familias pagan ANTES: pagan con la llave, mandan el comprobante por WhatsApp
// y el equipo les envía el código de invitación. Los datos salen de los ajustes de
// cobro (los cambia el dueño en Familias → Datos de cobro; ver supabase/inscripcion.sql).
//   tarjetaInscripcion(): tarjeta arriba de "Entrar" con los 3 pasos a la vista.
//   abrirInscripcion():   ventana paso a paso: pagar (precios y llave), comprobante por
//                         WhatsApp, recibir el código y crear la cuenta; "qué incluye" al final.
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

/** "Desde $80.000 por niño al mes" (o el precio único). */
function textoPrecio(cobro) {
  const p1 = cobro.precioPrimaria || cobro.precio, p2 = cobro.precioBachillerato || cobro.precio;
  const minimo = Math.min(...[p1, p2].filter(Boolean));
  if (!Number.isFinite(minimo)) return '';
  return p1 && p2 && p1 !== p2 ? `Desde ${pesos(minimo)} por niño al mes` : `${pesos(minimo)} por niño al mes`;
}

/**
 * Tarjeta de la pantalla de entrada: va ARRIBA del formulario para entrar, con los 3 pasos
 * a la vista (muchos papás nuevos no la encontraban cuando estaba abajo).
 */
export function tarjetaInscripcion(cobro) {
  const precio = textoPrecio(cobro);
  return `
    <div class="nueva-cuenta">
      <img class="nc-lulo" src="img/lulo-128.png" alt="" aria-hidden="true">
      <b class="nc-titulo">👋 ¿Primera vez en Learnground?</b>
      <p class="nc-texto">Inscribe a tu familia en 3 pasos:</p>
      <ol class="nc-pasos">
        <li><span class="nc-n" aria-hidden="true">1</span><span><b>Paga la mensualidad</b>${precio ? `<small>${esc(precio)}</small>` : ''}</span></li>
        <li><span class="nc-n" aria-hidden="true">2</span><span><b>Mándanos el comprobante</b><small>Por WhatsApp</small></span></li>
        <li><span class="nc-n" aria-hidden="true">3</span><span><b>Recibe tu código y crea tu cuenta</b><small>Te lo enviamos por WhatsApp</small></span></li>
      </ol>
      <button type="button" class="btn bloque" data-inscribirme>🎟️ Quiero inscribirme</button>
      <a class="nc-probar" href="?demo&familia#/entrar">🎮 Primero quiero ver cómo funciona</a>
    </div>`;
}

/** Ventana con los pasos para inscribirse, cada uno con lo que hace falta para hacerlo. */
export function abrirInscripcion(cobro, { alTengoCodigo } = {}) {
  const comprobante = waCobro(cobro, 'Hola 👋 Ya pagué la mensualidad de Learnground y quiero mi código.\nMi nombre: \nMi correo: \nNiños y grado: \nTe envío el comprobante.');
  const preguntas = waCobro(cobro, 'Hola 👋 Quiero saber más de Learnground.');
  const paso = (n, titulo, cuerpo) => `<li class="insc-paso"><div class="ip-cab"><span class="ip-n" aria-hidden="true">${n}</span><h3>${titulo}</h3></div>${cuerpo}</li>`;
  abrirHoja({
    titulo: '🎟️ Inscribe a tu familia',
    ancha: true,
    cuerpo: `
      <div class="insc">
        <p class="suave">Son 4 pasos. Si te queda alguna duda, escríbenos por WhatsApp 💬</p>
        <ol class="insc-pasos">
          ${paso(1, '💳 Paga la mensualidad', `
            <p>Una mensualidad por cada niño, según su grado:</p>
            ${tablaPrecios(cobro)}
            ${cobro.llave
              ? `<p>Abre la app de tu banco (Davivienda, Bancolombia, Nequi, Daviplata…), elige <b>enviar con llave</b> y usa esta:</p><div class="pago">${bloqueLlave(cobro)}</div>`
              : '<p>Escríbenos por WhatsApp y te decimos cómo pagar.</p>'}`)}
          ${paso(2, '💬 Mándanos el comprobante', `
            <p>Por WhatsApp, con tu nombre, tu correo y el nombre y grado de cada niño. El mensaje ya va escrito: solo complétalo y adjunta la foto del comprobante.</p>
            ${comprobante ? `<a class="btn btn-wa bloque" href="${esc(comprobante)}" target="_blank" rel="noopener">💬 Enviar comprobante por WhatsApp</a>` : ''}`)}
          ${paso(3, '🎟️ Recibe tu código', `
            <p>Te respondemos por WhatsApp con tu <b>código de invitación</b> (se ve así: <span style="white-space:nowrap">LEARN-XXXXXX</span>).</p>`)}
          ${paso(4, '✅ Crea tu cuenta', `
            <p>Escribe el código en «Tengo un código», pon tus datos y crea el perfil de cada niño. ¡Y a jugar!</p>
            <button type="button" class="btn btn-blanco bloque" data-tengo-codigo>🎟️ Ya tengo mi código</button>`)}
        </ol>
        <details class="insc-incluye"><summary>✨ ¿Qué incluye Learnground?</summary>
          <div class="incluye">${INCLUYE.map(([e, t, d]) => `<div><span aria-hidden="true">${e}</span><b>${esc(t)}</b><small>${esc(d)}</small></div>`).join('')}</div>
        </details>
        ${cobro.nota ? `<p class="suave peq">${esc(cobro.nota)}</p>` : ''}
      </div>`,
    pie: preguntas ? `<a class="btn btn-blanco" href="${esc(preguntas)}" target="_blank" rel="noopener">❓ Tengo una pregunta</a>` : '',
    montar: (el) => {
      conectarPago(el);
      el.querySelector('[data-tengo-codigo]').addEventListener('click', () => { cerrarHoja(); alTengoCodigo?.(); });
    },
  });
}
