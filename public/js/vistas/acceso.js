// =============================================================================
// acceso.js (vista) — Lo que ve una familia con el acceso vencido o suspendido.
// Sus datos siguen guardados: al registrar el pago, todo vuelve como estaba.
// =============================================================================

import * as datos from '../datos.js';
import { estadoAcceso, datosDePago, conectarPago, fechaLarga } from '../acceso.js';
import { esc } from '../util.js';
import { lulo } from '../ui.js';

export async function render(root, ctx) {
  const u = ctx.usuario;
  const e = estadoAcceso(u);
  const [ninos, cobro] = await Promise.all([datos.ninos().catch(() => []), datos.ajustesCobro().catch(() => ({}))]);
  const hijos = ninos.map((n) => n.nombre);
  const nombres = hijos.length > 1 ? `${hijos.slice(0, -1).join(', ')} y ${hijos.at(-1)}` : hijos[0] || '';

  const titulo = e.motivo === 'suspendido' ? 'Tu acceso está en pausa' : e.motivo === 'vencido' ? `Tu acceso venció el ${fechaLarga(e.hasta)}` : 'Tu cuenta aún no tiene acceso';

  root.innerHTML = `
    <div class="cabecera">
      <span class="fila"><img class="marca-logo" src="img/lulo-128.png" alt="" aria-hidden="true"><span class="marca-nombre">Learn<b>ground</b></span></span>
      <button class="btn btn-peq btn-blanco" data-salir>🚪 Salir</button>
    </div>
    <div class="pila" style="max-width:560px;margin:0 auto">
      ${ninos.length ? `<div class="fila" style="justify-content:center;gap:14px">${ninos.map((n) => `<span class="av" style="width:72px;height:72px;font-size:42px;background:${esc(n.color)};filter:grayscale(.6);opacity:.8">${esc(n.avatar)}</span>`).join('')}</div>` : ''}
      <h1 class="centro" style="font-size:1.9em">${esc(titulo)}</h1>
      ${lulo(nombres
        ? `¡Tranquilos! <b>Todo lo de ${esc(nombres)} está guardado</b>: lecciones, estrellas, notas y racha. Apenas paguen la mensualidad, ${hijos.length > 1 ? 'siguen' : 'sigue'} justo donde ${hijos.length > 1 ? 'iban' : 'iba'} 🐬`
        : '¡Tranquilos! Todo queda guardado. Apenas paguen la mensualidad, siguen justo donde iban 🐬')}
      <section class="card pila chica"><h2 style="margin:0">💳 Cómo pagar</h2>${datosDePago(cobro, u, ninos)}</section>
      <a class="btn btn-blanco bloque" href="#/chat">💬 Escribirle al equipo</a>
      <p class="centro suave peq">¿Ya pagaste? En cuanto el equipo lo confirme, toca <button class="link" data-revisar>revisar de nuevo</button>.</p>
    </div>`;

  conectarPago(root);
  root.querySelector('[data-salir]').addEventListener('click', () => ctx.salir());
  root.querySelector('[data-revisar]').addEventListener('click', () => { datos.olvidarPerfil(); ctx.navegar('#/'); });
}
