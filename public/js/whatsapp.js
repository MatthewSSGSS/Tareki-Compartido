// =============================================================================
// whatsapp.js — Mensajes de WhatsApp a las familias, SOLO por enlaces.
// Se abre WhatsApp con el número y el texto listos; la persona toca "Enviar".
// No se usan APIs no oficiales que automaticen la cuenta (riesgo de bloqueo).
// =============================================================================

import { esc } from './util.js';
import { abrirHoja, cerrarHoja, aviso } from './ui.js';
import { fechaLarga, pesos, mensualidadDe } from './acceso.js';

/** Deja solo dígitos y, si es un celular colombiano sin indicativo, le pone 57. */
export function numeroWa(celular) {
  let n = String(celular || '').replace(/\D/g, '');
  if (n.length === 10 && n.startsWith('3')) n = `57${n}`;
  return n;
}
/** Muestra un número bonito: +57 300 123 4567 */
export function numeroBonito(celular) {
  const n = numeroWa(celular);
  if (!n) return '';
  return n.startsWith('57') && n.length === 12 ? `+57 ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}` : `+${n}`;
}
export const linkWa = (numero, texto) => `https://wa.me/${numeroWa(numero)}?text=${encodeURIComponent(texto)}`;

const lista = (nombres) => (nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : nombres[0] || 'tu hijo o hija');

/** Plantillas para una familia. f: {nombre, accesoHasta}; hijos: [{nombre, grado}] (o nombres); cobro: ajustes de cobro */
export function plantillas(f, hijos, cobro = {}) {
  const papa = String(f.nombre || '').split(/\s+/)[0];
  const conGrado = hijos.filter((h) => typeof h === 'object');
  hijos = hijos.map((h) => (typeof h === 'object' ? h.nombre : h));
  const ninos = lista(hijos);
  const { total } = mensualidadDe(cobro, conGrado);
  const pago = `${total ? `La mensualidad es de ${pesos(total)}` : 'Puedes pagar la mensualidad'}${cobro.llave ? ` con la llave ${cobro.llave}${cobro.banco ? ` (${cobro.banco})` : ''}${cobro.titular ? ` a nombre de ${cobro.titular}` : ''}` : ''}.`;
  return [
    { emoji: '💳', nombre: 'Recordar pago', texto: `Hola ${papa} 👋 Te recordamos que el acceso de ${ninos} a Learnground vence el ${fechaLarga(f.accesoHasta)}. ${pago} Cuando pagues, mándanos el comprobante por aquí. ¡Gracias! 🐬` },
    { emoji: '⏰', nombre: 'Acceso vencido', texto: `Hola ${papa} 👋 El acceso de ${ninos} a Learnground venció el ${fechaLarga(f.accesoHasta)}, pero tranquilos: todo su progreso está guardado. ${pago} Apenas pagues, lo reactivamos. 🐬` },
    { emoji: '🎉', nombre: 'Bienvenida', texto: `¡Hola ${papa}! Bienvenidos a Learnground 🐬 Ya pueden entrar con su correo y contraseña en ${location.origin}${location.pathname} Cualquier duda, escríbenos por aquí.` },
    { emoji: '📚', nombre: 'Lección nueva', texto: `Hola ${papa} 👋 ${ninos} ya ${hijos.length > 1 ? 'tienen' : 'tiene'} una lección nueva en Learnground. ¡Ábranla hoy y ganen estrellas! ⭐` },
    { emoji: '🌟', nombre: 'Felicitar', texto: `Hola ${papa} 👋 Queríamos contarte que ${ninos} va muy bien en Learnground. ¡Se nota el esfuerzo! Sigan así 🐬` },
    { emoji: '✏️', nombre: 'Mensaje libre', texto: `Hola ${papa} 👋 ` },
  ];
}

/** Ventana para escribirle a UNA familia por WhatsApp. */
export function abrirWhatsApp(f, hijos, cobro) {
  const opciones = plantillas(f, hijos, cobro);
  if (!numeroWa(f.celular)) { aviso('Esta familia todavía no tiene celular. Agrégalo en su ficha.', { emoji: '📱', ms: 5000 }); return; }
  abrirHoja({
    titulo: `WhatsApp a ${f.nombre}`,
    cuerpo: `<p class="suave peq">${esc(numeroBonito(f.celular))} · Elige una plantilla y ajústala si quieres.</p>
      <div class="materias">${opciones.map((p, i) => `<button type="button" data-pl="${i}" aria-pressed="${i === 0}">${p.emoji} ${esc(p.nombre)}</button>`).join('')}</div>
      <div class="campo"><label for="waTexto">Mensaje</label><textarea id="waTexto" rows="6">${esc(opciones[0].texto)}</textarea></div>`,
    pie: '<a class="btn btn-wa" data-abrir target="_blank" rel="noopener">💬 Abrir WhatsApp</a>',
    montar: (el) => {
      const t = el.querySelector('#waTexto');
      const boton = el.querySelector('[data-abrir]');
      const actualizar = () => { boton.href = linkWa(f.celular, t.value); };
      el.querySelectorAll('[data-pl]').forEach((b) => b.addEventListener('click', () => {
        t.value = opciones[b.dataset.pl].texto;
        el.querySelectorAll('[data-pl]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        actualizar(); t.focus();
      }));
      t.addEventListener('input', actualizar);
      boton.addEventListener('click', () => setTimeout(cerrarHoja, 300));
      actualizar();
    },
  });
}

/** Envío uno por uno: una fila por familia con su botón (WhatsApp no permite envíos masivos por enlace). */
export function enviarEnSerie(familias, texto) {
  const con = familias.filter((f) => numeroWa(f.celular));
  const sin = familias.filter((f) => !numeroWa(f.celular));
  abrirHoja({
    titulo: 'Enviar por WhatsApp',
    ancha: true,
    cuerpo: `<p class="suave peq">Toca cada familia: se abre WhatsApp con el mensaje listo; solo das «Enviar» y vuelves aquí para la siguiente.</p>
      <div class="serie">${con.map((f) => `<a class="serie-fila" href="${esc(linkWa(f.celular, texto.replace(/\{nombre\}/g, String(f.nombre).split(/\s+/)[0])))}" target="_blank" rel="noopener" data-f>
        <span class="av" style="background:var(--green-s)">💬</span><span><b>${esc(f.nombre)}</b><small>${esc(numeroBonito(f.celular))}</small></span><span class="chip verde serie-estado">Abrir</span></a>`).join('')}</div>
      ${sin.length ? `<p class="suave peq">Sin celular: ${sin.map((f) => esc(f.nombre)).join(', ')}. Agrégalo en su ficha.</p>` : ''}
      ${!con.length ? '<p class="suave">Ninguna de estas familias tiene celular todavía.</p>' : ''}`,
    montar: (el) => el.querySelectorAll('[data-f]').forEach((a) => a.addEventListener('click', () => {
      a.classList.add('enviado'); a.querySelector('.serie-estado').textContent = '✓ Abierto';
    })),
  });
}
