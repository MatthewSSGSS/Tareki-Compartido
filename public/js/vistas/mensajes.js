// =============================================================================
// mensajes.js — Mensajes del equipo (#/equipo/mensajes).
// Se escriben una vez y salen como notificación a la hora elegida (o ya). A las
// familias además les quedan en su buzón dentro de la app (vista Papás).
// =============================================================================

import * as datos from '../datos.js';
import { MODO_DEMO } from '../config.js';
import { esc, hoy, fechaLocal, fechaBonita, plural } from '../util.js';
import { abrirHoja, cerrarHoja, confirmar, aviso, confeti, vacio } from '../ui.js';
import { fechaLarga } from '../acceso.js';
import { enviarEnSerie } from '../whatsapp.js';

const PLANTILLAS = [
  { emoji: '📢', nombre: 'Aviso general', titulo: '📢 Aviso de Learnground', cuerpo: '' , url: '#/inicio' },
  { emoji: '💳', nombre: 'Recordar pago', titulo: '💳 Recordatorio de mensualidad', cuerpo: 'Les recordamos pagar la mensualidad de Learnground para que el aprendizaje siga sin pausas. ¡Gracias!', url: '#/papas' },
  { emoji: '🎉', nombre: 'Felicitar', titulo: '🎉 ¡Felicitaciones!', cuerpo: '¡Qué semana! Se nota el esfuerzo. Sigan así 🐬', url: '#/logros' },
  { emoji: '📚', nombre: 'Lecciones nuevas', titulo: '📚 Hay lecciones nuevas', cuerpo: 'Ya subimos lecciones nuevas. ¡Ábranlas hoy y ganen estrellas!', url: '#/inicio' },
  { emoji: '📝', nombre: 'Antes de evaluación', titulo: '📝 Se viene evaluación', cuerpo: 'Esta semana hay evaluación en el colegio: practiquen la ficha y el simulacro 15 minutos al día.', url: '#/inicio' },
];
const DESTINOS = { todas: 'Todas las familias', familias: 'Algunas familias', equipo: 'Mi equipo' };
const ABRIR = [['#/inicio', 'Inicio del niño'], ['#/papas', 'Progreso (papás)'], ['#/logros', 'Medallas']];

const hora = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
const cuando = (iso) => `${fechaBonita(iso)} · ${hora(iso)}`;

export async function render(root, ctx) {
  const [lista, familias] = await Promise.all([datos.mensajes(), datos.familiasResumen()]);
  const pendientes = lista.filter((m) => !m.enviado).sort((a, b) => a.programado.localeCompare(b.programado));
  const enviados = lista.filter((m) => m.enviado);
  const nombreFamilia = (id) => familias.find((f) => f.id === id)?.nombre || 'familia';
  const aQuien = (m) => (m.destino === 'familias' ? (m.familias.length === 1 ? nombreFamilia(m.familias[0]) : plural(m.familias.length, 'familia', 'familias')) : DESTINOS[m.destino]);

  const fila = (m) => `<div class="mensaje-fila ${m.enviado ? '' : 'programado'}">
      <span class="em" aria-hidden="true">${m.enviado ? '✅' : '⏰'}</span>
      <div class="mf-texto"><b>${esc(m.titulo)}</b>${m.cuerpo ? `<p>${esc(m.cuerpo)}</p>` : ''}
        <small>${m.enviado ? `Enviado ${cuando(m.enviado)}` : `Sale ${cuando(m.programado)}`} · Para: ${esc(aQuien(m))}</small></div>
      <div class="mf-acciones">${m.enviado ? '' : `<button class="btn btn-peq btn-verde" data-ya="${esc(m.id)}">Enviar ya</button>`}
        <button class="btn-redondo" data-borrar="${esc(m.id)}" aria-label="Borrar mensaje" title="Borrar">✕</button></div>
    </div>`;

  root.innerHTML = `
    <div class="cabecera"><div><h1>✉️ Mensajes</h1><p class="bajada">Llegan como notificación y quedan en el buzón de cada familia.</p></div>
      <button class="btn" data-nuevo>✏️ Nuevo mensaje</button></div>
    ${MODO_DEMO ? '<div class="banda-demo"><span>🧪 En la demostración los mensajes quedan en el buzón pero no salen notificaciones.</span></div>' : ''}
    <div class="titulo-seccion"><h2>⏰ Programados</h2><span class="suave">${pendientes.length}</span></div>
    <div class="pila chica">${pendientes.length ? pendientes.map(fila).join('') : '<p class="suave">No hay mensajes esperando. Programa uno para un día y hora.</p>'}</div>
    <div class="titulo-seccion"><h2>📬 Enviados</h2><span class="suave">${enviados.length}</span></div>
    <div class="pila chica">${enviados.length ? enviados.map(fila).join('') : vacio({ emoji: '✉️', titulo: 'Aún no has enviado mensajes', texto: 'Usa una plantilla: recordar el pago, felicitar, avisar de lecciones nuevas…' })}</div>`;

  root.querySelector('[data-nuevo]').addEventListener('click', () => nuevoMensaje(familias, ctx));
  root.querySelectorAll('[data-ya]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    try { const r = await datos.enviarMensajeYa(b.dataset.ya); aviso(MODO_DEMO ? 'Mensaje enviado al buzón.' : `Enviado a ${plural(r?.personas || 0, 'persona', 'personas')}.`, { emoji: '📨' }); ctx.refrescar(); }
    catch (x) { aviso(x.message, { emoji: '⚠️' }); b.disabled = false; }
  }));
  root.querySelectorAll('[data-borrar]').forEach((b) => b.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: '¿Borrar este mensaje?', texto: 'Si ya se envió, también desaparece del buzón de las familias.', si: 'Borrar', peligro: true }))) return;
    await datos.borrarMensaje(b.dataset.borrar);
    ctx.refrescar();
  }));
  if (ctx.params[1] === 'nuevo') nuevoMensaje(familias, ctx);
}

function nuevoMensaje(familias, ctx) {
  const v = { titulo: '', cuerpo: '', url: '#/inicio', destino: 'todas', familias: [], ahora: true, dia: hoy(), hora: '18:00' };
  abrirHoja({
    titulo: 'Nuevo mensaje',
    ancha: true,
    cuerpo: `
      <div class="campo"><span class="etiqueta">Plantillas</span>
        <div class="materias">${PLANTILLAS.map((p, i) => `<button type="button" data-pl="${i}">${p.emoji} ${esc(p.nombre)}</button>`).join('')}</div></div>
      <div class="campo"><label for="mTitulo">Título</label><input id="mTitulo" maxlength="80" placeholder="Ej.: 📢 Mañana no hay clase"></div>
      <div class="campo"><label for="mCuerpo">Mensaje</label><textarea id="mCuerpo" maxlength="500" rows="3" placeholder="Lo que quieres contarles…"></textarea></div>
      <div class="campo"><span class="etiqueta">¿Para quién?</span>
        <div class="pestanas tres" role="radiogroup">${Object.entries(DESTINOS).map(([k, t]) => `<button type="button" role="radio" data-dest="${k}" aria-selected="${k === v.destino}">${t}</button>`).join('')}</div>
        <div class="elegir-familias" id="mFam" hidden>${familias.length ? familias.map((f) => `<label class="check-fam"><input type="checkbox" value="${esc(f.id)}"> ${esc(f.nombre)}</label>`).join('') : '<p class="suave peq">Aún no hay familias.</p>'}</div></div>
      <div class="campo"><label for="mUrl">Al tocar la notificación, abrir</label><select id="mUrl">${ABRIR.map(([u, t]) => `<option value="${u}">${t}</option>`).join('')}</select></div>
      <div class="campo"><span class="etiqueta">¿Cuándo?</span>
        <div class="pestanas" role="radiogroup"><button type="button" role="radio" data-cuando="ya" aria-selected="true">⚡ Ahora</button><button type="button" role="radio" data-cuando="luego" aria-selected="false">⏰ Programar</button></div>
        <div class="fila envolver" id="mProg" hidden><input id="mDia" type="date" min="${hoy()}" value="${v.dia}" style="flex:1;min-width:150px"><input id="mHora" type="time" value="${v.hora}" style="flex:1;min-width:120px"></div>
        <small id="mCuandoTxt" class="suave">Sale apenas toques «Enviar».</small></div>
      <label class="check-fam" id="mWaFila"><input type="checkbox" id="mWa"> 💬 Además enviarlo por WhatsApp a las familias (uno por uno)</label>
      <div class="vista-notif" aria-label="Vista previa"><span class="vn-ico"><img src="img/lulo-128.png" alt=""></span><div><b id="vnT">Título del mensaje</b><p id="vnC">Así se verá la notificación.</p></div></div>
      <p class="error" id="mErr" role="alert"></p>`,
    pie: '<button class="btn btn-verde" data-ok>📨 Enviar</button>',
    montar: (el) => {
      const $ = (s) => el.querySelector(s);
      const vista = () => { $('#vnT').textContent = $('#mTitulo').value || 'Título del mensaje'; $('#vnC').textContent = $('#mCuerpo').value || 'Así se verá la notificación.'; };
      const textoCuando = () => {
        if (v.ahora) { $('#mCuandoTxt').textContent = 'Sale apenas toques «Enviar».'; $('[data-ok]').textContent = '📨 Enviar'; return; }
        $('#mCuandoTxt').textContent = `Sale el ${fechaLarga($('#mDia').value)} a las ${$('#mHora').value} (puede tardar hasta 10 minutos).`;
        $('[data-ok]').textContent = '⏰ Programar';
      };
      el.querySelectorAll('[data-pl]').forEach((b) => b.addEventListener('click', () => {
        const p = PLANTILLAS[b.dataset.pl];
        $('#mTitulo').value = p.titulo; $('#mCuerpo').value = p.cuerpo; $('#mUrl').value = p.url; vista(); $('#mCuerpo').focus();
      }));
      ['#mTitulo', '#mCuerpo'].forEach((s) => $(s).addEventListener('input', vista));
      el.querySelectorAll('[data-dest]').forEach((b) => b.addEventListener('click', () => {
        v.destino = b.dataset.dest;
        el.querySelectorAll('[data-dest]').forEach((x) => x.setAttribute('aria-selected', x === b));
        $('#mFam').hidden = v.destino !== 'familias';
        $('#mWaFila').hidden = v.destino === 'equipo';
      }));
      el.querySelectorAll('[data-cuando]').forEach((b) => b.addEventListener('click', () => {
        v.ahora = b.dataset.cuando === 'ya';
        el.querySelectorAll('[data-cuando]').forEach((x) => x.setAttribute('aria-selected', x === b));
        $('#mProg').hidden = v.ahora; textoCuando();
      }));
      ['#mDia', '#mHora'].forEach((s) => $(s).addEventListener('change', textoCuando));
      $('[data-ok]').addEventListener('click', async (e) => {
        const titulo = $('#mTitulo').value.trim();
        const elegidas = [...el.querySelectorAll('#mFam input:checked')].map((x) => x.value);
        if (!titulo) { $('#mErr').textContent = 'Escribe el título (o elige una plantilla).'; return; }
        if (v.destino === 'familias' && !elegidas.length) { $('#mErr').textContent = 'Elige al menos una familia.'; return; }
        let programado = null;
        if (!v.ahora) {
          programado = new Date(`${$('#mDia').value}T${$('#mHora').value}:00`);
          if (!(programado > new Date())) { $('#mErr').textContent = 'Esa hora ya pasó. Elige una más adelante.'; return; }
        }
        e.target.disabled = true;
        // Se lee antes de cerrar la ventana (al cerrarla, su contenido desaparece)
        const porWa = $('#mWa').checked && v.destino !== 'equipo';
        const textoWa = `${titulo}\n\n${$('#mCuerpo').value}`.trim();
        try {
          const m = await datos.crearMensaje({ titulo, cuerpo: $('#mCuerpo').value, url: $('#mUrl').value, destino: v.destino, familias: elegidas, programado });
          cerrarHoja();
          if (porWa) {
            const para = v.destino === 'todas' ? familias : familias.filter((f) => elegidas.includes(f.id));
            ctx.refrescar();
            setTimeout(() => enviarEnSerie(para, textoWa), 400);
            return;
          }
          if (m.enviado || m.resultado) { confeti(); aviso(MODO_DEMO ? 'Mensaje enviado al buzón.' : `¡Enviado a ${plural(m.resultado?.personas || 0, 'persona', 'personas')}!`, { emoji: '📨', ms: 5000 }); }
          else aviso(`Programado: ${fechaLarga(fechaLocal(programado))}, ${hora(programado)}`, { emoji: '⏰', ms: 5000 });
          ctx.refrescar();
        } catch (x) { $('#mErr').textContent = x.message; e.target.disabled = false; }
      });
    },
  });
}
