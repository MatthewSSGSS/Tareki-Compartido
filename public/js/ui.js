// =============================================================================
// ui.js — Piezas visuales reutilizables: hoja inferior (ventana), avisos,
// confirmaciones, confeti, barras y estrellas.
// =============================================================================

import { esc } from './util.js';

// --- Hoja inferior (en computador se ve como ventana centrada) ----------------
const $hoja = () => document.getElementById('hoja');
const $fondo = () => document.getElementById('hojaFondo');
let alCerrar = null;
let focoAnterior = null;

/**
 * Abre una hoja.
 * @param {object} o
 * @param {string} o.titulo
 * @param {string} o.cuerpo  HTML del contenido
 * @param {string} [o.pie]   HTML de los botones de abajo
 * @param {boolean} [o.ancha] Más ancha en computador
 * @param {(el:HTMLElement)=>void} [o.montar] Para conectar eventos
 * @param {()=>void} [o.cerrar] Se llama al cerrar
 */
export function abrirHoja({ titulo, cuerpo, pie = '', ancha = false, montar, cerrar }) {
  const el = $hoja();
  if (!el.hidden && alCerrar) { const f = alCerrar; alCerrar = null; f(); }
  if (el.hidden) focoAnterior = document.activeElement;
  el.className = 'hoja' + (ancha ? ' ancha' : '');
  el.setAttribute('aria-label', titulo);
  el.innerHTML = `
    <div class="hoja-agarre"></div>
    <header class="hoja-cab"><h2>${esc(titulo)}</h2>
      <button class="btn-redondo" type="button" data-cerrar aria-label="Cerrar">✕</button></header>
    <div class="hoja-cuerpo">${cuerpo}</div>
    ${pie ? `<footer class="hoja-pie">${pie}</footer>` : ''}`;
  el.hidden = false;
  $fondo().hidden = false;
  document.body.classList.add('hoja-abierta');
  alCerrar = cerrar || null;
  el.querySelector('[data-cerrar]').addEventListener('click', () => cerrarHoja());
  montar?.(el);
  (el.querySelector('[autofocus]') || el.querySelector('[data-cerrar]')).focus({ preventScroll: true });
  return el;
}

export function cerrarHoja() {
  const el = $hoja();
  if (el.hidden) return;
  el.hidden = true;
  el.innerHTML = '';
  $fondo().hidden = true;
  document.body.classList.remove('hoja-abierta');
  if (alCerrar) { const f = alCerrar; alCerrar = null; f(); }
  focoAnterior?.focus?.({ preventScroll: true });
}

export const hojaAbierta = () => !$hoja().hidden;

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && hojaAbierta()) cerrarHoja(); });
document.addEventListener('click', (e) => { if (e.target.id === 'hojaFondo') cerrarHoja(); });

/** Pregunta Sí/No. Devuelve una promesa con true/false. */
export function confirmar({ titulo, texto = '', si = 'Sí', no = 'Cancelar', peligro = false }) {
  return new Promise((resolve) => {
    let respondido = false;
    abrirHoja({
      titulo,
      cuerpo: texto ? `<p class="suave">${texto}</p>` : '',
      pie: `<button class="btn btn-blanco" data-no>${esc(no)}</button>
            <button class="btn ${peligro ? 'btn-peligro' : ''}" data-si>${esc(si)}</button>`,
      montar: (el) => {
        el.querySelector('[data-si]').addEventListener('click', () => { respondido = true; cerrarHoja(); resolve(true); });
        el.querySelector('[data-no]').addEventListener('click', () => cerrarHoja());
      },
      cerrar: () => { if (!respondido) resolve(false); },
    });
  });
}

// --- Aviso temporal (toast) ---------------------------------------------------
let timerAviso;
export function aviso(mensaje, { ms = 3500, emoji = '' } = {}) {
  const el = document.getElementById('toast');
  clearTimeout(timerAviso);
  el.textContent = (emoji ? `${emoji} ` : '') + mensaje;
  el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  timerAviso = setTimeout(() => { el.hidden = true; }, ms);
}

// --- Confeti (sin librerías) ----------------------------------------------------
const pocoMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function confeti(n = 90) {
  if (pocoMovimiento()) return;
  const c = document.createElement('canvas');
  c.className = 'confeti';
  c.width = innerWidth; c.height = innerHeight;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const colores = ['#ff6b9a', '#ffcf3f', '#35b862', '#59c3ff', '#a77bff', '#ff9a4d'];
  const ps = Array.from({ length: n }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 12 - 4, s: 6 + Math.random() * 7,
    c: colores[Math.random() * colores.length | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4,
  }));
  let f = 0;
  (function paso() {
    ctx.clearRect(0, 0, c.width, c.height);
    ps.forEach((p) => {
      p.vy += 0.32; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); ctx.restore();
    });
    if (++f < 140) requestAnimationFrame(paso); else c.remove();
  })();
}

// --- Piezas pequeñas --------------------------------------------------------------
export const barra = (pct, clase = '') =>
  `<div class="barra ${clase}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;

export const estrellas = (n, de = 3) => `<span class="estrellas" aria-label="${n} de ${de} estrellas">${'⭐'.repeat(n)}<span class="apagadas">${'⭐'.repeat(Math.max(0, de - n))}</span></span>`;

/** Lulo, el delfín rosado de Learnground, con un globo de diálogo. */
export const lulo = (texto, clase = '') =>
  `<div class="lulo ${clase}"><img class="lulo-buho" src="img/lulo-128.png" alt="" aria-hidden="true"><p class="lulo-globo">${texto}</p></div>`;

export const vacio = ({ emoji = 'lulo', titulo, texto = '', accion = '' }) => `
  <div class="vacio card">
    <div class="vacio-emoji" aria-hidden="true">${emoji === 'lulo' ? '<img src="img/lulo-128.png" alt="" style="width:72px;height:72px">' : emoji}</div>
    <h3>${esc(titulo)}</h3>
    ${texto ? `<p class="suave">${texto}</p>` : ''}
    ${accion}
  </div>`;

/** Gráfico de barras sencillo en SVG. puntos: [{etiqueta, valor, clase?}] */
export function graficoBarras(puntos, { max = 100, alto = 140, sufijo = '' } = {}) {
  if (!puntos.length) return '';
  const tope = Math.max(max, ...puntos.map((p) => p.valor));
  return `<div class="grafico" style="--alto:${alto}px">${puntos.map((p) => `
    <div class="g-col" title="${esc(p.titulo || `${p.etiqueta}: ${p.valor}${sufijo}`)}">
      <b>${p.valor ? Math.round(p.valor) + sufijo : ''}</b>
      <i class="${p.clase || ''}" style="height:${p.valor ? Math.max(4, (p.valor / tope) * 100) : 0}%"></i>
      <small>${esc(p.etiqueta)}</small>
    </div>`).join('')}</div>`;
}

export const claseNota = (n) => (n >= 80 ? 'verde' : n >= 60 ? 'amarillo' : 'rojo');

// --- Animaciones al mostrar una pantalla --------------------------------------------
// Tarjetas que entran en cascada, barras que se llenan y números que cuentan.
// Nada se mueve si la persona pidió "reducir movimiento" en su teléfono.
export function animarPantalla(root) {
  if (pocoMovimiento()) return;
  root.querySelectorAll('.card, .tabla-fila, .mensaje-fila, .buzon-fila, .leccion').forEach((el, i) => {
    el.style.setProperty('--i', Math.min(i, 14));
    el.classList.add('entra');
    el.addEventListener('animationend', () => el.classList.remove('entra'), { once: true });
  });
  const barras = [...root.querySelectorAll('.barra i')].map((b) => [b, b.style.width]);
  const columnas = [...root.querySelectorAll('.g-col i')].map((c) => [c, c.style.height]);
  barras.forEach(([b]) => { b.style.width = '0%'; });
  columnas.forEach(([c]) => { c.style.height = '0%'; });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    barras.forEach(([b, w]) => { b.style.width = w; });
    columnas.forEach(([c, h], i) => { c.style.transitionDelay = `${i * 50}ms`; c.style.height = h; });
  }));
  root.querySelectorAll('.kpi b, .cifra b, .racha .numero, .rc-num b, .nota').forEach(contar);
}

/** Si el elemento muestra UN número (ej. "🔥 5", "83", "$60.000"), lo hace contar desde 0. */
function contar(el) {
  const texto = el.textContent;
  const numeros = texto.match(/\d[\d.]*/g);
  if (!numeros || numeros.length !== 1) return;
  if (/[a-záéíóúñ]/i.test(texto.replace(/\d[\d.]*/, ''))) return; // "14 de octubre" no es un número que cuente
  const recorrido = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let nodo;
  while ((nodo = recorrido.nextNode())) if (/\d/.test(nodo.nodeValue)) break;
  if (!nodo) return;
  const crudo = nodo.nodeValue.match(/\d[\d.]*/)[0];
  const meta = Number(crudo.replace(/\./g, ''));
  if (!meta || meta > 999999) return;
  const conPuntos = crudo.includes('.');
  const original = nodo.nodeValue;
  const inicio = performance.now(), dura = Math.min(900, 400 + meta * 8);
  (function paso(t) {
    const p = Math.min(1, (t - inicio) / dura), suave = 1 - Math.pow(1 - p, 3);
    const v = Math.round(meta * suave);
    nodo.nodeValue = original.replace(crudo, conPuntos ? v.toLocaleString('es-CO') : String(v));
    if (p < 1) requestAnimationFrame(paso); else nodo.nodeValue = original;
  })(inicio);
}
