// =============================================================================
// recorrido.js — "🧭 Qué probar": bienvenida de la versión de prueba (familias).
// Se abre sola la primera vez que alguien entra a la prueba en este navegador y luego
// con el botón "🧭 Qué probar" de la franja de prueba. Cada opción lleva a la pantalla.
// =============================================================================

import * as datos from './datos.js';
import { abrirHoja, cerrarHoja } from './ui.js';
import { esc, leerLocal, guardarLocal } from './util.js';
import { linkInscribirse } from './piezas.js';

const CLAVE = 'tareki:recorrido-prueba';
export const recorridoVisto = () => !!leerLocal(CLAVE, false);

/** Abre la bienvenida. ctx: { navegar, elegirPerfil }. */
export async function abrirRecorrido(ctx) {
  guardarLocal(CLAVE, true);
  const ninos = await datos.ninos().catch(() => []);
  const nino = ninos[0];
  if (!nino) return;
  const lecciones = await datos.lecciones(nino.id).catch(() => []);
  const leccion = lecciones.find((l) => l.titulo === 'Las fracciones') || lecciones[lecciones.length - 1];
  const n = esc(nino.nombre);
  const opciones = [
    leccion && ['leccion', '🎮', `Lo que ve ${n}: su lección`, 'Explicación con trucos, juegos tipo consola (nave, Mario, Tetris…), un jefe final y la ficha con nota.'],
    ['inicio', '🏠', 'Su inicio y su racha', 'Lo que ve al entrar: su próxima lección, su racha 🔥 y sus estrellas.'],
    ['papas', '👨‍👩‍👧', 'Lo que ves tú (papá o mamá)', 'Notas de 1 a 100, tiempo de estudio, consejos y su próximo reto.'],
    ['chat', '💬', 'Hablar con el equipo', 'Chat, pedir lecciones con fotos del cuaderno y avisos en el celular.'],
  ].filter(Boolean);
  const ir = {
    leccion: () => { ctx.elegirPerfil(nino.id); ctx.navegar(`#/leccion/${leccion.id}`); },
    inicio: () => { ctx.elegirPerfil(nino.id); ctx.navegar('#/inicio'); },
    papas: () => ctx.navegar(`#/papas/${nino.id}`),
    chat: () => ctx.navegar('#/chat'),
  };
  const inscribirse = linkInscribirse();
  abrirHoja({
    titulo: '🎮 Bienvenido a la prueba de Learnground',
    cuerpo: `<p class="suave">Así la usaría una familia, con datos de ejemplo de <b>${n}</b>. Nada de lo que hagas aquí es real. Te recomendamos empezar por aquí:</p>
      <div class="recorrido">${opciones.map(([id, e, t, d], i) => `<button type="button" class="recorrido-op" data-ir="${id}">
        <span class="ro-n" aria-hidden="true">${i + 1}</span><span class="ro-e" aria-hidden="true">${e}</span>
        <span><b>${t}</b><small>${d}</small></span><span class="ro-flecha" aria-hidden="true">›</span></button>`).join('')}</div>
      <p class="suave peq">Puedes volver a esta guía con «🧭 Qué probar», en la franja amarilla de arriba.</p>`,
    // "Quiero inscribirme" lleva a la pantalla de entrada, donde están los pasos (o al WhatsApp si lo hay)
    pie: `<button class="btn btn-blanco" data-cerrar-recorrido>Explorar por mi cuenta</button>
      ${inscribirse ? `<a class="btn btn-wa" href="${inscribirse}" target="_blank" rel="noopener">💬 Quiero inscribirme</a>` : '<a class="btn" href="./">🎟️ Quiero inscribirme</a>'}`,
    montar: (el) => {
      el.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => ir[b.dataset.ir]()));
      el.querySelector('[data-cerrar-recorrido]').addEventListener('click', () => cerrarHoja());
    },
  });
}
