// =============================================================================
// datos-nube.js — Los datos en Supabase (proyecto "Tareki").
// Mismas funciones que datos-demo.js. Los permisos los pone la base de datos
// (supabase/esquema.sql): aquí solo se piden las cosas.
// La librería supabase-js está en js/vendor/supabase.js.
// =============================================================================

import { NUBE, INVITACION_DIAS } from './config.js';
import { uid, hoy, sumarDias } from './util.js';

let sb = null;
let perfilCache = null;
let recuperando = false;

function cliente() {
  if (!sb) {
    sb = window.supabase.createClient(NUBE.url, NUBE.clave, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'tareki:auth' },
    });
    sb.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') recuperando = true;
      if (evento === 'SIGNED_OUT') perfilCache = null;
    });
  }
  return sb;
}

/** Convierte los errores de Supabase en mensajes claros. */
function falla(e, porDefecto = 'Algo salió mal. Revisa tu conexión e intenta de nuevo.') {
  const m = String(e?.message || e || '');
  if (/invalid login credentials/i.test(m)) throw new Error('El correo o la contraseña no coinciden.');
  if (/failed to fetch|network/i.test(m)) throw new Error('No hay conexión a internet. Intenta de nuevo.');
  if (/row-level security|permission denied|sin permiso/i.test(m)) throw new Error('No tienes permiso para hacer esto.');
  if (/^(Ese|Escribe|La contraseña|Ya hay|Solo|Los meses|Elige|Acción)/.test(m)) throw new Error(m); // mensajes nuestros
  console.error(e);
  throw new Error(porDefecto);
}
const ok = ({ data, error }, msg) => { if (error) falla(error, msg); return data; };

// --- Traducción entre la base (snake_case) y la app (camelCase) ---------------------------
const aNino = (r) => r && ({ id: r.id, familiaId: r.familia_id, nombre: r.nombre, avatar: r.avatar, color: r.color, grado: r.grado, creado: r.creado, familia: r.familia || null });
const aLeccion = (r) => r && ({ id: r.id, ninoId: r.nino_id, titulo: r.titulo, materia: r.materia, archivo: r.archivo, version: r.version, subidaPor: r.subida_por, creada: r.creada, actualizada: r.actualizada, meta: r.meta });

// --- Sesión ---------------------------------------------------------------------------------
export async function usuario() {
  const { data } = await cliente().auth.getSession();
  const u = data.session?.user;
  if (!u) { perfilCache = null; return null; }
  if (perfilCache?.id !== u.id) {
    const { data: p } = await cliente().from('perfiles').select('id, rol, dueno, nombre, correo, acceso_hasta, suspendido').eq('id', u.id).maybeSingle();
    if (!p) return null; // cuenta sin perfil (no debería pasar)
    perfilCache = { id: p.id, rol: p.rol, dueno: p.dueno, nombre: p.nombre, correo: p.correo, accesoHasta: p.acceso_hasta, suspendido: p.suspendido };
  }
  return { ...perfilCache };
}

export async function ingresar(correo, clave) {
  ok(await cliente().auth.signInWithPassword({ email: String(correo).trim().toLowerCase(), password: clave }));
  perfilCache = null;
  return usuario();
}

export async function salir() { perfilCache = null; await cliente().auth.signOut(); }

export async function recuperarClave(correo) {
  ok(await cliente().auth.resetPasswordForEmail(String(correo).trim().toLowerCase(), { redirectTo: location.origin + location.pathname }));
}
export const estaRecuperando = () => recuperando;
export async function cambiarClave(clave) {
  if (String(clave).length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  ok(await cliente().auth.updateUser({ password: clave }));
  recuperando = false;
}

// --- Invitaciones ---------------------------------------------------------------------------
export async function revisarCodigo(codigo) {
  const filas = ok(await cliente().rpc('revisar_codigo', { p_codigo: String(codigo || '') }));
  if (!filas?.length) throw new Error('Ese código no existe. Revisa que esté bien escrito.');
  return filas[0];
}

export async function registrarFamilia({ codigo, nombre, correo, clave }) {
  const { data, error } = await cliente().functions.invoke('registro', { body: { codigo, nombre, correo, clave } });
  if (error) falla(error, 'No pudimos crear la cuenta. Intenta de nuevo.');
  if (data?.error) throw new Error(data.error);
  return ingresar(correo, clave);
}

export async function crearInvitacion({ nota, rol = 'familia', diasAcceso = 30 }) {
  const yo = await usuario();
  const letras = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (let intento = 0; intento < 5; intento++) {
    const codigo = 'TAREKI-' + Array.from(crypto.getRandomValues(new Uint32Array(6)), (n) => letras[n % letras.length]).join('');
    const { data, error } = await cliente().from('invitaciones')
      .insert({ codigo, rol, nota: String(nota || '').trim(), creada_por: yo.id, expira: sumarDias(hoy(), INVITACION_DIAS), dias_acceso: diasAcceso })
      .select().single();
    if (!error) return data;
    if (!/duplicate/i.test(error.message)) falla(error, 'No se pudo crear el código.');
  }
  throw new Error('No se pudo crear el código. Intenta de nuevo.');
}

export async function invitaciones() {
  const filas = ok(await cliente().from('invitaciones').select('*, familia:perfiles!invitaciones_usada_por_fkey(id, nombre, correo, rol)').order('creada', { ascending: false }));
  return filas.map((i) => ({ codigo: i.codigo, rol: i.rol, nota: i.nota, creada: i.creada, expira: i.expira, diasAcceso: i.dias_acceso, usadaPor: i.usada_por, usada: i.usada, familia: i.familia }));
}

/** Quita un código: sin usar o de una cuenta borrada (equipo), o cualquiera (dueño). La regla la pone la base. */
export async function anularInvitacion(codigo) {
  const borrados = ok(await cliente().from('invitaciones').delete().eq('codigo', codigo).select('codigo'));
  if (!borrados?.length) throw new Error('No se pudo quitar ese código. Si es de una cuenta activa, solo el dueño puede quitarlo.');
}

// --- Niños ------------------------------------------------------------------------------------
const CAMPOS_NINO = 'id, familia_id, nombre, avatar, color, grado, creado, familia:perfiles!ninos_familia_id_fkey(id, nombre, correo)';

export async function ninos() {
  if (!(await usuario())) return [];
  return ok(await cliente().from('ninos').select(CAMPOS_NINO).order('creado')).map(aNino);
}

export async function nino(id) {
  const r = ok(await cliente().from('ninos').select(CAMPOS_NINO).eq('id', id).maybeSingle());
  if (!r) throw new Error('No tienes permiso para ver esto.');
  return aNino(r);
}

export async function guardarNino({ id, nombre, avatar, color, grado }) {
  if (!String(nombre || '').trim()) throw new Error('Escribe el nombre.');
  const campos = { nombre: nombre.trim(), avatar, color, grado };
  if (id) return aNino(ok(await cliente().from('ninos').update(campos).eq('id', id).select(CAMPOS_NINO).single()));
  const yo = await usuario();
  if (yo?.rol !== 'familia') throw new Error('Los perfiles los crea cada familia.');
  return aNino(ok(await cliente().from('ninos').insert({ ...campos, familia_id: yo.id }).select(CAMPOS_NINO).single()));
}

// --- Lecciones ----------------------------------------------------------------------------------
export async function lecciones(ninoId) {
  return ok(await cliente().from('lecciones').select('*').eq('nino_id', ninoId).order('creada', { ascending: false })).map(aLeccion);
}

export async function todasLasLecciones() {
  return ok(await cliente().from('lecciones').select('*').order('creada', { ascending: false })).map(aLeccion);
}

export async function leccion(id) {
  const r = ok(await cliente().from('lecciones').select('*').eq('id', id).maybeSingle());
  if (!r) throw new Error('No tienes permiso para ver esto.');
  return aLeccion(r);
}

/** El HTML viene del almacén privado con un link de 1 minuto. "no-store" evita que el
 *  navegador muestre una copia vieja después de reemplazar el archivo. */
export async function htmlLeccion(id) {
  const l = await leccion(id);
  const { signedUrl } = ok(await cliente().storage.from('lecciones').createSignedUrl(l.archivo, 60), 'No se pudo abrir la lección.');
  const r = await fetch(signedUrl, { cache: 'no-store' }).catch(() => null);
  if (!r?.ok) throw new Error('No se pudo descargar la lección. Revisa tu conexión.');
  return r.text();
}

const comoArchivo = (html) => new Blob([html], { type: 'text/plain;charset=utf-8' });

export async function subirLeccion({ ninoId, titulo, materia, html }) {
  if (!String(titulo || '').trim()) throw new Error('Ponle un título a la lección.');
  const yo = await usuario();
  const id = uid();
  const archivo = `${ninoId}/${id}.html`;
  ok(await cliente().storage.from('lecciones').upload(archivo, comoArchivo(html), { contentType: 'text/plain;charset=utf-8', upsert: false }), 'No se pudo subir el archivo.');
  const { data, error } = await cliente().from('lecciones').insert({ id, nino_id: ninoId, titulo: titulo.trim(), materia, archivo, subida_por: yo.id }).select().single();
  if (error) { await cliente().storage.from('lecciones').remove([archivo]); falla(error, 'No se pudo guardar la lección.'); }
  return aLeccion(data);
}

/** Cambia el archivo por una versión corregida. El progreso del niño se conserva. */
export async function reemplazarArchivo(id, html) {
  const l = await leccion(id);
  ok(await cliente().storage.from('lecciones').upload(l.archivo, comoArchivo(html), { contentType: 'text/plain;charset=utf-8', upsert: true }), 'No se pudo subir el archivo.');
  return aLeccion(ok(await cliente().from('lecciones').update({ version: (l.version || 1) + 1, actualizada: new Date().toISOString() }).eq('id', id).select().single()));
}

export async function cambiarLeccion(id, { titulo, materia }) {
  return aLeccion(ok(await cliente().from('lecciones').update({ titulo: String(titulo).trim(), materia }).eq('id', id).select().single()));
}

export async function borrarLeccion(id) {
  const l = await leccion(id);
  ok(await cliente().from('lecciones').delete().eq('id', id));
  await cliente().storage.from('lecciones').remove([l.archivo]);
}

// --- Progreso ---------------------------------------------------------------------------------------
const estadoVacio = () => ({ datos: {}, meta: null, abierta: null, actualizado: null });

export async function estados(ids) {
  const r = {};
  if (!ids.length) return r;
  const [filas, lecs] = await Promise.all([
    cliente().from('estados').select('*').in('leccion_id', ids).then((x) => ok(x)),
    cliente().from('lecciones').select('id, meta').in('id', ids).then((x) => ok(x)),
  ]);
  for (const id of ids) r[id] = estadoVacio();
  for (const f of filas) Object.assign(r[f.leccion_id], { datos: f.datos || {}, abierta: f.abierta, actualizado: f.actualizado });
  for (const l of lecs) r[l.id].meta = l.meta;
  return r;
}

export async function estado(id) { return (await estados([id]))[id]; }

export async function guardarDatos(leccionId, datos) {
  if ((await usuario())?.rol !== 'familia') return;
  ok(await cliente().rpc('guardar_estado', { p_leccion: leccionId, p_datos: datos }));
}

export async function guardarMeta(leccionId, meta) {
  ok(await cliente().rpc('guardar_meta', { p_leccion: leccionId, p_meta: meta }));
}

export async function marcarAbierta(leccionId) {
  if ((await usuario())?.rol !== 'familia') return;
  ok(await cliente().rpc('abrir_leccion', { p_leccion: leccionId }));
}

// --- Actividad --------------------------------------------------------------------------------------
export async function sumarActividad(ninoId, { minutos = 0, logros = 0 }) {
  if ((await usuario())?.rol !== 'familia') return;
  ok(await cliente().rpc('sumar_actividad', { p_nino: ninoId, p_dia: hoy(), p_minutos: minutos, p_logros: logros }));
}

export async function actividad(ninoId) {
  return ok(await cliente().from('actividad').select('dia, minutos, logros').eq('nino_id', ninoId)).map((a) => ({ ninoId, ...a }));
}

// --- Equipo -----------------------------------------------------------------------------------------
export async function familias() {
  const [perfiles, todos] = await Promise.all([
    cliente().from('perfiles').select('id, nombre, correo, rol, creado').eq('rol', 'familia').then((x) => ok(x)),
    ninos(),
  ]);
  return perfiles.map((p) => ({ ...p, ninos: todos.filter((n) => n.familiaId === p.id) }));
}

export async function reiniciarDemo() { /* solo existe en modo demostración */ }

// --- Acceso, pagos y actividad de familias ---------------------------------------------------------
/** Se llama una vez al abrir la app: guarda el "último ingreso". */
export async function marcarIngreso() { await cliente().rpc('marcar_ingreso'); }

/** Lo que el perfil necesita para volver a pedir los datos (después de pagar o cambiar algo). */
export function olvidarPerfil() { perfilCache = null; }

const aAjustes = (r) => ({ precio: r?.precio || 0, llave: r?.llave || '', banco: r?.banco || '', titular: r?.titular || '', whatsapp: r?.whatsapp || '', nota: r?.nota || '' });
export async function ajustesCobro() {
  return aAjustes(ok(await cliente().from('ajustes_cobro').select('*').eq('id', 1).maybeSingle()));
}
export async function guardarAjustesCobro(a) {
  const campos = { precio: Math.max(0, Math.round(Number(a.precio) || 0)), llave: String(a.llave || '').trim(), banco: String(a.banco || '').trim(), titular: String(a.titular || '').trim(), whatsapp: String(a.whatsapp || '').replace(/\D/g, ''), nota: String(a.nota || '').trim() };
  return aAjustes(ok(await cliente().from('ajustes_cobro').update(campos).eq('id', 1).select().single(), 'Solo el dueño puede cambiar los datos de cobro.'));
}

export async function familiasResumen() {
  return ok(await cliente().rpc('familias_resumen')).map((f) => ({
    id: f.id, nombre: f.nombre, correo: f.correo, creado: f.creado, accesoHasta: f.acceso_hasta, suspendido: f.suspendido,
    ultimoIngreso: f.ultimo_ingreso, ultimoEstudio: f.ultimo_estudio, minutos7: f.minutos_7, ninos: f.ninos, lecciones: f.lecciones,
  }));
}

export async function historialAcceso(familiaId) {
  const filas = ok(await cliente().from('historial_acceso').select('*, quien:perfiles!historial_acceso_por_fkey(nombre)').eq('familia_id', familiaId).order('creado', { ascending: false }));
  return filas.map((h) => ({ id: h.id, accion: h.accion, meses: h.meses, monto: h.monto, metodo: h.metodo, nota: h.nota, hasta: h.hasta, por: h.quien?.nombre || '', creado: h.creado }));
}

export async function registrarPago({ familiaId, meses, monto, metodo, nota }) {
  return ok(await cliente().rpc('registrar_pago', { p_familia: familiaId, p_meses: meses, p_monto: monto, p_metodo: metodo, p_nota: nota }));
}

export async function cambiarAcceso({ familiaId, accion, hasta = null, nota = '' }) {
  ok(await cliente().rpc('cambiar_acceso', { p_familia: familiaId, p_accion: accion, p_hasta: hasta, p_nota: nota }));
}

// --- Avisos (notificaciones push) ------------------------------------------------------------------
export async function registrarPush({ endpoint, p256dh, auth, dispositivo }) {
  ok(await cliente().rpc('registrar_push', { p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth, p_dispositivo: dispositivo }));
}
export async function quitarPush(endpoint) {
  ok(await cliente().rpc('quitar_push', { p_endpoint: endpoint }));
}
async function llamarAvisos(cuerpo) {
  const { data, error } = await cliente().functions.invoke('avisos', { body: cuerpo });
  if (error) falla(error, 'No se pudo enviar el aviso.');
  if (data?.error) throw new Error(data.error);
  return data;
}
export const probarAvisos = () => llamarAvisos({ tipo: 'prueba' });
/** Avisa a la familia que llegó una lección (lo llama el equipo al asignarla). */
export const avisarLeccion = (leccionId) => llamarAvisos({ tipo: 'leccion', leccion_id: leccionId });
