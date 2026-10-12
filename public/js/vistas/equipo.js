// =============================================================================
// equipo.js — Panel del equipo Tareki.
//   #/equipo              Resumen: quién necesita atención
//   #/equipo/subir[/id]   Subir una o varias lecciones HTML y asignarlas
//   #/equipo/ninos        Todos los niños y familias
//   #/equipo/codigos      Códigos de invitación para familias nuevas
// =============================================================================

import * as datos from '../datos.js';
import { MATERIAS, MODO_DEMO } from '../config.js';
import { cargarNino, materia } from '../carga.js';
import { tituloDeHtml } from '../puente.js';
import { coincidencias } from '../revision.js';
import { esc, plano, primerNombre, fechaBonita, diasEntre, hoy, plural } from '../util.js';
import { abrirHoja, cerrarHoja, confirmar, aviso, confeti, vacio } from '../ui.js';

export function render(root, ctx) {
  const sec = ctx.params[0] || 'resumen';
  if (sec === 'subir') return subir(root, ctx);
  if (sec === 'ninos') return ninos(root, ctx);
  if (sec === 'codigos') return codigos(root, ctx);
  return resumen(root, ctx);
}

const filaNino = (n, extra = '') => `
  <a class="tabla-fila" href="#/papas/${esc(n.id)}">
    <span class="av" style="background:${esc(n.color)}">${esc(n.avatar)}</span>
    <span><b>${esc(n.nombre)}</b><small>${esc(n.familia?.nombre || '')} · ${esc(n.grado)}.º</small></span>
    <span class="lado-der">${extra}</span>
  </a>`;

async function infoNinos() {
  const lista = await datos.ninos();
  return Promise.all(lista.map(async (n) => {
    const d = await cargarNino(n.id);
    const dias = d.actividad.filter((a) => a.minutos || a.logros).map((a) => a.dia).sort();
    return { ...n, d, ultimoDia: dias.at(-1) || null };
  }));
}

// --- Resumen ----------------------------------------------------------------------------
async function resumen(root, ctx) {
  const [lista, fams, lecciones] = await Promise.all([infoNinos(), datos.familias(), datos.todasLasLecciones()]);
  const activosHoy = lista.filter((n) => n.ultimoDia === hoy()).length;
  const atencion = [];
  for (const n of lista) {
    const sin = n.ultimoDia ? diasEntre(n.ultimoDia, hoy()) : null;
    if (!n.d.lecciones.length) atencion.push({ n, por: '📭 No tiene lecciones', clase: 'sol' });
    else if (sin === null) atencion.push({ n, por: '😴 Nunca ha estudiado', clase: 'rojo' });
    else if (sin >= 3) atencion.push({ n, por: `⏰ ${sin} días sin estudiar`, clase: 'rojo' });
    const baja = n.d.analisis.find((a) => a.ultimaNota != null && a.ultimaNota < 60);
    if (baja) atencion.push({ n, por: `📉 ${baja.ultimaNota} en «${baja.leccion.titulo}»`, clase: 'rojo' });
  }
  const recientes = [...lista].sort((a, b) => (b.ultimoDia || '').localeCompare(a.ultimoDia || ''));

  root.innerHTML = `
    ${MODO_DEMO ? `<div class="banda-demo"><span>🧪 <b>Modo demostración:</b> datos de prueba guardados solo en este navegador.</span><button class="btn btn-peq btn-blanco" data-reiniciar>Reiniciar datos</button></div>` : ''}
    <div class="cabecera"><h1>Hola, ${esc(primerNombre(ctx.usuario.nombre))} 👋</h1>
      <span class="fila"><a class="btn btn-peq" href="#/equipo/subir">⬆️ Subir lección</a><a class="btn btn-peq btn-sol" href="#/equipo/codigos">🎟️ Código</a></span></div>
    <div class="kpis">
      <div class="card kpi"><span>Familias</span><b>👨‍👩‍👧 ${fams.length}</b></div>
      <div class="card kpi"><span>Niños</span><b>🧒 ${lista.length}</b></div>
      <div class="card kpi"><span>Lecciones asignadas</span><b>📚 ${lecciones.length}</b></div>
      <div class="card kpi"><span>Estudiaron hoy</span><b>🔥 ${activosHoy}</b><small>de ${lista.length}</small></div>
    </div>
    <div class="sep"></div>
    <div class="columnas">
      <section class="card"><h2>🚨 Necesitan atención</h2>
        ${atencion.length ? `<div class="tabla">${atencion.map(({ n, por, clase }) => filaNino(n, `<span class="chip ${clase}">${esc(por)}</span>`)).join('')}</div>` : '<p class="suave">¡Todo en orden! 🎉</p>'}
      </section>
      <section class="card"><h2>📅 Actividad reciente</h2>
        ${recientes.length ? `<div class="tabla">${recientes.map((n) => filaNino(n, `<span class="chip ${n.d.racha.actual ? 'sol' : ''}">🔥 ${n.d.racha.actual}</span><span class="chip">${n.ultimoDia ? fechaBonita(n.ultimoDia) : 'nunca'}</span>`)).join('')}</div>` : '<p class="suave">Aún no hay niños registrados.</p>'}
      </section>
    </div>`;

  root.querySelector('[data-reiniciar]')?.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: '¿Reiniciar los datos de prueba?', texto: 'Se borra todo lo que hayas creado en este navegador y vuelven los datos de ejemplo.', si: 'Reiniciar', peligro: true }))) return;
    await datos.reiniciarDemo();
    location.hash = '#/entrar';
    location.reload();
  });
}

// --- Subir lecciones --------------------------------------------------------------------------
// Se pueden soltar varios HTML a la vez. Para cada uno se sugiere el niño según el
// nombre que trae adentro (el nombre completo pesa más que el primer nombre), y se
// avisa si menciona a otros niños de Tareki o si el niño ya tiene una lección igual.

const MAX_BYTES = 10 * 1024 * 1024;

async function subir(root, ctx) {
  const [lista, lecciones] = await Promise.all([datos.ninos(), datos.todasLasLecciones()]);
  const fijo = lista.find((n) => n.id === ctx.params[1]) || null;
  const archivos = [];

  root.innerHTML = `
    <div class="cabecera"><h1>⬆️ Subir lecciones</h1>${fijo ? `<span class="chip sol">Para ${esc(fijo.nombre)}</span>` : ''}</div>
    <label class="zona-archivo" id="zona">
      <input type="file" accept=".html,.htm,text/html" id="archivo" multiple>
      <span class="em" aria-hidden="true">📚</span>
      <b>Arrastra aquí una o varias lecciones HTML<br><span class="suave peq">o toca para buscarlas · la app sugiere el niño de cada una según el nombre que trae</span></b>
    </label>
    ${lista.length ? '' : '<div class="alerta-caja" style="margin-top:14px">Todavía no hay niños. Primero cada familia crea su cuenta (con un código) y el perfil de su hijo o hija.</div>'}
    <div id="lista" class="pila" style="margin-top:18px"></div>`;
  const $lista = root.querySelector('#lista');

  function revisar(a) {
    const out = [];
    if (a.tamano > MAX_BYTES) out.push({ ok: false, texto: 'Pesa más de 10 MB. Revisa que no tenga fotos muy pesadas.' });
    if (!a.ninoId) {
      out.push({ ok: false, texto: a.coinc.length ? `Menciona a varios niños (${a.coinc.map((c) => c.nino.nombre).join(', ')}): elige a quién va.` : 'No trae el nombre de ningún niño de Tareki: elige a quién va.' });
      return out;
    }
    const nino = lista.find((n) => n.id === a.ninoId);
    if (!a.coinc.some((c) => c.nino.id === a.ninoId)) out.push({ ok: false, texto: `No menciona a ${nino.nombre}. ¿Seguro que es para ${primerNombre(nino.nombre)}?` });
    const otros = a.coinc.filter((c) => c.nino.id !== a.ninoId && plano(primerNombre(c.nino.nombre)) !== plano(primerNombre(nino.nombre)));
    if (otros.length) out.push({ ok: false, texto: `También menciona a ${otros.map((c) => c.nino.nombre).join(', ')}. Revisa que no traiga datos de otra familia.` });
    if (lecciones.some((l) => l.ninoId === a.ninoId && plano(l.titulo) === plano(a.titulo))) out.push({ ok: false, texto: `${primerNombre(nino.nombre)} ya tiene una lección llamada «${a.titulo}».` });
    if (!out.length) out.push({ ok: true, texto: `Trae el nombre de ${nino.nombre} y de nadie más.` });
    return out;
  }

  function pintar() {
    if (!archivos.length) { $lista.innerHTML = ''; return; }
    const listas = archivos.filter((a) => a.estado === 'pendiente' && a.ninoId && a.tamano <= MAX_BYTES);
    const subidas = archivos.filter((a) => a.estado === 'subida').length;
    $lista.innerHTML = `
      ${archivos.map((a, i) => {
        const m = materia(a.materia);
        if (a.estado === 'subida') {
          return `<section class="card plano fila entre envolver"><span class="fila"><span class="icono-mini" style="background:${m.color}" aria-hidden="true">${m.emoji}</span><span><b>${esc(a.titulo)}</b><br><span class="suave peq">→ ${esc(lista.find((n) => n.id === a.ninoId)?.nombre || '')}</span></span></span>
            <span class="fila"><span class="chip verde">✓ Asignada</span><a class="btn btn-peq btn-blanco" href="#/leccion/${esc(a.id)}">Vista previa</a></span></section>`;
        }
        return `<section class="card pila chica">
          <div class="fila entre"><span class="fila" style="min-width:0"><span class="icono-mini" style="background:${m.color}" aria-hidden="true">${m.emoji}</span><b class="cortar">${esc(a.nombre)}</b></span>
            <button class="btn-redondo" data-quitar="${i}" aria-label="Quitar ${esc(a.nombre)}" title="Quitar">✕</button></div>
          <div class="rejilla-subir">
            <div class="campo"><label for="t${i}">Título que verá el niño</label><input id="t${i}" data-titulo="${i}" maxlength="80" value="${esc(a.titulo)}"></div>
            <div class="campo"><label for="m${i}">Materia</label><select id="m${i}" data-materia="${i}">${MATERIAS.map((x) => `<option value="${x.id}" ${x.id === a.materia ? 'selected' : ''}>${x.emoji} ${esc(x.nombre)}</option>`).join('')}</select></div>
            <div class="campo"><label for="n${i}">¿Para quién es?</label><select id="n${i}" data-nino="${i}"><option value="">— Elige el niño —</option>${lista.map((n) => `<option value="${esc(n.id)}" ${n.id === a.ninoId ? 'selected' : ''}>${esc(n.avatar)} ${esc(n.nombre)} · ${esc(n.familia?.nombre || '')}</option>`).join('')}</select></div>
          </div>
          ${revisar(a).map((x) => `<div class="${x.ok ? 'ok-caja' : 'alerta-caja'}">${x.ok ? '✅' : '⚠️'} ${esc(x.texto)}</div>`).join('')}
          ${a.error ? `<p class="error">${esc(a.error)}</p>` : ''}
        </section>`;
      }).join('')}
      <div class="fila entre envolver">
        <span class="suave">${subidas ? `✓ ${plural(subidas, 'asignada', 'asignadas')} · ` : ''}${plural(listas.length, 'lista', 'listas')} para asignar</span>
        <button class="btn btn-verde" id="asignar" ${listas.length ? '' : 'disabled'}>Asignar ${listas.length === 1 ? 'la lección' : `${listas.length} lecciones`}</button>
      </div>`;

    $lista.querySelectorAll('[data-titulo]').forEach((el) => el.addEventListener('change', () => { archivos[el.dataset.titulo].titulo = el.value; pintar(); }));
    $lista.querySelectorAll('[data-materia]').forEach((el) => el.addEventListener('change', () => { archivos[el.dataset.materia].materia = el.value; pintar(); }));
    $lista.querySelectorAll('[data-nino]').forEach((el) => el.addEventListener('change', () => { archivos[el.dataset.nino].ninoId = el.value || null; pintar(); }));
    $lista.querySelectorAll('[data-quitar]').forEach((el) => el.addEventListener('click', () => { archivos.splice(Number(el.dataset.quitar), 1); pintar(); }));
    $lista.querySelector('#asignar')?.addEventListener('click', asignar);
  }

  async function asignar() {
    const boton = $lista.querySelector('#asignar');
    boton.disabled = true; boton.textContent = 'Asignando…';
    let ok = 0;
    for (const a of archivos.filter((x) => x.estado === 'pendiente' && x.ninoId && x.tamano <= MAX_BYTES)) {
      try {
        const l = await datos.subirLeccion({ ninoId: a.ninoId, titulo: a.titulo, materia: a.materia, html: a.html });
        Object.assign(a, { estado: 'subida', id: l.id, error: '' });
        lecciones.push(l);
        ok++;
      } catch (x) { a.error = x.message; }
    }
    pintar();
    if (ok) { confeti(); aviso(`${plural(ok, 'lección asignada', 'lecciones asignadas')}. Ya aparecen en el inicio de cada niño.`, { emoji: '🎉', ms: 5000 }); }
  }

  async function leer(files) {
    for (const f of files) {
      if (!/\.html?$/i.test(f.name) && f.type !== 'text/html') { aviso(`«${f.name}» no es una lección HTML.`, { emoji: '🙈' }); continue; }
      const html = await f.text();
      const coinc = coincidencias(html, lista);
      // Se quita el nombre del niño del título ("Biología · Juan Pablo" → "Biología")
      const titulo = tituloDeHtml(html).replace(/\s*·\s*[^·]+$/, '') || f.name.replace(/\.html?$/i, '');
      // Sugerencia: el que más aparece, si le gana claramente al segundo
      const claro = coinc[0] && (!coinc[1] || coinc[0].puntos >= coinc[1].puntos * 2) ? coinc[0].nino.id : null;
      archivos.push({
        nombre: f.name, html, tamano: f.size, titulo, coinc,
        materia: (MATERIAS.find((m) => m.pistas.test(`${titulo} ${f.name}`)) || MATERIAS.at(-1)).id,
        ninoId: fijo?.id || claro, estado: 'pendiente',
      });
    }
    pintar();
  }

  const zona = root.querySelector('#zona');
  root.querySelector('#archivo').addEventListener('change', (e) => { leer([...e.target.files]); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('encima'); }));
  ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, () => zona.classList.remove('encima')));
  zona.addEventListener('drop', (e) => { e.preventDefault(); leer([...e.dataTransfer.files]); });
}

// --- Niños y familias -------------------------------------------------------------------------
async function ninos(root, ctx) {
  const [lista, fams] = await Promise.all([infoNinos(), datos.familias()]);
  const sinPerfil = fams.filter((f) => !f.ninos.length);
  root.innerHTML = `
    <div class="cabecera"><h1>🧒 Niños</h1><span class="chip">${plural(lista.length, 'niño', 'niños')} · ${plural(fams.length, 'familia', 'familias')}</span></div>
    <input type="search" id="buscar" placeholder="Buscar por nombre o familia…" aria-label="Buscar" style="margin-bottom:14px">
    <div class="tabla" id="tabla"></div>
    ${sinPerfil.length ? `<div class="titulo-seccion"><h2>Familias sin perfil de niño</h2></div>
      <div class="tabla">${sinPerfil.map((f) => `<div class="tabla-fila" style="cursor:default"><span class="av">👨‍👩‍👧</span><span><b>${esc(f.nombre)}</b><small>${esc(f.correo)} · se unió ${fechaBonita(f.creado)}</small></span><span class="chip sol">Falta crear el perfil</span></div>`).join('')}</div>` : ''}`;
  const pintar = () => {
    const t = plano(root.querySelector('#buscar').value);
    const vis = lista.filter((n) => !t || plano(`${n.nombre} ${n.familia?.nombre || ''}`).includes(t));
    root.querySelector('#tabla').innerHTML = vis.length
      ? vis.map((n) => filaNino(n, `<span class="chip">📚 ${n.d.lecciones.length}</span><span class="chip ${n.d.racha.actual ? 'sol' : ''}">🔥 ${n.d.racha.actual}</span>${n.d.resumen.promedio != null ? `<span class="chip">📝 ${n.d.resumen.promedio}</span>` : ''}`)).join('')
      : vacio({ emoji: '🔍', titulo: lista.length ? 'Nadie con ese nombre' : 'Aún no hay niños', texto: lista.length ? '' : 'Crea un código de invitación para la primera familia.', accion: lista.length ? '' : '<a class="btn" href="#/equipo/codigos">Crear código</a>' });
  };
  root.querySelector('#buscar').addEventListener('input', pintar);
  pintar();
}

// --- Códigos de invitación -------------------------------------------------------------------
async function codigos(root, ctx) {
  const lista = await datos.invitaciones();
  const usado = (i) => i.usadaPor || i.usada; // "usada" sigue aunque la cuenta se haya borrado
  const pend = lista.filter((i) => !usado(i) && i.expira >= hoy());
  const usadas = lista.filter(usado);
  const vencidas = lista.filter((i) => !usado(i) && i.expira < hoy());
  const fila = (i, extra) => `<div class="tabla-fila codigo" style="cursor:default"><span class="av" style="background:${i.rol === 'familia' ? 'var(--sun-s)' : 'var(--purple-s)'}">${i.rol === 'familia' ? '🎟️' : '🧑‍🏫'}</span>
    <span><b style="font-family:var(--f-head);letter-spacing:.06em">${esc(i.codigo)}</b><small>${i.rol === 'familia' ? '' : '<b>Equipo</b> · '}${esc(i.nota || 'Sin nota')}</small></span><span class="lado-der">${extra}</span></div>`;

  root.innerHTML = `
    <div class="cabecera"><h1>🎟️ Códigos</h1><button class="btn" data-crear>＋ Crear código</button></div>
    <div class="card plano pila chica" style="background:var(--soft)">
      <b>¿Cómo funciona?</b>
      <span class="suave">Cada familia nueva necesita un código para crear su cuenta. Sirve <b>una sola vez</b> y vence en 7 días. Así nadie más puede registrarse aunque le pasen el link.</span>
    </div>
    <div class="titulo-seccion"><h2>Sin usar</h2><span class="suave">${pend.length}</span></div>
    <div class="tabla">${pend.length ? pend.map((i) => fila(i, `<span class="chip sol">vence ${fechaBonita(i.expira)}</span><button class="btn btn-peq btn-blanco" data-compartir="${esc(i.codigo)}">Compartir</button><button class="btn-redondo" data-anular="${esc(i.codigo)}" aria-label="Anular código" title="Anular">✕</button>`)).join('') : '<p class="suave">No hay códigos pendientes.</p>'}</div>
    <div class="titulo-seccion"><h2>Usados</h2><span class="suave">${usadas.length}</span></div>
    <div class="tabla">${usadas.length ? usadas.map((i) => fila(i, `<span class="chip verde">${i.familia ? `✓ ${esc(i.familia.nombre)}` : 'cuenta borrada'} · ${fechaBonita(i.usada)}</span>`)).join('') : '<p class="suave">Ninguno todavía.</p>'}</div>
    ${vencidas.length ? `<div class="titulo-seccion"><h2>Vencidos</h2><span class="suave">${vencidas.length}</span></div><div class="tabla">${vencidas.map((i) => fila(i, '<span class="chip">vencido</span>')).join('')}</div>` : ''}`;

  root.querySelector('[data-crear]').addEventListener('click', () => {
    abrirHoja({
      titulo: 'Nuevo código',
      cuerpo: `${ctx.usuario.dueno ? `<div class="campo"><span class="etiqueta">¿Para quién es la cuenta?</span>
          <div class="pestanas" role="radiogroup"><button type="button" role="radio" data-rol="familia" aria-selected="true">👨‍👩‍👧 Una familia</button><button type="button" role="radio" data-rol="equipo" aria-selected="false">🧑‍🏫 Mi equipo</button></div>
          <small id="rolAyuda">La familia verá solo las lecciones de sus hijos.</small></div>` : ''}
        <div class="campo"><label for="nota" id="notaEtiqueta">¿Para qué familia es?</label><input id="nota" maxlength="60" placeholder="Ej.: Familia Gómez (mamá de Sara)" autofocus><small>Solo lo ve el equipo, para saber de quién es cada código.</small></div>
        <p class="error" id="nErr" role="alert"></p>`,
      pie: '<button class="btn" data-ok>Crear código</button>',
      montar: (el) => {
        let rol = 'familia';
        el.querySelectorAll('[data-rol]').forEach((b) => b.addEventListener('click', () => {
          rol = b.dataset.rol;
          el.querySelectorAll('[data-rol]').forEach((x) => x.setAttribute('aria-selected', x === b));
          el.querySelector('#notaEtiqueta').textContent = rol === 'familia' ? '¿Para qué familia es?' : '¿Para quién del equipo es?';
          el.querySelector('#nota').placeholder = rol === 'familia' ? 'Ej.: Familia Gómez (mamá de Sara)' : 'Ej.: Laura, profe de matemáticas';
          el.querySelector('#rolAyuda').textContent = rol === 'familia' ? 'La familia verá solo las lecciones de sus hijos.' : 'Podrá subir lecciones y ver el progreso de todos los niños. Solo dáselo a gente de confianza.';
        }));
        el.querySelector('[data-ok]').addEventListener('click', async () => {
          try {
            const inv = await datos.crearInvitacion({ nota: el.querySelector('#nota').value, rol });
            compartir(inv, () => ctx.refrescar());
          } catch (x) { el.querySelector('#nErr').textContent = x.message; }
        });
      },
    });
  });
  root.querySelectorAll('[data-compartir]').forEach((b) => b.addEventListener('click', () => compartir(lista.find((i) => i.codigo === b.dataset.compartir))));
  root.querySelectorAll('[data-anular]').forEach((b) => b.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: `¿Anular ${b.dataset.anular}?`, texto: 'Ya nadie podrá usarlo para crear una cuenta.', si: 'Anular', peligro: true }))) return;
    await datos.anularInvitacion(b.dataset.anular);
    ctx.refrescar();
  }));
}

function compartir(inv, alCerrar) {
  const link = `${location.origin}${location.pathname}#/registro/${inv.codigo}`;
  const texto = inv.rol === 'familia'
    ? `¡Hola! 👋 Esta es la invitación para crear la cuenta de su familia en Tareki, donde estarán las lecciones de su hijo o hija:\n${link}\n\nCódigo: ${inv.codigo} (sirve una sola vez y vence en 7 días).`
    : `¡Hola! 👋 Te invito al equipo de Tareki. Crea tu cuenta aquí:\n${link}\n\nCódigo: ${inv.codigo} (sirve una sola vez y vence en 7 días). No lo compartas: da acceso a las lecciones de todos los niños.`;
  abrirHoja({
    titulo: 'Código listo 🎟️',
    cuerpo: `
      <div class="codigo-grande">${esc(inv.codigo)}</div>
      <p class="centro suave">${inv.nota ? `Para <b>${esc(inv.nota)}</b> · ` : ''}sirve una vez · vence ${fechaBonita(inv.expira)}</p>
      <input readonly value="${esc(link)}" aria-label="Link de invitación" onclick="this.select()">`,
    pie: `<button class="btn btn-blanco" data-copiar>📋 Copiar</button><a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(texto)}">WhatsApp</a>`,
    cerrar: alCerrar,
    montar: (el) => el.querySelector('[data-copiar]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(texto); aviso('Invitación copiada. Pégala en WhatsApp.', { emoji: '📋' }); }
      catch { el.querySelector('input').select(); aviso('Selecciona el link y cópialo.', { emoji: '📋' }); }
    }),
  });
}
