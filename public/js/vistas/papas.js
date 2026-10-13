// =============================================================================
// papas.js — Rendimiento de un niño, con consejos (#/papas y #/papas/<niñoId>).
// La familia ve a sus hijos; el equipo llega aquí desde su panel y además puede
// ver la vista previa de cada lección o quitarla.
// =============================================================================

import * as datos from '../datos.js';
import { cargarNino, materia } from '../carga.js';
import { consejosPapas } from '../analisis.js';
import { ESCALA } from '../config.js';
import { esc, fechaBonita, fechaCorta, minutosTexto, nivelNota, plural, primerNombre, DIAS_CORTOS } from '../util.js';
import { abrirHoja, cerrarHoja, confirmar, aviso, barra, estrellas, graficoBarras, claseNota, vacio } from '../ui.js';
import { coincidencias } from '../revision.js';
import { MATERIAS } from '../config.js';
import { tarjetaAvisos } from '../avisos.js';
import { pintarBuzon } from '../buzon.js';
import { numeroBonito, numeroWa, linkWa } from '../whatsapp.js';
import { bannerVence, conectarBanner, abrirComoPagar, estadoAcceso, fechaLarga } from '../acceso.js';
import { abrirPedir, pintarMisPedidos } from './pedidos.js';
import { abrirApariencia } from '../apariencia.js';

export async function render(root, ctx) {
  const esEquipo = ctx.usuario.rol === 'equipo';
  const lista = await datos.ninos();
  if (esEquipo && !ctx.params[0]) return ctx.navegar('#/equipo/ninos');
  if (!lista.length) {
    root.innerHTML = vacio({ emoji: '👨‍👩‍👧', titulo: 'Primero creen un perfil', texto: 'Aquí verán el progreso de cada niño.', accion: '<a class="btn" href="#/perfiles">Crear perfil</a>' });
    return;
  }
  const elegido = ctx.params[0] || ctx.perfil?.id || lista[0].id;
  const d = await cargarNino(elegido);
  const { nino, analisis, resumen, racha, actividad } = d;
  const n = nino.nombre;
  const consejos = consejosPapas({ nino, resumen, racha, actividad, analisis });

  const minutosDias = racha.semana.map((x) => ({
    etiqueta: DIAS_CORTOS[new Date(`${x.dia}T12:00:00`).getDay()] + (x.hoy ? ' (hoy)' : ''),
    valor: x.minutos, clase: x.activo ? 'verde' : 'vacio', titulo: `${fechaBonita(x.dia)}: ${minutosTexto(x.minutos)}`,
  }));
  const notas = resumen.notas.slice(-10).map((x) => ({ etiqueta: fechaCorta(x.dia), valor: x.nota, clase: claseNota(x.nota), titulo: `${x.titulo} · ${fechaBonita(x.dia)}: ${x.nota}/100` }));
  const temas = [...resumen.debiles, ...analisis.flatMap((a) => a.temas.filter((t) => t.pct >= 70).map((t) => ({ ...t, titulo: a.leccion.titulo })))];
  const prom = resumen.promedio;

  root.innerHTML = `
    ${esEquipo
      ? `<div class="cabecera"><a class="btn btn-peq btn-blanco" href="#/equipo/ninos">← Niños</a><span class="chip">Familia: ${esc(nino.familia?.nombre || '—')}</span></div>`
      : lista.length > 1 ? `<div class="selector-ninos" role="group" aria-label="Elegir niño">${lista.map((x) => `<button data-nino="${esc(x.id)}" aria-pressed="${x.id === nino.id}"><span class="av" style="background:${esc(x.color)}">${esc(x.avatar)}</span>${esc(x.nombre)}</button>`).join('')}</div>` : ''}
    <div class="cabecera">
      <h1>${esc(nino.avatar)} Progreso de ${esc(n)}</h1>
      ${esEquipo ? `<a class="btn btn-peq" href="#/equipo/subir/${esc(nino.id)}">⬆️ Subir lección</a>` : ''}
    </div>

    <div class="kpis">
      <div class="card kpi"><span>Racha</span><b>🔥 ${racha.actual}</b><small>${racha.hoyListo ? 'Hoy ya estudió' : racha.enRiesgo ? 'Hoy aún no estudia' : 'Sin racha activa'} · récord ${racha.mejor}</small></div>
      <div class="card kpi"><span>Esta semana</span><b>${minutosTexto(d.minutosSemana)}</b><small>${plural(racha.semana.filter((x) => x.activo).length, 'día activo', 'días activos')} de 7</small></div>
      <div class="card kpi"><span>Nota promedio</span><b>${prom != null ? `${nivelNota(prom).emoji} ${prom}` : '—'}</b><small>${prom != null ? `Desempeño ${nivelNota(prom).nombre} · última ficha de cada lección` : 'Aún no presenta fichas'}</small></div>
      <div class="card kpi"><span>Lecciones</span><b>🎓 ${resumen.terminadas}/${analisis.length}</b><small>${resumen.enCurso} en curso · ${resumen.nuevas} sin abrir</small></div>
    </div>

    ${esEquipo ? '' : `
      <div class="titulo-seccion"><h2>👤 Tu cuenta</h2></div>
      <div class="cuenta">
        <div class="card cuenta-pago ${estadoAcceso(ctx.usuario).dias <= 3 ? 'pronto' : ''}">
          <span class="em" aria-hidden="true">💳</span>
          <div><span class="suave peq">Acceso hasta el</span><b>${fechaLarga(estadoAcceso(ctx.usuario).hasta)}</b>
            <small class="suave">${estadoAcceso(ctx.usuario).dias === 0 ? 'Hoy es el último día' : estadoAcceso(ctx.usuario).dias <= 3 ? `Vence en ${estadoAcceso(ctx.usuario).dias === 1 ? '1 día' : `${estadoAcceso(ctx.usuario).dias} días`}` : 'Mensualidad al día ✓'}</small></div>
          <button class="btn btn-peq ${estadoAcceso(ctx.usuario).dias <= 3 ? 'btn-sol' : 'btn-blanco'}" data-pagar>Cómo pagar</button>
        </div>
        <div id="avisos"></div>
      </div>
      <div class="card cuenta-cel"><span class="em" aria-hidden="true">📱</span><div><span class="suave peq">Tu WhatsApp</span><b>${ctx.usuario.celular ? esc(numeroBonito(ctx.usuario.celular)) : 'Sin registrar'}</b><small class="suave">Aquí te escribimos sobre pagos y novedades.</small></div><button class="btn btn-peq btn-blanco" data-cel>${ctx.usuario.celular ? 'Cambiar' : 'Agregar'}</button></div>
      <div class="card cuenta-cel"><span class="em" aria-hidden="true">🎨</span><div><span class="suave peq">Apariencia</span><b>Brillo y modo oscuro</b><small class="suave">Baja el brillo si la pantalla cansa la vista.</small></div><button class="btn btn-peq btn-blanco" data-apariencia-p>Ajustar</button></div>
      <div class="card escribenos" id="escribenos"><span class="em" aria-hidden="true">💬</span><div><b>¿Dudas? Escríbenos</b><small class="suave">Le llega a todo el equipo de Learnground.</small></div>
        <div class="fila envolver"><a class="btn btn-peq" href="#/chat">💬 Chat con el equipo <span class="chip" id="chatN" hidden></span></a><a class="btn btn-peq btn-wa" id="waEquipo" target="_blank" rel="noopener" hidden>WhatsApp</a></div></div>
      <div class="card escribenos pedir"><span class="em" aria-hidden="true">📚</span><div><b>¿Necesitan una lección?</b><small class="suave">Cuéntanos los temas y súbenos fotos del cuaderno o la guía: nosotros la armamos.</small></div>
        <div class="fila envolver"><button class="btn btn-peq btn-sol" data-pedir>📚 Pedir una lección</button></div></div>
      <div id="misPedidos"></div>
      <section class="card" style="margin-top:14px"><h2>📬 Avisos del equipo</h2><div id="buzon"></div></section>`}
    <div class="sep"></div>
    <div class="columnas">
      <section class="card ancho"><h2>💡 Qué hacer esta semana</h2>
        <div class="consejos">${consejos.map((c) => `<div class="consejo ${c.tono}"><span class="em" aria-hidden="true">${c.emoji}</span><div><b>${esc(c.titulo)}</b><p>${esc(c.texto)}</p></div></div>`).join('')}</div>
      </section>

      <section class="card"><h2>📈 Notas de las fichas <small>de 1 a 100</small></h2>
        ${notas.length ? graficoBarras(notas) + `<p class="suave peq" style="margin-top:8px">${ESCALA}</p>` : '<p class="suave">Cuando presente la ficha de una lección, aquí verán cómo evoluciona su nota.</p>'}
      </section>

      <section class="card"><h2>⏱️ Tiempo de estudio <small>últimos 7 días</small></h2>
        ${graficoBarras(minutosDias, { max: 30, sufijo: '′' })}
        <p class="suave peq" style="margin-top:8px">Un día cuenta para la racha con 5 minutos o un juego terminado.</p>
      </section>

      <section class="card"><h2>🎯 Por tema <small>últimas fichas</small></h2>
        ${temas.length ? `<div class="temas">${temas.map((t) => `<div class="tema"><span>${t.emoji} ${esc(t.nombre)}<small>${esc(t.titulo)}</small></span>${barra(t.pct, claseNota(t.pct))}<b>${t.ok}/${t.total}</b></div>`).join('')}</div>`
          : '<p class="suave">Los temas aparecen cuando presente una ficha.</p>'}
      </section>

      <section class="card"><h2>📚 Lecciones</h2>
        ${analisis.length ? `<div class="lista-lecciones">${analisis.map((a) => {
          const m = materia(a.leccion.materia);
          const nota = a.ultimaNota;
          return `<button class="fila-leccion" data-detalle="${esc(a.leccion.id)}">
            <span class="icono" style="background:${m.color}" aria-hidden="true">${m.emoji}</span>
            <span><b>${esc(a.leccion.titulo)}</b><small>${a.estado === 'nueva' ? `Sin abrir · llegó ${fechaBonita(a.leccion.creada)}` : `${a.progreso}% · ${a.ultimaVez ? `última vez ${fechaBonita(a.ultimaVez)}` : ''}`}</small>${a.estado === 'nueva' ? '' : barra(a.progreso, a.estado === 'terminada' ? 'verde' : 'sol')}</span>
            <span class="nota ${nota != null ? nivelNota(nota).clase : 'sin'}" title="Última ficha">${nota != null ? nota : 'sin<br>ficha'}</span>
          </button>`;
        }).join('')}</div>` : '<p class="suave">Todavía no tiene lecciones.</p>'}
      </section>
    </div>`;

  if (!esEquipo) {
    tarjetaAvisos(root.querySelector('#avisos'));
    pintarBuzon(root.querySelector('#buzon'));
    datos.chatSinLeer().then((n) => { const c = root.querySelector('#chatN'); if (n && c) { c.textContent = `${n} nuevo${n > 1 ? 's' : ''}`; c.hidden = false; } }).catch(() => {});
    datos.ajustesCobro().then((c) => { const a = root.querySelector('#waEquipo'); if (a && numeroWa(c.whatsapp)) { a.href = linkWa(c.whatsapp, `Hola 👋 Soy ${ctx.usuario.nombre}, de Learnground.`); a.hidden = false; } }).catch(() => {});
    root.querySelector('[data-cel]')?.addEventListener('click', () => editarCelular(ctx.usuario.id, ctx.usuario.celular, () => ctx.refrescar()));
    root.querySelector('[data-pagar]')?.addEventListener('click', () => abrirComoPagar(ctx.usuario));
    pintarMisPedidos(root.querySelector('#misPedidos'), ctx);
    root.querySelector('[data-apariencia-p]')?.addEventListener('click', () => abrirApariencia());
    root.querySelector('[data-pedir]')?.addEventListener('click', () => abrirPedir(ctx, { alEnviar: () => pintarMisPedidos(root.querySelector('#misPedidos'), ctx) }));
  }
  root.querySelectorAll('[data-nino]').forEach((b) => b.addEventListener('click', () => {
    if (ctx.perfil) ctx.elegirPerfil(b.dataset.nino);
    ctx.refrescar();
  }));
  root.querySelectorAll('[data-detalle]').forEach((b) => b.addEventListener('click', () => {
    const a = analisis.find((x) => x.leccion.id === b.dataset.detalle);
    detalleLeccion(a, nino, { esEquipo, alCambiar: () => ctx.refrescar() });
  }));
}

/** Pide el celular (WhatsApp) y lo guarda. Lo usan la familia (Papás) y el equipo (ficha de la familia). */
export function editarCelular(familiaId, actual, alGuardar) {
  abrirHoja({
    titulo: 'Celular de WhatsApp',
    cuerpo: `<div class="campo"><label for="celNuevo">Número</label><input id="celNuevo" type="tel" inputmode="tel" value="${esc(actual || '')}" placeholder="300 123 4567" autofocus><small>Si es de Colombia, basta con los 10 dígitos.</small></div><p class="error" id="celErr" role="alert"></p>`,
    pie: '<button class="btn" data-ok>Guardar</button>',
    montar: (el) => el.querySelector('[data-ok]').addEventListener('click', async () => {
      const v = el.querySelector('#celNuevo').value.replace(/\D/g, '');
      if (v.length < 10) { el.querySelector('#celErr').textContent = 'Escribe el número completo (10 dígitos).'; return; }
      try { await datos.cambiarCelular(familiaId, v); cerrarHoja(); aviso('Celular guardado.', { emoji: '📱' }); alGuardar?.(); }
      catch (x) { el.querySelector('#celErr').textContent = x.message; }
    }),
  });
}

/** Ventana con todo lo de una lección: juegos, fichas, temas y tips de la lección. */
function detalleLeccion(a, nino, { esEquipo, alCambiar }) {
  const n = nino.nombre;
  const t = a.tips || {};
  const lista = (titulo, items) => (items?.length ? `<div class="detalle-tips"><h3>${titulo}</h3><ul class="limpia">${items.map((x) => `<li>${esc(String(x).replace(/\{nombre\}/g, n))}</li>`).join('')}</ul></div>` : '');
  abrirHoja({
    titulo: a.leccion.titulo,
    ancha: true,
    cuerpo: `
      <div class="kpis">
        <div class="card plano kpi"><span>Progreso</span><b>${a.progreso}%</b>${barra(a.progreso, 'verde')}</div>
        <div class="card plano kpi"><span>Mejor ficha</span><b>${a.fichaMejor ?? '—'}</b><small>${a.historial.length ? plural(a.historial.length, 'intento', 'intentos') : 'Sin presentar'}</small></div>
        <div class="card plano kpi"><span>Simulacro</span><b>${a.simulacro ?? '—'}</b><small>${a.simulacro ? nivelNota(a.simulacro).nombre : 'Sin presentar'}</small></div>
        <div class="card plano kpi"><span>Jefe final</span><b>${a.jefe ? '⚔️' : '—'}</b><small>${a.jefe ? estrellas(a.jefe) : a.tieneJefe ? 'Sin vencer' : '—'}</small></div>
      </div>
      ${a.historial.length ? `<div><h3 style="margin-bottom:6px">Fichas presentadas</h3>${graficoBarras(a.historial.map((h) => ({ etiqueta: fechaCorta(h.dia), valor: h.nota, clase: claseNota(h.nota), titulo: `${fechaBonita(h.dia)}: ${h.nota}/100 en ${minutosTexto(h.segundos / 60)}` })), { alto: 110 })}</div>` : ''}
      ${a.temas.length ? `<div><h3 style="margin-bottom:6px">Por tema</h3><div class="temas">${a.temas.map((x) => `<div class="tema"><span>${x.emoji} ${esc(x.nombre)}${x.pregunta && x.pct < 100 ? `<small>Pregúntale: «${esc(x.pregunta)}»</small>` : ''}</span>${barra(x.pct, claseNota(x.pct))}<b>${x.ok}/${x.total}</b></div>`).join('')}</div></div>` : ''}
      ${a.juegos.length ? `<div><h3 style="margin-bottom:6px">Juegos (${a.jugados} de ${a.juegos.length})</h3><div class="mini-juegos">${a.juegos.map((j) => `<div><span>${esc(j.emoji || '🎮')} ${esc(j.nombre)}${j.dificil ? ' 🔥' : ''}</span>${estrellas(j.estrellas)}</div>`).join('')}</div></div>` : ''}
      ${lista('💡 Consejos para explicar', t.consejos)}
      ${lista('⚠️ Errores comunes', t.errores)}
      ${lista('❓ Preguntas para hacerle', t.preguntas)}
      ${t.casa ? `<div class="detalle-tips"><h3>🏠 Para seguir en casa</h3><p>${esc(String(t.casa).replace(/\{nombre\}/g, n))}</p></div>` : ''}
      ${!a.meta?.titulo ? '<p class="suave peq">Los tips de la lección aparecen después de abrirla por primera vez.</p>' : ''}
      ${esEquipo ? `<div class="card plano pila chica" style="background:var(--soft)">
        <h3>🛠️ Solo para el equipo</h3>
        <p class="suave peq">Versión ${a.leccion.version || 1}${a.leccion.actualizada ? ` · archivo actualizado ${fechaBonita(a.leccion.actualizada)}` : ''}. Si la lección tiene un error, sube la versión corregida: ${esc(n)} conserva sus estrellas, notas y racha.</p>
        <div class="fila envolver">
          <label class="btn btn-peq btn-sol" style="position:relative;overflow:hidden">🔁 Reemplazar archivo<input type="file" accept=".html,.htm,text/html" data-reemplazar style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
          <button class="btn btn-peq btn-blanco" data-editar>✏️ Cambiar título o materia</button>
        </div></div>` : ''}`,
    pie: `${esEquipo ? '<button class="btn btn-peligro" data-borrar>Quitar lección</button>' : ''}<a class="btn" href="#/leccion/${esc(a.leccion.id)}">Abrir lección</a>`,
    montar: (el) => {
      el.querySelector('[data-reemplazar]')?.addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        reemplazar(a, nino, await f.text(), f.name, alCambiar);
      });
      el.querySelector('[data-editar]')?.addEventListener('click', () => editarLeccion(a, alCambiar));
      el.querySelector('[data-borrar]')?.addEventListener('click', async () => {
        const ok = await confirmar({ titulo: '¿Quitar esta lección?', texto: `${esc(n)} ya no la verá y se borra su progreso en ella. No se puede deshacer.`, si: 'Quitar', peligro: true });
        if (!ok) return;
        await datos.borrarLeccion(a.leccion.id);
        cerrarHoja();
        aviso('Lección quitada.', { emoji: '🗑️' });
        alCambiar();
      });
    },
  });
}

/** Revisa la versión corregida y, si se confirma, cambia el archivo sin tocar el progreso. */
async function reemplazar(a, nino, html, nombreArchivo, alCambiar) {
  const todos = await datos.ninos();
  const coinc = coincidencias(html, todos);
  const otros = coinc.filter((c) => c.nino.id !== nino.id).map((c) => c.nino.nombre);
  const avisos = [];
  if (!coinc.some((c) => c.nino.id === nino.id)) avisos.push(`El archivo nuevo no menciona a ${nino.nombre}.`);
  if (otros.length) avisos.push(`El archivo nuevo menciona a ${otros.join(', ')}. Revisa que no traiga datos de otra familia.`);
  abrirHoja({
    titulo: '¿Reemplazar el archivo?',
    cuerpo: `<p>Se cambia el archivo de <b>«${esc(a.leccion.titulo)}»</b> por <b>${esc(nombreArchivo)}</b>.</p>
      <div class="ok-caja">✅ ${esc(nino.nombre)} conserva sus estrellas, notas y racha.</div>
      ${avisos.map((x) => `<div class="alerta-caja">⚠️ ${esc(x)}</div>`).join('')}`,
    pie: '<button class="btn btn-blanco" data-no>Cancelar</button><button class="btn btn-verde" data-si>Reemplazar</button>',
    montar: (el) => {
      el.querySelector('[data-no]').addEventListener('click', () => cerrarHoja());
      el.querySelector('[data-si]').addEventListener('click', async (e) => {
        e.target.disabled = true; e.target.textContent = 'Subiendo…';
        try {
          await datos.reemplazarArchivo(a.leccion.id, html);
          cerrarHoja();
          aviso(`Archivo reemplazado. ${nino.nombre} ya ve la versión nueva.`, { emoji: '🔁', ms: 5000 });
          alCambiar();
        } catch (x) { e.target.disabled = false; e.target.textContent = 'Reemplazar'; aviso(x.message, { emoji: '⚠️' }); }
      });
    },
  });
}

function editarLeccion(a, alCambiar) {
  let mat = a.leccion.materia;
  abrirHoja({
    titulo: 'Cambiar título o materia',
    cuerpo: `<div class="campo"><label for="eTitulo">Título que ve el niño</label><input id="eTitulo" maxlength="80" value="${esc(a.leccion.titulo)}" autofocus></div>
      <div class="campo"><span class="etiqueta">Materia</span><div class="materias">${MATERIAS.map((m) => `<button type="button" data-mat="${m.id}" aria-pressed="${m.id === mat}">${m.emoji} ${esc(m.nombre)}</button>`).join('')}</div></div>
      <p class="error" id="eErr" role="alert"></p>`,
    pie: '<button class="btn" data-guardar>Guardar</button>',
    montar: (el) => {
      el.querySelectorAll('[data-mat]').forEach((b) => b.addEventListener('click', () => { mat = b.dataset.mat; el.querySelectorAll('[data-mat]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
      el.querySelector('[data-guardar]').addEventListener('click', async () => {
        try {
          await datos.cambiarLeccion(a.leccion.id, { titulo: el.querySelector('#eTitulo').value, materia: mat });
          cerrarHoja(); aviso('Lección actualizada.', { emoji: '✏️' }); alCambiar();
        } catch (x) { el.querySelector('#eErr').textContent = x.message; }
      });
    },
  });
}
