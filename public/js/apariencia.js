// =============================================================================
// apariencia.js — Tema (claro, oscuro o como el dispositivo) y brillo del modo claro.
// Se guarda en este dispositivo. El brillo oscurece fondos y tarjetas (variable CSS
// --atenuar) y también atenúa la lección abierta.
// =============================================================================

import { leerLocal, guardarLocal } from './util.js';
import { abrirHoja } from './ui.js';

const CLAVE_TEMA = 'tareki:tema';      // 'light' | 'dark' | '' (como el dispositivo)
const CLAVE_BRILLO = 'tareki:atenuar'; // 0 a 40 (% de oscurecimiento del modo claro)
export const MAX_ATENUAR = 40;

const sistemaOscuro = () => matchMedia('(prefers-color-scheme: dark)').matches;
export const temaGuardado = () => leerLocal(CLAVE_TEMA, '');
export const atenuarGuardado = () => Math.min(MAX_ATENUAR, Math.max(0, Number(leerLocal(CLAVE_BRILLO, 0)) || 0));

export function oscuro() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : sistemaOscuro();
}

/** Mezcla dos colores #rrggbb (para el color de la barra del navegador). */
function mezclar(a, b, p) {
  const n = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(n(a, i) * (1 - p) + n(b, i) * p).toString(16).padStart(2, '0')).join('')}`;
}

export function aplicarTema() {
  const raiz = document.documentElement;
  const t = temaGuardado();
  if (t) raiz.dataset.theme = t; else delete raiz.dataset.theme;
  const a = oscuro() ? 0 : atenuarGuardado();
  raiz.style.setProperty('--atenuar', `${a}%`);
  if (a) raiz.style.setProperty('--brillo-leccion', String(1 - (a / 100) * 0.8)); else raiz.style.removeProperty('--brillo-leccion'); // sin filtro si no hace falta
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro() ? '#121a33' : mezclar('#eaf6ff', '#2b3150', a / 100));
}

// Si el tema es "como el dispositivo" y el celular cambia solo (de noche), seguirlo
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (!temaGuardado()) aplicarTema(); });

const NIVELES = [[0, 'Normal'], [10, 'Un poco menos'], [20, 'Suave'], [30, 'Más suave'], [40, 'Muy suave']];
const nombreNivel = (a) => NIVELES.reduce((r, [v, n]) => (a >= v ? n : r), 'Normal');

/** Ventana para elegir tema y brillo. Los cambios se ven al instante. */
export function abrirApariencia(alCambiar) {
  abrirHoja({
    titulo: '🎨 Apariencia',
    cuerpo: `
      <div class="campo"><span class="etiqueta">Tema</span>
        <div class="filtros envolver" role="group" aria-label="Tema">
          <button type="button" data-tema-op="light">☀️ Claro</button>
          <button type="button" data-tema-op="dark">🌙 Oscuro</button>
          <button type="button" data-tema-op="">📱 Como el dispositivo</button>
        </div></div>
      <div class="campo" id="campoBrillo"><label for="brillo">Brillo del modo claro · <b id="brilloNombre"></b></label>
        <div class="brillo-fila"><span aria-hidden="true">☀️</span><input type="range" id="brillo" min="0" max="${MAX_ATENUAR}" step="5" aria-label="Bajar el brillo"><span aria-hidden="true">🌥️</span></div>
        <small>Muévelo a la derecha si la pantalla blanca cansa la vista. También baja el brillo de las lecciones.</small></div>
      <p class="suave peq">Se guarda solo en este dispositivo.</p>`,
    pie: '<button class="btn" data-cerrar-ap>Listo</button>',
    cerrar: () => alCambiar?.(),
    montar: (el) => {
      const $r = el.querySelector('#brillo');
      const pintar = () => {
        const t = temaGuardado();
        el.querySelectorAll('[data-tema-op]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.temaOp === t));
        $r.value = atenuarGuardado();
        el.querySelector('#brilloNombre').textContent = nombreNivel(atenuarGuardado());
        const apagado = oscuro();
        $r.disabled = apagado;
        el.querySelector('#campoBrillo').classList.toggle('apagado', apagado);
        el.querySelector('#campoBrillo small').textContent = apagado
          ? 'El brillo se ajusta en el modo claro. El modo oscuro ya es suave para la vista.'
          : 'Muévelo a la derecha si la pantalla blanca cansa la vista. También baja el brillo de las lecciones.';
      };
      el.querySelectorAll('[data-tema-op]').forEach((b) => b.addEventListener('click', () => { guardarLocal(CLAVE_TEMA, b.dataset.temaOp); aplicarTema(); pintar(); }));
      $r.addEventListener('input', () => { guardarLocal(CLAVE_BRILLO, Number($r.value)); aplicarTema(); pintar(); });
      el.querySelector('[data-cerrar-ap]').addEventListener('click', () => el.querySelector('[data-cerrar]').click());
      pintar();
    },
  });
}
