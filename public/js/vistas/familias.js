// =============================================================================
// familias.js — Panel del equipo para las cuentas de las familias.
//   #/equipo/familias        Lista: estado del acceso, último ingreso, actividad
//   #/equipo/familia/<id>    Detalle: actividad de 30 días, niños, pagos y acciones
// Todo el equipo puede registrar pagos, suspender y reactivar; queda en el historial.
// El cobro es manual: aquí solo se registra lo que la familia ya pagó.
// =============================================================================

import * as datos from '../datos.js';
import { esc, hoy, sumarDias, diasEntre, fechaBonita, minutosTexto, plano, plural, primerNombre, DIAS_CORTOS } from '../util.js';
import { abrirHoja, cerrarHoja, confirmar, aviso, confeti, vacio } from '../ui.js';
import { estadoAcceso, chipAcceso, fechaLarga, pesos, miles, mascaraPesos } from '../acceso.js';

const inactiva = (f) => (f.ultimoEstudio ? diasEntre(f.ultimoEstudio, hoy()) : null);
const textoIngreso = (f) => (f.ultimoIngreso ? `entró ${fechaBonita(f.ultimoIngreso)}` : 'nunca ha entrado');
const textoEstudio = (f) => { const d = inactiva(f); return d === null ? 'no ha estudiado' : d === 0 ? 'estudió hoy' : `${d} ${d === 1 ? 'día' : 'días'} sin estudiar`; };

const FILTROS = [
  ['todas', 'Todas', () => true],
  ['vencer', '⏰ Por vencer', (f) => { const e = estadoAcceso({ ...f, rol: 'familia' }); return e.activo && e.dias <= 3; }],
  ['vencidas', '🔴 Vencidas', (f) => { const e = estadoAcceso({ ...f, rol: 'familia' }); return !e.activo && e.motivo !== 'suspendido'; }],
  ['suspendidas', '⏸ Suspendidas', (f) => f.suspendido],
  ['inactivas', '😴 Inactivas (+7 días)', (f) => estadoAcceso({ ...f, rol: 'familia' }).activo && (inactiva(f) === null || inactiva(f) >= 7)],
];

// --- Lista ------------------------------------------------------------------------------------
export async function lista(root, ctx) {
  const familias = await datos.familiasResumen();
  let filtro = 'todas';
  const cuenta = (id) => familias.filter(FILTROS.find((x) => x[0] === id)[2]).length;

  root.innerHTML = `
    <div class="cabecera"><h1>👨‍👩‍👧 Familias</h1>
      <span class="fila">${ctx.usuario.dueno ? '<button class="btn btn-peq btn-blanco" data-cobro>⚙️ Datos de cobro</button>' : ''}<a class="btn btn-peq btn-sol" href="#/equipo/codigos">🎟️ Nueva familia</a></span></div>
    <div class="filtros" role="group" aria-label="Filtrar">${FILTROS.map(([id, txt]) => `<button data-f="${id}" aria-pressed="${id === filtro}">${txt} <span class="suave">${cuenta(id)}</span></button>`).join('')}</div>
    <input type="search" id="buscar" placeholder="Buscar familia o correo…" aria-label="Buscar" style="margin-bottom:14px">
    <div class="tabla" id="tabla"></div>
    <p class="suave peq" style="margin-top:12px">El acceso se bloquea el día después de la fecha. Los datos de la familia nunca se borran: al registrar el pago, todo vuelve.</p>`;

  const pintar = () => {
    const t = plano(root.querySelector('#buscar').value);
    const pasa = FILTROS.find((x) => x[0] === filtro)[2];
    const vis = familias.filter((f) => pasa(f) && (!t || plano(`${f.nombre} ${f.correo}`).includes(t)));
    root.querySelector('#tabla').innerHTML = vis.length ? vis.map((f) => `
      <a class="tabla-fila" href="#/equipo/familia/${esc(f.id)}">
        <span class="av" style="background:var(--sun-s)">👨‍👩‍👧</span>
        <span><b>${esc(f.nombre)}</b><small>${plural(f.ninos, 'niño', 'niños')} · ${textoIngreso(f)} · ${textoEstudio(f)}</small></span>
        <span class="lado-der">${chipAcceso(f)}<span class="chip">⏱️ ${minutosTexto(f.minutos7)}/sem</span></span>
      </a>`).join('') : vacio({ emoji: '🔍', titulo: familias.length ? 'Ninguna familia en este filtro' : 'Aún no hay familias', texto: familias.length ? '' : 'Crea un código de invitación para la primera.' });
  };
  root.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => {
    filtro = b.dataset.f;
    root.querySelectorAll('[data-f]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    pintar();
  }));
  root.querySelector('#buscar').addEventListener('input', pintar);
  root.querySelector('[data-cobro]')?.addEventListener('click', () => editarCobro());
  pintar();
}

// --- Detalle de una familia ------------------------------------------------------------------
export async function detalle(root, ctx) {
  const id = ctx.params[1];
  const [familias, todos, historial] = await Promise.all([datos.familiasResumen(), datos.ninos(), datos.historialAcceso(id)]);
  const f = familias.find((x) => x.id === id);
  if (!f) { root.innerHTML = vacio({ emoji: '🤷', titulo: 'No encontramos esa familia', accion: '<a class="btn" href="#/equipo/familias">Volver</a>' }); return; }
  const hijos = todos.filter((n) => n.familiaId === id);
  const actividad = (await Promise.all(hijos.map((n) => datos.actividad(n.id)))).flat();
  const porDia = new Map();
  actividad.forEach((a) => porDia.set(a.dia, (porDia.get(a.dia) || 0) + a.minutos + (a.logros ? 5 : 0)));
  const dias = Array.from({ length: 30 }, (_, i) => sumarDias(hoy(), i - 29));
  const nivel = (m) => (!m ? '' : m < 10 ? 'n1' : m < 25 ? 'n2' : 'n3');
  const activos30 = dias.filter((d) => porDia.get(d)).length;
  const e = estadoAcceso({ ...f, rol: 'familia' });

  const ICONO = { registro: '🎟️', pago: '💰', suspender: '⏸', reactivar: '▶️', fecha: '📅' };
  const textoHist = (h) => ({
    registro: `Creó su cuenta · acceso hasta el ${fechaLarga(h.hasta)}`,
    pago: `Pago de ${plural(h.meses || 1, 'mes', 'meses')}${h.monto ? ` · ${pesos(h.monto)}` : ''}${h.metodo ? ` · ${esc(h.metodo)}` : ''} → hasta el ${fechaLarga(h.hasta)}`,
    suspender: 'Acceso suspendido', reactivar: 'Acceso reactivado', fecha: `Fecha cambiada a mano → hasta el ${fechaLarga(h.hasta)}`,
  }[h.accion] || h.accion);

  root.innerHTML = `
    <div class="cabecera"><a class="btn btn-peq btn-blanco" href="#/equipo/familias">← Familias</a>${chipAcceso(f)}</div>
    <div class="cabecera"><h1>👨‍👩‍👧 ${esc(f.nombre)}</h1></div>
    <p class="suave" style="margin:-10px 0 16px">${esc(f.correo)} · se unió ${fechaBonita(f.creado)}</p>

    <div class="kpis">
      <div class="card kpi"><span>Acceso hasta</span><b>${f.accesoHasta ? fechaLarga(f.accesoHasta) : '—'}</b><small>${f.suspendido ? 'Suspendido' : e.activo ? (e.dias === 0 ? 'Vence hoy' : `Quedan ${plural(e.dias, 'día', 'días')}`) : 'Vencido'}</small></div>
      <div class="card kpi"><span>Último ingreso</span><b>${f.ultimoIngreso ? fechaBonita(f.ultimoIngreso) : 'Nunca'}</b><small>a la app</small></div>
      <div class="card kpi"><span>Último estudio</span><b>${f.ultimoEstudio ? fechaBonita(f.ultimoEstudio) : '—'}</b><small>${textoEstudio(f)}</small></div>
      <div class="card kpi"><span>Esta semana</span><b>${minutosTexto(f.minutos7)}</b><small>${plural(activos30, 'día activo', 'días activos')} en 30 días</small></div>
    </div>

    <div class="sep"></div>
    <div class="columnas">
      <section class="card ancho pila chica"><h2 style="margin:0">💳 Acceso y pagos</h2>
        <p class="suave peq">El pago se registra cuando la familia ya pagó (llave, Nequi, efectivo…). Si el acceso sigue vigente, se suma desde su fecha; si ya venció, desde hoy.</p>
        <div class="acciones-acceso">
          <button class="btn btn-verde" data-pago>💰 Registrar pago</button>
          ${f.suspendido ? '<button class="btn btn-azul" data-reactivar>▶️ Reactivar</button>' : '<button class="btn btn-blanco" data-suspender>⏸ Suspender</button>'}
          <button class="btn btn-blanco" data-fecha>📅 Cambiar fecha</button>
          ${ctx.usuario.dueno ? '<button class="btn btn-blanco btn-quitar" data-quitar-fam>🗑️ Quitar familia</button>' : ''}
        </div>
      </section>

      <section class="card"><h2>📅 Actividad <small>últimos 30 días (todos sus niños)</small></h2>
        <div class="dias30">${dias.map((d) => `<i class="${nivel(porDia.get(d))} ${d === hoy() ? 'hoy' : ''}" title="${DIAS_CORTOS[new Date(`${d}T12:00:00`).getDay()]} ${fechaLarga(d)}: ${minutosTexto(porDia.get(d) || 0)}"></i>`).join('')}</div>
        <p class="suave peq" style="margin-top:8px">Cada cuadro es un día. Más verde = más tiempo estudiando.</p>
      </section>

      <section class="card"><h2>🧒 Niños</h2>
        ${hijos.length ? `<div class="tabla">${hijos.map((n) => `<a class="tabla-fila" href="#/papas/${esc(n.id)}"><span class="av" style="background:${esc(n.color)}">${esc(n.avatar)}</span><span><b>${esc(n.nombre)}</b><small>${esc(n.grado)}.º grado</small></span><span class="lado-der"><span class="chip">Ver progreso →</span></span></a>`).join('')}</div>`
          : '<p class="suave">Aún no ha creado el perfil de su hijo o hija.</p>'}
      </section>

      <section class="card ancho"><h2>🧾 Historial</h2>
        ${historial.length ? `<div class="historial">${historial.map((h) => `<div><span class="em" aria-hidden="true">${ICONO[h.accion] || '•'}</span><span>${textoHist(h)}${h.nota ? ` <span class="suave">· ${esc(h.nota)}</span>` : ''}<small>${fechaBonita(h.creado)}${h.por ? ` · por ${esc(primerNombre(h.por))}` : ''}</small></span></div>`).join('')}</div>`
          : '<p class="suave">Sin movimientos todavía.</p>'}
      </section>
    </div>`;

  root.querySelector('[data-pago]').addEventListener('click', () => registrarPago(f, ctx));
  root.querySelector('[data-suspender]')?.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: `¿Suspender a ${esc(f.nombre)}?`, texto: 'No podrán entrar a las lecciones hasta que la reactives. <b>No se borra nada</b>: niños, lecciones y progreso quedan guardados.', si: 'Suspender', peligro: true }))) return;
    await accion(() => datos.cambiarAcceso({ familiaId: f.id, accion: 'suspender' }), 'Familia suspendida. Sus datos quedan guardados.', ctx);
  });
  root.querySelector('[data-reactivar]')?.addEventListener('click', async () => {
    await accion(() => datos.cambiarAcceso({ familiaId: f.id, accion: 'reactivar' }), e.motivo === 'suspendido' && f.accesoHasta && f.accesoHasta < hoy()
      ? 'Reactivada, pero su fecha ya venció: registra un pago o cambia la fecha.' : '¡Familia reactivada!', ctx);
  });
  root.querySelector('[data-fecha]').addEventListener('click', () => cambiarFecha(f, ctx));
  root.querySelector('[data-quitar-fam]')?.addEventListener('click', () => quitarFamilia(f, hijos, ctx));
}

/** Borra la familia para siempre (solo el dueño). Hay que escribir su nombre para confirmar. */
function quitarFamilia(f, hijos, ctx) {
  abrirHoja({
    titulo: '¿Quitar esta familia para siempre?',
    cuerpo: `<div class="alerta-caja">⚠️ Se borra <b>todo</b>: la cuenta de ${esc(f.nombre)}${hijos.length ? `, ${hijos.length === 1 ? 'el perfil de' : 'los perfiles de'} <b>${esc(hijos.map((n) => n.nombre).join(', '))}</b>` : ''}, sus lecciones, estrellas, notas, racha e historial de pagos. <b>No se puede deshacer.</b></div>
      <p class="suave">Si solo dejaron de pagar, mejor usa <b>Suspender</b>: así, si vuelven, todo sigue ahí.</p>
      <div class="campo"><label for="qNombre">Para confirmar, escribe el nombre: <b>${esc(f.nombre)}</b></label><input id="qNombre" autocomplete="off"></div>
      <p class="error" id="qErr" role="alert"></p>`,
    pie: '<button class="btn btn-blanco" data-no>Cancelar</button><button class="btn btn-peligro" data-si disabled>Quitar para siempre</button>',
    montar: (el) => {
      const si = el.querySelector('[data-si]');
      el.querySelector('#qNombre').addEventListener('input', (e) => { si.disabled = e.target.value.trim().toLowerCase() !== f.nombre.trim().toLowerCase(); });
      el.querySelector('[data-no]').addEventListener('click', () => cerrarHoja());
      si.addEventListener('click', async () => {
        si.disabled = true; si.textContent = 'Quitando…';
        try {
          await datos.quitarFamilia(f.id);
          cerrarHoja(); aviso(`${f.nombre} fue quitada.`, { emoji: '🗑️' }); ctx.navegar('#/equipo/familias');
        } catch (x) { el.querySelector('#qErr').textContent = x.message; si.textContent = 'Quitar para siempre'; }
      });
    },
  });
}

async function accion(fn, mensaje, ctx) {
  try { await fn(); aviso(mensaje, { emoji: '✅', ms: 5000 }); ctx.refrescar(); }
  catch (x) { aviso(x.message, { emoji: '⚠️', ms: 6000 }); }
}

async function registrarPago(f, ctx) {
  const cobro = await datos.ajustesCobro().catch(() => ({ precio: 0 }));
  let meses = 1;
  const METODOS = ['Llave Bre-B', 'Nequi', 'Daviplata', 'Transferencia', 'Efectivo', 'Otro'];
  const vista = () => {
    const base = f.accesoHasta && f.accesoHasta >= hoy() ? f.accesoHasta : sumarDias(hoy(), -1);
    const d = new Date(`${base}T12:00:00`); d.setMonth(d.getMonth() + meses);
    return fechaLarga(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };
  abrirHoja({
    titulo: `Registrar pago · ${f.nombre}`,
    cuerpo: `
      <div class="campo"><span class="etiqueta">¿Cuántos meses pagó?</span>
        <div class="grados" id="pMeses">${[1, 2, 3, 6, 12].map((m) => `<button type="button" data-m="${m}" aria-pressed="${m === meses}">${m}</button>`).join('')}</div></div>
      <div class="campo"><label for="pMonto">Valor recibido (pesos)</label><div class="campo-pesos"><span>$</span><input id="pMonto" inputmode="numeric" value="${miles(cobro.precio * meses)}" placeholder="60.000"></div></div>
      <div class="campo"><label for="pMetodo">¿Cómo pagó?</label><select id="pMetodo">${METODOS.map((x) => `<option>${x}</option>`).join('')}</select></div>
      <div class="campo"><label for="pNota">Nota (opcional)</label><input id="pNota" maxlength="200" placeholder="Ej.: comprobante por WhatsApp del 12/10"></div>
      <div class="ok-caja" id="pVista">Queda con acceso hasta el <b>${vista()}</b>.</div>
      <p class="error" id="pErr" role="alert"></p>`,
    pie: '<button class="btn btn-verde" data-ok>Registrar pago</button>',
    montar: (el) => {
      mascaraPesos(el.querySelector('#pMonto'));
      el.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
        meses = Number(b.dataset.m);
        el.querySelectorAll('[data-m]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        if (cobro.precio) el.querySelector('#pMonto').value = miles(cobro.precio * meses);
        el.querySelector('#pVista').innerHTML = `Queda con acceso hasta el <b>${vista()}</b>.`;
      }));
      el.querySelector('[data-ok]').addEventListener('click', async (ev) => {
        ev.target.disabled = true;
        try {
          const hasta = await datos.registrarPago({ familiaId: f.id, meses, monto: Number(String(el.querySelector('#pMonto').value).replace(/\D/g, '')) || 0, metodo: el.querySelector('#pMetodo').value, nota: el.querySelector('#pNota').value });
          cerrarHoja(); confeti();
          aviso(`Pago registrado. Acceso hasta el ${fechaLarga(hasta)}.`, { emoji: '💰', ms: 5000 });
          ctx.refrescar();
        } catch (x) { el.querySelector('#pErr').textContent = x.message; ev.target.disabled = false; }
      });
    },
  });
}

function cambiarFecha(f, ctx) {
  abrirHoja({
    titulo: 'Cambiar la fecha de acceso',
    cuerpo: `<p class="suave">Para casos especiales (una cortesía, corregir un error). Para pagos normales usa <b>Registrar pago</b>.</p>
      <div class="campo"><label for="fHasta">Acceso hasta (último día incluido)</label><input id="fHasta" type="date" value="${esc(f.accesoHasta || hoy())}"></div>
      <div class="campo"><label for="fNota">Motivo</label><input id="fNota" maxlength="200" placeholder="Ej.: semana de cortesía"></div>
      <p class="error" id="fErr" role="alert"></p>`,
    pie: '<button class="btn" data-ok>Guardar</button>',
    montar: (el) => el.querySelector('[data-ok]').addEventListener('click', async () => {
      try {
        await datos.cambiarAcceso({ familiaId: f.id, accion: 'fecha', hasta: el.querySelector('#fHasta').value, nota: el.querySelector('#fNota').value });
        cerrarHoja(); aviso('Fecha actualizada.', { emoji: '📅' }); ctx.refrescar();
      } catch (x) { el.querySelector('#fErr').textContent = x.message; }
    }),
  });
}

/** Datos que ven las familias para pagar (solo el dueño los cambia). */
async function editarCobro() {
  const c = await datos.ajustesCobro();
  abrirHoja({
    titulo: 'Datos de cobro',
    cuerpo: `<p class="suave peq">Esto es lo que ven las familias en «Cómo pagar». No se cobra nada automático: la familia paga y ustedes registran el pago.</p>
      <div class="campo"><label for="cPrecio">Mensualidad (pesos)</label><div class="campo-pesos"><span>$</span><input id="cPrecio" inputmode="numeric" value="${miles(c.precio)}" placeholder="60.000"></div></div>
      <div class="campo"><label for="cLlave">Llave Bre-B</label><input id="cLlave" value="${esc(c.llave)}" placeholder="Tu llave: celular, cédula, correo o @alias"><small>La que creaste en tu banco para recibir pagos.</small></div>
      <div class="campo"><label for="cBanco">Banco</label><input id="cBanco" value="${esc(c.banco || 'Davivienda')}"></div>
      <div class="campo"><label for="cTitular">A nombre de</label><input id="cTitular" value="${esc(c.titular)}" placeholder="Como aparece al enviar con la llave"></div>
      <div class="campo"><label for="cWa">WhatsApp para recibir comprobantes</label><input id="cWa" inputmode="tel" value="${esc(c.whatsapp)}" placeholder="Ej.: 573001234567 (con 57 adelante)"></div>
      <div class="campo"><label for="cNota">Nota para las familias (opcional)</label><input id="cNota" maxlength="200" value="${esc(c.nota)}" placeholder="Ej.: Pagos del 1 al 5 de cada mes."></div>
      <p class="error" id="cErr" role="alert"></p>`,
    pie: '<button class="btn" data-ok>Guardar</button>',
    montar: (el) => { mascaraPesos(el.querySelector('#cPrecio')); el.querySelector('[data-ok]').addEventListener('click', async () => {
      try {
        await datos.guardarAjustesCobro({ precio: String(el.querySelector('#cPrecio').value).replace(/\D/g, ''), llave: el.querySelector('#cLlave').value, banco: el.querySelector('#cBanco').value, titular: el.querySelector('#cTitular').value, whatsapp: el.querySelector('#cWa').value, nota: el.querySelector('#cNota').value });
        cerrarHoja(); aviso('Datos de cobro guardados.', { emoji: '💳' });
      } catch (x) { el.querySelector('#cErr').textContent = x.message; }
    }); },
  });
}
