// =============================================================================
// perfiles.js — "¿Quién va a estudiar hoy?" Cada hijo tiene su perfil.
// La primera vez, papá o mamá crean el perfil junto con el niño.
// =============================================================================

import * as datos from '../datos.js';
import { AVATARES, COLORES, GRADOS } from '../config.js';
import { esc, primerNombre } from '../util.js';
import { abrirHoja, cerrarHoja, aviso, confeti, lulo } from '../ui.js';
import { bannerVence, conectarBanner } from '../acceso.js';

export async function render(root, ctx) {
  const lista = await datos.ninos();
  const nombre = primerNombre(ctx.usuario.nombre);

  root.innerHTML = `
    <div class="cabecera">
      <span class="fila"><span class="marca-logo" aria-hidden="true">🦉</span><span class="marca-nombre">Tare<b>ki</b></span></span>
      <span class="fila"><a class="btn btn-peq btn-blanco" href="#/papas">👨‍👩‍👧 Papás</a><button class="btn-redondo" data-salir title="Salir" aria-label="Salir">🚪</button></span>
    </div>
    ${bannerVence(ctx.usuario)}
    ${lista.length
      ? `<h1 class="centro" style="font-size:2.1em;margin:18px 0 6px">¿Quién va a estudiar hoy?</h1>
         <p class="centro suave" style="margin-bottom:22px">Toca tu foto para entrar</p>`
      : `<div class="pila" style="max-width:560px;margin:10px auto 22px">
           <h1 class="centro" style="font-size:2em">¡Bienvenida, familia${nombre ? ` de ${esc(nombre)}` : ''}! 🎉</h1>
           ${lulo('Soy <b>Lulo</b> 🦉. Creen juntos el perfil de su hijo o hija: que escoja su animal y su color favorito.')}
         </div>`}
    <div class="perfiles" style="max-width:760px;margin:0 auto">
      ${lista.map((n) => `
        <div class="card perfil" role="button" tabindex="0" data-id="${esc(n.id)}" aria-label="Entrar como ${esc(n.nombre)}">
          <span class="av" style="background:${esc(n.color)}">${esc(n.avatar)}</span>
          <h3>${esc(n.nombre)}</h3>
          <span class="chip">${esc(n.grado)}.º grado</span>
          <button class="link peq" data-editar="${esc(n.id)}">✏️ Editar</button>
        </div>`).join('')}
      <button class="card perfil agregar" data-nuevo><span class="av">＋</span><h3>${lista.length ? 'Agregar otro' : 'Crear perfil'}</h3></button>
    </div>`;

  const entrar = (id) => { ctx.elegirPerfil(id); ctx.navegar('#/inicio'); };
  root.querySelectorAll('.perfil[data-id]').forEach((el) => {
    el.addEventListener('click', (e) => { if (!e.target.closest('[data-editar]')) entrar(el.dataset.id); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); entrar(el.dataset.id); } });
  });
  root.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    abrirFormularioNino(lista.find((n) => n.id === b.dataset.editar), () => ctx.refrescar());
  }));
  root.querySelector('[data-nuevo]').addEventListener('click', () => abrirFormularioNino(null, (n) => {
    datos.avisarNinoNuevo(n.id).catch(() => {}); // el equipo ya le puede subir lecciones
    confeti();
    aviso(`¡Hola, ${n.nombre}! Ya tienes tu perfil.`, { emoji: n.avatar });
    entrar(n.id);
  }));
  root.querySelector('[data-salir]').addEventListener('click', () => ctx.salir());
  conectarBanner(root, ctx.usuario);
  if (!lista.length) setTimeout(() => root.querySelector('[data-nuevo]')?.click(), 400);
}

/** Formulario para crear o editar el perfil de un niño. */
export function abrirFormularioNino(nino, alGuardar) {
  const v = { nombre: nino?.nombre || '', avatar: nino?.avatar || AVATARES[0], color: nino?.color || COLORES[0], grado: nino?.grado || '4' };
  abrirHoja({
    titulo: nino ? `Editar a ${nino.nombre}` : 'Nuevo perfil',
    cuerpo: `
      <div class="centro"><span class="av" id="pVista" style="width:96px;height:96px;font-size:58px;background:${esc(v.color)}">${esc(v.avatar)}</span></div>
      <div class="campo"><label for="pNombre">¿Cómo se llama?</label><input id="pNombre" maxlength="24" value="${esc(v.nombre)}" autocomplete="off" autofocus></div>
      <div class="campo"><span class="etiqueta">Escoge tu animal</span>
        <div class="avatares">${AVATARES.map((a) => `<button type="button" data-av="${a}" aria-pressed="${a === v.avatar}" aria-label="${a}">${a}</button>`).join('')}</div></div>
      <div class="campo"><span class="etiqueta">Tu color favorito</span>
        <div class="colores">${COLORES.map((c) => `<button type="button" data-color="${c}" style="background:${c}" aria-pressed="${c === v.color}" aria-label="Color ${c}"></button>`).join('')}</div></div>
      <div class="campo"><span class="etiqueta">Grado</span>
        <div class="grados">${GRADOS.map((g) => `<button type="button" data-grado="${g}" aria-pressed="${g === v.grado}">${g}.º</button>`).join('')}</div></div>
      <p class="error" id="pErr" role="alert"></p>`,
    pie: `<button class="btn btn-verde" data-guardar>${nino ? 'Guardar' : '¡Listo!'}</button>`,
    montar: (el) => {
      const vista = el.querySelector('#pVista');
      const marcar = (sel, attr, val) => el.querySelectorAll(sel).forEach((b) => b.setAttribute('aria-pressed', b.dataset[attr] === val));
      el.querySelectorAll('[data-av]').forEach((b) => b.addEventListener('click', () => { v.avatar = b.dataset.av; vista.textContent = v.avatar; marcar('[data-av]', 'av', v.avatar); }));
      el.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => { v.color = b.dataset.color; vista.style.background = v.color; marcar('[data-color]', 'color', v.color); }));
      el.querySelectorAll('[data-grado]').forEach((b) => b.addEventListener('click', () => { v.grado = b.dataset.grado; marcar('[data-grado]', 'grado', v.grado); }));
      el.querySelector('[data-guardar]').addEventListener('click', async () => {
        try {
          const n = await datos.guardarNino({ id: nino?.id, ...v, nombre: el.querySelector('#pNombre').value });
          cerrarHoja();
          alGuardar?.(n);
        } catch (x) { el.querySelector('#pErr').textContent = x.message; }
      });
    },
  });
}
