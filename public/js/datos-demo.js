// =============================================================================
// datos-demo.js — Los datos en modo demostración.
//
// MODO DEMO: todo se guarda en este navegador (localStorage). Tiene las mismas
// funciones que datos-nube.js e imita sus reglas de permisos, para probar la app
// sin internet ni cuentas reales.
//
// Tablas (iguales a las que tendrá Supabase):
//   usuarios     {id, correo, rol:'familia'|'equipo', nombre}
//   ninos        {id, familiaId, nombre, avatar, color, grado}
//   lecciones    {id, ninoId, titulo, materia, archivo, subidaPor, creada}
//   estados      {[leccionId]: {datos:{clave:texto}, meta, abierta, actualizado}}
//   actividad    [{ninoId, dia, minutos, logros}]
//   invitaciones [{codigo, nota, creadaPor, creada, expira, usadaPor, usada}]
// =============================================================================

import { semilla } from './demo.js';
import { uid, hoy, sumarDias, plano, fechaLocal } from './util.js';
import { INVITACION_DIAS } from './config.js';

const CLAVE = 'tareki:demo';
const CLAVE_HTML = 'tareki:demo:html:';

let db = cargar();

function cargar() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE));
    if (d && d.version === 5) return d;
  } catch { /* datos dañados: se vuelve a empezar */ }
  const s = semilla();
  guardar(s);
  return s;
}
function guardar(d = db) {
  try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { console.warn('No se pudo guardar', e); }
}
const ahora = () => new Date().toISOString();
const falla = (msg) => { throw new Error(msg); };

// --- Sesión -------------------------------------------------------------------------
const yo = () => db.usuarios.find((u) => u.id === db.sesion) || null;
const sinClave = (u) => (u ? { id: u.id, correo: u.correo, rol: u.rol, nombre: u.nombre, dueno: !!u.dueno, accesoHasta: u.accesoHasta || null, suspendido: !!u.suspendido } : null);

export async function usuario() { return sinClave(yo()); }

export async function ingresar(correo, clave) {
  const u = db.usuarios.find((x) => x.correo === String(correo).trim().toLowerCase());
  if (!u || u.clave !== clave) falla('El correo o la contraseña no coinciden.');
  db.sesion = u.id; guardar();
  return sinClave(u);
}

export async function salir() { db.sesion = null; guardar(); }

export async function recuperarClave() { /* en la demo no se envían correos */ }
export const estaRecuperando = () => false;
export async function cambiarClave() { /* nada */ }

// --- Invitaciones ---------------------------------------------------------------------
const normalizarCodigo = (c) => String(c || '').trim().toUpperCase().replace(/\s+/g, '');

/** Revisa un código sin gastarlo. Devuelve la invitación o lanza un error claro. */
export async function revisarCodigo(codigo) {
  const c = normalizarCodigo(codigo);
  const inv = db.invitaciones.find((i) => i.codigo === c);
  if (!inv) falla('Ese código no existe. Revisa que esté bien escrito.');
  if (inv.usadaPor) falla('Ese código ya se usó. Pídele uno nuevo al equipo de Learnground.');
  if (inv.expira < hoy()) falla('Ese código ya venció. Pídele uno nuevo al equipo de Learnground.');
  return { codigo: inv.codigo, nota: inv.nota, rol: inv.rol || 'familia' };
}

/** Crea la cuenta de una familia. En Supabase esto lo hará una función del servidor. */
export async function registrarFamilia({ codigo, nombre, correo, clave }) {
  await revisarCodigo(codigo);
  correo = String(correo).trim().toLowerCase();
  if (!nombre.trim()) falla('Escribe tu nombre.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) falla('Ese correo no se ve bien.');
  if (String(clave).length < 8) falla('La contraseña debe tener al menos 8 caracteres.');
  if (db.usuarios.some((u) => u.correo === correo)) falla('Ya hay una cuenta con ese correo. Inicia sesión.');
  const inv = db.invitaciones.find((i) => i.codigo === normalizarCodigo(codigo));
  const rolNuevo = inv.rol === 'familia' || !inv.rol ? 'familia' : 'equipo';
  const u = { id: uid(), correo, clave, rol: rolNuevo, dueno: inv.rol === 'dueno', nombre: nombre.trim(), creado: ahora(),
    accesoHasta: rolNuevo === 'familia' ? sumarDias(hoy(), inv.diasAcceso || 30) : null, suspendido: false };
  db.usuarios.push(u);
  if (rolNuevo === 'familia') db.historial.unshift({ id: uid(), familiaId: u.id, accion: 'registro', hasta: u.accesoHasta, nota: `Código ${inv.codigo}`, por: '', creado: ahora() });
  inv.usadaPor = u.id; inv.usada = ahora();
  db.sesion = u.id; guardar();
  return sinClave(u);
}

export async function crearInvitacion({ nota, rol = 'familia', diasAcceso = 30 }) {
  soloEquipo();
  if (rol === 'equipo' && !yo().dueno) falla('Solo el dueño puede invitar al equipo.');
  const letras = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let codigo;
  do { codigo = 'LEARN-' + Array.from({ length: 6 }, () => letras[Math.random() * letras.length | 0]).join(''); }
  while (db.invitaciones.some((i) => i.codigo === codigo));
  const inv = { codigo, rol, diasAcceso, nota: String(nota || '').trim(), creadaPor: db.sesion, creada: ahora(), expira: sumarDias(hoy(), INVITACION_DIAS), usadaPor: null, usada: null };
  db.invitaciones.unshift(inv); guardar();
  return inv;
}

export async function invitaciones() {
  soloEquipo();
  return db.invitaciones.map((i) => ({ ...i, familia: i.usadaPor ? sinClave(db.usuarios.find((u) => u.id === i.usadaPor)) : null }));
}

/** Quita un código: sin usar o de una cuenta borrada (equipo), o cualquiera (dueño). */
export async function anularInvitacion(codigo) {
  soloEquipo();
  const inv = db.invitaciones.find((i) => i.codigo === codigo);
  const cuentaViva = inv?.usadaPor && db.usuarios.some((u) => u.id === inv.usadaPor);
  if (cuentaViva && !yo().dueno) falla('Solo el dueño puede quitar códigos de cuentas activas.');
  db.invitaciones = db.invitaciones.filter((i) => i.codigo !== codigo);
  guardar();
}

// --- Permisos (en Supabase serán reglas RLS) -------------------------------------------
function soloEquipo() { if (yo()?.rol !== 'equipo') falla('Solo el equipo puede hacer esto.'); }
const accesoOk = (u) => u.rol === 'equipo' || (!u.suspendido && !!u.accesoHasta && u.accesoHasta >= hoy());
function puedeVerNino(ninoId) {
  const u = yo();
  if (!u) return false;
  if (u.rol === 'equipo') return true;
  return accesoOk(u) && db.ninos.some((n) => n.id === ninoId && n.familiaId === u.id);
}
function exigirNino(ninoId) { if (!puedeVerNino(ninoId)) falla('No tienes permiso para ver esto.'); }
function exigirLeccion(id) {
  const l = db.lecciones.find((x) => x.id === id);
  if (!l) falla('Esa lección no existe.');
  exigirNino(l.ninoId);
  return l;
}

// --- Niños ------------------------------------------------------------------------------
export async function ninos() {
  const u = yo();
  if (!u) return [];
  const lista = u.rol === 'equipo' ? db.ninos : db.ninos.filter((n) => n.familiaId === u.id);
  return lista.map((n) => ({ ...n, familia: sinClave(db.usuarios.find((x) => x.id === n.familiaId)) }));
}

export async function nino(id) {
  exigirNino(id);
  return (await ninos()).find((n) => n.id === id) || null;
}

export async function guardarNino({ id, nombre, avatar, color, grado }) {
  const u = yo();
  if (!u) falla('Inicia sesión.');
  if (!String(nombre || '').trim()) falla('Escribe el nombre.');
  if (id) {
    exigirNino(id);
    const n = db.ninos.find((x) => x.id === id);
    Object.assign(n, { nombre: nombre.trim(), avatar, color, grado });
    guardar(); return { ...n };
  }
  if (u.rol !== 'familia') falla('Los perfiles los crea cada familia.');
  const n = { id: uid(), familiaId: u.id, nombre: nombre.trim(), avatar, color, grado, creado: ahora() };
  db.ninos.push(n); guardar();
  return { ...n };
}

// --- Lecciones ----------------------------------------------------------------------------
export async function lecciones(ninoId) {
  exigirNino(ninoId);
  return db.lecciones.filter((l) => l.ninoId === ninoId).sort((a, b) => b.creada.localeCompare(a.creada)).map((l) => ({ ...l }));
}

export async function todasLasLecciones() {
  soloEquipo();
  return db.lecciones.map((l) => ({ ...l }));
}

export async function leccion(id) { return { ...exigirLeccion(id) }; }

/** El HTML de la lección. En Supabase vendrá del almacén privado. */
export async function htmlLeccion(id) {
  const l = exigirLeccion(id);
  if (l.archivo.startsWith('local:')) {
    const html = localStorage.getItem(CLAVE_HTML + l.id);
    if (!html) falla('No se encontró el archivo de esta lección en este navegador.');
    return html;
  }
  const r = await fetch(l.archivo, { cache: 'no-cache' });
  if (!r.ok) falla('No se pudo descargar la lección.');
  return r.text();
}

export async function subirLeccion({ ninoId, titulo, materia, html }) {
  soloEquipo();
  if (!db.ninos.some((n) => n.id === ninoId)) falla('Elige a qué niño va la lección.');
  if (!String(titulo || '').trim()) falla('Ponle un título a la lección.');
  const id = uid();
  try { localStorage.setItem(CLAVE_HTML + id, html); }
  catch { falla('El navegador se quedó sin espacio para lecciones de prueba. Borra alguna lección de prueba.'); }
  const l = { id, ninoId, titulo: titulo.trim(), materia, archivo: `local:${id}`, version: 1, subidaPor: db.sesion, creada: ahora(), actualizada: ahora() };
  db.lecciones.push(l); guardar();
  return { ...l };
}

/** Cambia el archivo por una versión corregida. El progreso del niño se conserva. */
export async function reemplazarArchivo(id, html) {
  soloEquipo();
  const l = exigirLeccion(id);
  try { localStorage.setItem(CLAVE_HTML + id, html); }
  catch { falla('El navegador se quedó sin espacio para lecciones de prueba.'); }
  Object.assign(l, { archivo: `local:${id}`, version: (l.version || 1) + 1, actualizada: ahora() });
  guardar();
  return { ...l };
}

export async function cambiarLeccion(id, { titulo, materia }) {
  soloEquipo();
  const l = exigirLeccion(id);
  if (!String(titulo || '').trim()) falla('Ponle un título a la lección.');
  Object.assign(l, { titulo: titulo.trim(), materia });
  guardar();
  return { ...l };
}

export async function borrarLeccion(id) {
  soloEquipo();
  db.lecciones = db.lecciones.filter((l) => l.id !== id);
  delete db.estados[id];
  try { localStorage.removeItem(CLAVE_HTML + id); } catch { /* nada */ }
  guardar();
}

// --- Progreso de cada lección ------------------------------------------------------------
const estadoVacio = () => ({ datos: {}, meta: null, abierta: null, actualizado: null });

export async function estado(leccionId) {
  exigirLeccion(leccionId);
  return structuredClone(db.estados[leccionId] || estadoVacio());
}

/** Varias lecciones de una vez (para resúmenes). */
export async function estados(ids) {
  const r = {};
  for (const id of ids) r[id] = await estado(id);
  return r;
}

export async function guardarDatos(leccionId, datos) {
  const l = exigirLeccion(leccionId);
  if (yo().rol !== 'familia') return; // el equipo solo mira: no cambia el progreso del niño
  const e = (db.estados[l.id] ||= estadoVacio());
  e.datos = { ...datos }; e.actualizado = ahora();
  guardar();
}

export async function guardarMeta(leccionId, meta) {
  const l = exigirLeccion(leccionId);
  const e = (db.estados[l.id] ||= estadoVacio());
  e.meta = meta; guardar();
}

export async function marcarAbierta(leccionId) {
  const l = exigirLeccion(leccionId);
  if (yo().rol !== 'familia') return;
  const e = (db.estados[l.id] ||= estadoVacio());
  if (!e.abierta) { e.abierta = ahora(); guardar(); }
}

// --- Actividad (para la racha y el tiempo de estudio) ----------------------------------------
export async function sumarActividad(ninoId, { minutos = 0, logros = 0 }) {
  exigirNino(ninoId);
  if (yo().rol !== 'familia') return;
  const dia = hoy();
  let a = db.actividad.find((x) => x.ninoId === ninoId && x.dia === dia);
  if (!a) { a = { ninoId, dia, minutos: 0, logros: 0 }; db.actividad.push(a); }
  a.minutos += minutos; a.logros += logros;
  guardar();
}

export async function actividad(ninoId) {
  exigirNino(ninoId);
  return db.actividad.filter((a) => a.ninoId === ninoId).map((a) => ({ ...a }));
}

// --- Equipo ---------------------------------------------------------------------------------
export async function familias() {
  soloEquipo();
  return db.usuarios.filter((u) => u.rol === 'familia').map((u) => ({ ...sinClave(u), creado: u.creado, ninos: db.ninos.filter((n) => n.familiaId === u.id) }));
}

export async function buscarNinos(texto) {
  const t = plano(texto);
  return (await ninos()).filter((n) => !t || plano(`${n.nombre} ${n.familia?.nombre || ''}`).includes(t));
}

/** Solo en modo demo: vuelve a los datos de prueba. */
// --- Acceso, pagos y actividad de familias ---------------------------------------------------------
export async function marcarIngreso() { const u = yo(); if (u) { u.ultimoIngreso = ahora(); guardar(); } }
export function olvidarPerfil() { /* nada */ }

export async function ajustesCobro() { return { ...db.cobro }; }
export async function guardarAjustesCobro(a) {
  if (!yo()?.dueno) falla('Solo el dueño puede cambiar los datos de cobro.');
  db.cobro = { precio: Math.max(0, Math.round(Number(a.precio) || 0)), llave: String(a.llave || '').trim(), banco: String(a.banco || '').trim(), titular: String(a.titular || '').trim(), whatsapp: String(a.whatsapp || '').replace(/\D/g, ''), nota: String(a.nota || '').trim() };
  guardar(); return { ...db.cobro };
}

export async function familiasResumen() {
  soloEquipo();
  const desde = sumarDias(hoy(), -6);
  return db.usuarios.filter((u) => u.rol === 'familia').map((u) => {
    const hijos = db.ninos.filter((n) => n.familiaId === u.id).map((n) => n.id);
    const act = db.actividad.filter((a) => hijos.includes(a.ninoId) && (a.minutos || a.logros));
    return {
      id: u.id, nombre: u.nombre, correo: u.correo, creado: u.creado, accesoHasta: u.accesoHasta || null, suspendido: !!u.suspendido,
      ultimoIngreso: u.ultimoIngreso || null, ultimoEstudio: act.map((a) => a.dia).sort().at(-1) || null,
      minutos7: act.filter((a) => a.dia >= desde).reduce((s, a) => s + a.minutos, 0),
      ninos: hijos.length, lecciones: db.lecciones.filter((l) => hijos.includes(l.ninoId)).length,
    };
  });
}

export async function historialAcceso(familiaId) {
  soloEquipo();
  return db.historial.filter((h) => h.familiaId === familiaId).map((h) => ({ ...h, por: db.usuarios.find((u) => u.id === h.por)?.nombre || '' }));
}

function familia(familiaId) {
  soloEquipo();
  const f = db.usuarios.find((u) => u.id === familiaId && u.rol === 'familia');
  if (!f) falla('Esa familia no existe.');
  return f;
}

export async function registrarPago({ familiaId, meses, monto, metodo, nota }) {
  const f = familia(familiaId);
  if (!(meses >= 1 && meses <= 24)) falla('Los meses deben ser entre 1 y 24.');
  const base = f.accesoHasta && f.accesoHasta >= hoy() ? f.accesoHasta : sumarDias(hoy(), -1);
  const d = new Date(`${base}T12:00:00`); d.setMonth(d.getMonth() + Number(meses));
  f.accesoHasta = fechaLocal(d); f.suspendido = false;
  db.historial.unshift({ id: uid(), familiaId, accion: 'pago', meses, monto, metodo, nota, hasta: f.accesoHasta, por: db.sesion, creado: ahora() });
  guardar(); return f.accesoHasta;
}

export async function cambiarAcceso({ familiaId, accion, hasta = null, nota = '' }) {
  const f = familia(familiaId);
  if (accion === 'suspender') f.suspendido = true;
  else if (accion === 'reactivar') f.suspendido = false;
  else if (accion === 'fecha') { if (!hasta) falla('Elige la fecha.'); f.accesoHasta = hasta; }
  else falla('Acción no válida.');
  db.historial.unshift({ id: uid(), familiaId, accion, hasta: f.accesoHasta, nota, por: db.sesion, creado: ahora() });
  guardar();
}

// --- Mensajes del equipo (en la demo se "envían" al instante, sin notificación) -------------------
export async function mensajes() {
  const u = yo();
  if (!u) return [];
  const lista = (db.mensajes || []).filter((m) => u.rol === 'equipo' || (m.enviado && (m.destino === 'todas' || (m.destino === 'familias' && m.familias.includes(u.id)))));
  return lista.map((m) => ({ ...m })).sort((a, b) => b.programado.localeCompare(a.programado));
}
export async function crearMensaje({ titulo, cuerpo, url, destino, familias = [], programado = null }) {
  soloEquipo();
  if (!String(titulo || '').trim()) falla('Escribe el título del mensaje.');
  const cuando = programado ? new Date(programado) : new Date();
  const m = { id: uid(), titulo: titulo.trim(), cuerpo: String(cuerpo || '').trim(), url: url || '#/', destino, familias: destino === 'familias' ? familias : [], programado: cuando.toISOString(), enviado: null, creadoPor: db.sesion, creado: ahora() };
  (db.mensajes ||= []).push(m);
  if (cuando <= new Date(Date.now() + 60000)) m.enviado = ahora();
  guardar();
  return { ...m, resultado: m.enviado ? { enviados: 0, personas: 0 } : undefined };
}
export async function enviarMensajeYa(id) { soloEquipo(); const m = db.mensajes.find((x) => x.id === id); if (m && !m.enviado) { m.enviado = ahora(); guardar(); } return { enviados: 0, personas: 0 }; }
export async function borrarMensaje(id) { soloEquipo(); db.mensajes = db.mensajes.filter((m) => m.id !== id); guardar(); }
export async function avisarNinoNuevo() { /* nada */ }
export async function quitarFamilia(familiaId) {
  if (!yo()?.dueno) falla('Solo el dueño puede quitar una familia.');
  const hijos = db.ninos.filter((n) => n.familiaId === familiaId).map((n) => n.id);
  const lecs = db.lecciones.filter((l) => hijos.includes(l.ninoId)).map((l) => l.id);
  db.lecciones = db.lecciones.filter((l) => !lecs.includes(l.id));
  lecs.forEach((id) => { delete db.estados[id]; try { localStorage.removeItem(CLAVE_HTML + id); } catch { /* nada */ } });
  db.actividad = db.actividad.filter((a) => !hijos.includes(a.ninoId));
  db.ninos = db.ninos.filter((n) => n.familiaId !== familiaId);
  db.historial = db.historial.filter((h) => h.familiaId !== familiaId);
  db.usuarios = db.usuarios.filter((u) => u.id !== familiaId);
  db.invitaciones.forEach((i) => { if (i.usadaPor === familiaId) i.usadaPor = null; });
  guardar();
}

// En la demostración no hay avisos reales
export async function registrarPush() { /* nada */ }
export async function quitarPush() { /* nada */ }
export async function probarAvisos() { return { enviados: 0 }; }
export async function avisarLeccion() { /* nada */ }

export async function reiniciarDemo() {
  Object.keys(localStorage).filter((k) => k.startsWith('tareki:')).forEach((k) => localStorage.removeItem(k));
  db = cargar();
}
