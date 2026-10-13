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
  if (/^(Ese|Escribe|La contraseña|Ya hay|Solo|Los meses|Elige|Acción|Esa familia)/.test(m)) throw new Error(m); // mensajes nuestros
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
    // Si a la base le faltan columnas nuevas (falta correr algún .sql), seguir funcionando con lo que haya
    let p = null;
    for (const campos of ['id, rol, dueno, nombre, correo, acceso_hasta, suspendido, celular', 'id, rol, dueno, nombre, correo, acceso_hasta, suspendido', 'id, rol, dueno, nombre, correo']) {
      const r = await cliente().from('perfiles').select(campos).eq('id', u.id).maybeSingle();
      if (!r.error) { p = r.data; break; }
    }
    if (p && !('acceso_hasta' in p)) p = { ...p, acceso_hasta: '2999-12-31', suspendido: false };
    if (!p) return null; // cuenta sin perfil (no debería pasar)
    perfilCache = { id: p.id, rol: p.rol, dueno: p.dueno, nombre: p.nombre, correo: p.correo, accesoHasta: p.acceso_hasta, suspendido: p.suspendido, celular: p.celular || '' };
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

/** Cambia el nombre de la cuenta actual (el equipo lo ve en el chat). */
export async function cambiarMiNombre(nombre) {
  const n = String(nombre || '').trim().replace(/\s+/g, ' ');
  if (n.length < 2) throw new Error('Escribe tu nombre.');
  const yo = await usuario();
  ok(await cliente().from('perfiles').update({ nombre: n.slice(0, 60) }).eq('id', yo.id), 'No se pudo cambiar el nombre.');
  if (perfilCache) perfilCache.nombre = n.slice(0, 60);
  return n;
}

// --- Invitaciones ---------------------------------------------------------------------------
export async function revisarCodigo(codigo) {
  const filas = ok(await cliente().rpc('revisar_codigo', { p_codigo: String(codigo || '') }));
  if (!filas?.length) throw new Error('Ese código no existe. Revisa que esté bien escrito.');
  return filas[0];
}

export async function registrarFamilia({ codigo, nombre, correo, clave, celular = '' }) {
  const { data, error } = await cliente().functions.invoke('registro', { body: { codigo, nombre, correo, clave, celular } });
  if (error) falla(error, 'No pudimos crear la cuenta. Intenta de nuevo.');
  if (data?.error) throw new Error(data.error);
  return ingresar(correo, clave);
}

export async function crearInvitacion({ nota, rol = 'familia', diasAcceso = 30 }) {
  const yo = await usuario();
  const letras = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (let intento = 0; intento < 5; intento++) {
    const codigo = 'LEARN-' + Array.from(crypto.getRandomValues(new Uint32Array(6)), (n) => letras[n % letras.length]).join('');
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
  if (!borrados?.length) {
    const yo = await usuario();
    throw new Error(yo?.dueno
      ? 'Supabase todavía no deja quitar códigos de cuentas activas. Corre una vez el archivo privado/codigos-dueno.sql en el SQL Editor y vuelve a intentar.'
      : 'Solo el dueño puede quitar códigos de cuentas activas.');
  }
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

const aAjustes = (r) => ({ precio: r?.precio || 0, precioPrimaria: r?.precio_primaria || 0, precioBachillerato: r?.precio_bachillerato || 0, llave: r?.llave || '', banco: r?.banco || '', titular: r?.titular || '', whatsapp: r?.whatsapp || '', nota: r?.nota || '' });
export async function ajustesCobro() {
  return aAjustes(ok(await cliente().from('ajustes_cobro').select('*').eq('id', 1).maybeSingle()));
}
export async function guardarAjustesCobro(a) {
  const plata = (v) => Math.max(0, Math.round(Number(String(v ?? '').replace(/\D/g, '')) || 0));
  const campos = { precio_primaria: plata(a.precioPrimaria), precio_bachillerato: plata(a.precioBachillerato), llave: String(a.llave || '').trim(), banco: String(a.banco || '').trim(), titular: String(a.titular || '').trim(), whatsapp: String(a.whatsapp || '').replace(/\D/g, ''), nota: String(a.nota || '').trim() };
  return aAjustes(ok(await cliente().from('ajustes_cobro').update(campos).eq('id', 1).select().single(), 'Solo el dueño puede cambiar los datos de cobro.'));
}

export async function familiasResumen() {
  return ok(await cliente().rpc('familias_resumen')).map((f) => ({
    id: f.id, nombre: f.nombre, correo: f.correo, celular: f.celular || '', creado: f.creado, accesoHasta: f.acceso_hasta, suspendido: f.suspendido,
    ultimoIngreso: f.ultimo_ingreso, ultimoEstudio: f.ultimo_estudio, minutos7: f.minutos_7, ninos: f.ninos, lecciones: f.lecciones,
  }));
}

export async function historialAcceso(familiaId) {
  const filas = ok(await cliente().from('historial_acceso').select('*, quien:perfiles!historial_acceso_por_fkey(nombre)').eq('familia_id', familiaId).order('creado', { ascending: false }));
  return filas.map((h) => ({ id: h.id, accion: h.accion, meses: h.meses, monto: h.monto, metodo: h.metodo, nota: h.nota, hasta: h.hasta, por: h.quien?.nombre || '', creado: h.creado }));
}

/** Cambia el celular (WhatsApp) de una familia: la misma familia o el equipo. */
export async function cambiarCelular(familiaId, celular) {
  const limpio = ok(await cliente().rpc('cambiar_celular', { p_familia: familiaId, p_celular: celular }), 'No se pudo guardar el celular.');
  perfilCache = null;
  return limpio;
}

/** Borra un registro del historial (solo el dueño). La fecha de acceso no cambia. */
export async function borrarHistorial(id) {
  const borrados = ok(await cliente().from('historial_acceso').delete().eq('id', id).select('id'));
  if (!borrados?.length) throw new Error('No se pudo borrar. Si eres el dueño, corre una vez privado/historial.sql en el SQL Editor de Supabase.');
}

export async function registrarPago({ familiaId, meses, monto, metodo, nota }) {
  return ok(await cliente().rpc('registrar_pago', { p_familia: familiaId, p_meses: meses, p_monto: monto, p_metodo: metodo, p_nota: nota }));
}

export async function cambiarAcceso({ familiaId, accion, hasta = null, nota = '' }) {
  ok(await cliente().rpc('cambiar_acceso', { p_familia: familiaId, p_accion: accion, p_hasta: hasta, p_nota: nota }));
}

// --- Mensajes del equipo ---------------------------------------------------------------------------
const aMensaje = (m) => ({ id: m.id, titulo: m.titulo, cuerpo: m.cuerpo, url: m.url, destino: m.destino, familias: m.familias || [], programado: m.programado, enviado: m.enviado, creadoPor: m.creado_por, creado: m.creado });

/** Equipo: todos los mensajes. Familia: los que ya le llegaron. */
export async function mensajes() {
  return ok(await cliente().from('mensajes').select('*').order('programado', { ascending: false }).limit(200)).map(aMensaje);
}

/** Crea un mensaje. Si es para ya, lo envía de una vez; si no, sale solo a su hora (revisión cada 10 min). */
export async function crearMensaje({ titulo, cuerpo, url, destino, familias = [], programado = null }) {
  const yo = await usuario();
  const cuando = programado ? new Date(programado) : new Date();
  const m = ok(await cliente().from('mensajes').insert({
    titulo: String(titulo).trim(), cuerpo: String(cuerpo || '').trim(), url: url || '#/', destino,
    familias: destino === 'familias' ? familias : [], programado: cuando.toISOString(), creado_por: yo.id,
  }).select().single(), 'No se pudo guardar el mensaje.');
  if (cuando <= new Date(Date.now() + 60000)) return { ...aMensaje(m), resultado: await enviarMensajeYa(m.id) };
  return aMensaje(m);
}

export async function enviarMensajeYa(id) {
  const { data, error } = await cliente().functions.invoke('avisos', { body: { tipo: 'mensaje', id } });
  if (error) falla(error, 'No se pudo enviar el mensaje.');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function borrarMensaje(id) { ok(await cliente().from('mensajes').delete().eq('id', id)); }

/** Avisa al equipo que la familia creó un perfil (para que le suban lecciones). */
export async function avisarNinoNuevo(ninoId) {
  await cliente().functions.invoke('avisos', { body: { tipo: 'nino-nuevo', nino_id: ninoId } });
}

/** Quita una familia por completo (solo el dueño): primero los archivos, luego la cuenta. */
export async function quitarFamilia(familiaId) {
  const hijos = ok(await cliente().from('ninos').select('id').eq('familia_id', familiaId)).map((n) => n.id);
  if (hijos.length) {
    const archivos = ok(await cliente().from('lecciones').select('archivo').in('nino_id', hijos)).map((l) => l.archivo);
    if (archivos.length) await cliente().storage.from('lecciones').remove(archivos);
  }
  const { data: peds } = await cliente().from('pedidos').select('fotos').eq('familia_id', familiaId);
  const fotos = (peds || []).flatMap((p) => p.fotos || []);
  if (fotos.length) await cliente().storage.from('adjuntos').remove(fotos);
  ok(await cliente().rpc('quitar_familia', { p_familia: familiaId }), 'No se pudo quitar la familia.');
}

// --- Chat familia ↔ equipo -------------------------------------------------------------------------
const aChat = (c) => ({
  id: c.id, familiaId: c.familia_id, autor: c.autor, autorNombre: c.quien?.nombre || '', deEquipo: c.de_equipo, texto: c.texto, leido: c.leido, creado: c.creado,
  pedidoId: c.pedido_id || null, pedido: c.pedido ? { id: c.pedido.id, estado: c.pedido.estado, fotos: c.pedido.fotos || [] } : null,
});

/** La conversación de una familia (la familia: la suya; el equipo: la que pida). */
export async function chat(familiaId) {
  const consulta = (campos) => cliente().from('chat').select(campos).eq('familia_id', familiaId).order('creado').limit(500);
  let r = await consulta('*, quien:perfiles!chat_autor_fkey(nombre), pedido:pedidos(id, estado, fotos)');
  if (r.error) r = await consulta('*, quien:perfiles!chat_autor_fkey(nombre)'); // aún no se corre pedidos.sql
  return ok(r).map(aChat);
}

/** Equipo: el último mensaje y los sin leer de cada familia. */
export async function chatResumen() {
  const filas = ok(await cliente().from('chat').select('familia_id, de_equipo, texto, leido, creado').order('creado', { ascending: false }).limit(2000));
  const por = new Map();
  for (const c of filas) {
    const r = por.get(c.familia_id) || { familiaId: c.familia_id, ultimo: c.texto, deEquipo: c.de_equipo, creado: c.creado, sinLeer: 0 };
    if (!c.de_equipo && !c.leido) r.sinLeer++;
    por.set(c.familia_id, r);
  }
  return [...por.values()];
}

export async function enviarChat({ familiaId, texto, pedidoId = null }) {
  const yo = await usuario();
  const t = String(texto || '').trim();
  if (!t) throw new Error('Escribe un mensaje.');
  const fila = { familia_id: familiaId, autor: yo.id, de_equipo: yo.rol === 'equipo', texto: t.slice(0, 1000), ...(pedidoId ? { pedido_id: pedidoId } : {}) };
  const c = ok(await cliente().from('chat').insert(fila).select().single(), 'No se pudo enviar el mensaje.');
  // Notificación al otro lado. La promesa dice a cuántos dispositivos salió ({enviados, total}).
  const notificacion = cliente().functions.invoke('avisos', { body: { tipo: 'chat', id: c.id } })
    .then(({ data }) => data || null).catch(() => null);
  return { ...aChat({ ...c, quien: { nombre: yo.nombre } }), notificacion };
}

/** Dispositivos con avisos activados de una cuenta (el equipo lo ve en la ficha de la familia). */
export async function dispositivosDe(usuarioId) {
  const { data, error } = await cliente().rpc('dispositivos_de', { p_usuario: usuarioId });
  if (error) return null; // falta correr el SQL: no se sabe
  return data || [];
}

export async function marcarChatLeido(familiaId) { await cliente().rpc('marcar_chat_leido', { p_familia: familiaId }); }

/** Cuántos mensajes del otro lado faltan por leer (para los avisos de la app). */
export async function chatSinLeer() {
  const yo = await usuario();
  if (!yo) return 0;
  let q = cliente().from('chat').select('id', { count: 'exact', head: true }).eq('leido', false);
  q = yo.rol === 'equipo' ? q.eq('de_equipo', false) : q.eq('de_equipo', true).eq('familia_id', yo.id);
  const { count } = await q;
  return count || 0;
}

// --- Pedidos de lecciones (la familia pide, el equipo arma) -------------------------------------------
const aPedido = (p) => ({
  id: p.id, familiaId: p.familia_id, familiaNombre: p.familia?.nombre || '', ninoId: p.nino_id, nino: p.nino || null,
  materia: p.materia, temas: p.temas, para: p.para, fotos: p.fotos || [], estado: p.estado,
  atendidoPor: p.atendido_por, atendidoNombre: p.atendio?.nombre || '', creado: p.creado, actualizado: p.actualizado,
});
const sinPedidos = (error) => /schema cache|does not exist/i.test(error?.message || '');
const FALTA_SQL = 'Los pedidos aún no están activados en Supabase (falta correr pedidos.sql).';

/** La familia: los suyos. El equipo: todos (los más nuevos primero). */
export async function pedidos() {
  const { data, error } = await cliente().from('pedidos')
    .select('*, nino:ninos(id, nombre, avatar, color), familia:perfiles!pedidos_familia_id_fkey(nombre), atendio:perfiles!pedidos_atendido_por_fkey(nombre)')
    .order('creado', { ascending: false }).limit(300);
  if (error) { if (sinPedidos(error)) return []; falla(error, 'No se pudieron cargar los pedidos.'); }
  return data.map(aPedido);
}

/** Cuántos pedidos esperan a que alguien del equipo los tome. */
export async function pedidosNuevos() {
  const { count, error } = await cliente().from('pedidos').select('id', { count: 'exact', head: true }).eq('estado', 'nuevo');
  return error ? 0 : count || 0;
}

/** Sube las fotos (Blobs ya achicados), guarda el pedido y lo pone en el chat (eso avisa al equipo). */
export async function crearPedido({ ninoId, materia, temas, para, fotos = [], textoChat }) {
  const yo = await usuario();
  const id = crypto.randomUUID();
  const rutas = [];
  try {
    for (const [i, f] of fotos.entries()) {
      const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg';
      const ruta = `${yo.id}/${id}/${i + 1}.${ext}`;
      const { error } = await cliente().storage.from('adjuntos').upload(ruta, f, { contentType: f.type || 'image/jpeg', upsert: false });
      if (error) { if (/bucket not found/i.test(error.message)) throw new Error(FALTA_SQL); falla(error, `No se pudo subir la foto ${i + 1}. Intenta de nuevo.`); }
      rutas.push(ruta);
    }
    const { error } = await cliente().from('pedidos').insert({ id, familia_id: yo.id, nino_id: ninoId || null, materia, temas: String(temas || '').slice(0, 2000), para: para || null, fotos: rutas });
    if (error) { if (sinPedidos(error)) throw new Error(FALTA_SQL); falla(error, 'No se pudo enviar el pedido.'); }
  } catch (e) {
    if (rutas.length) cliente().storage.from('adjuntos').remove(rutas).catch(() => {});
    throw e;
  }
  const mensaje = await enviarChat({ familiaId: yo.id, texto: textoChat, pedidoId: id }).catch(() => null);
  return { id, mensaje };
}

/** Equipo: nuevo → en_proceso → listo (queda anotado quién lo tomó). */
export async function cambiarEstadoPedido(id, estado) {
  const yo = await usuario();
  ok(await cliente().from('pedidos').update({ estado, atendido_por: estado === 'nuevo' ? null : yo.id, actualizado: new Date().toISOString() }).eq('id', id), 'No se pudo cambiar el pedido.');
}

export async function borrarPedido(pedido) {
  if (pedido.fotos?.length) await cliente().storage.from('adjuntos').remove(pedido.fotos);
  ok(await cliente().from('pedidos').delete().eq('id', pedido.id), 'No se pudo borrar el pedido.');
}

/** Enlaces temporales (1 hora) para ver las fotos; con descargar: true, para bajarlas. */
export async function urlsFotos(rutas, { descargar = false } = {}) {
  if (!rutas?.length) return [];
  const { data, error } = await cliente().storage.from('adjuntos').createSignedUrls(rutas, 3600, descargar ? { download: true } : undefined);
  if (error) return rutas.map(() => null);
  return rutas.map((r) => data.find((d) => d.path === r)?.signedUrl || null);
}

// --- Chat interno del equipo ------------------------------------------------------------------------
export async function chatEquipo() {
  const filas = ok(await cliente().from('chat_equipo').select('*, quien:perfiles!chat_equipo_autor_fkey(nombre)').order('creado', { ascending: false }).limit(300));
  return filas.reverse().map((c) => ({ id: c.id, autor: c.autor, autorNombre: c.quien?.nombre || '', texto: c.texto, creado: c.creado }));
}
export async function enviarChatEquipo(texto) {
  const yo = await usuario();
  const t = String(texto || '').trim();
  if (!t) throw new Error('Escribe un mensaje.');
  const c = ok(await cliente().from('chat_equipo').insert({ autor: yo.id, texto: t.slice(0, 1000) }).select().single(), 'No se pudo enviar el mensaje.');
  // La promesa dice a quién del equipo le llegó la notificación ({llego, noLlego})
  const notificacion = cliente().functions.invoke('avisos', { body: { tipo: 'chat-equipo', id: c.id } })
    .then(({ data }) => data || null).catch(() => null);
  return { id: c.id, autor: c.autor, autorNombre: yo.nombre, texto: c.texto, creado: c.creado, notificacion };
}
/** Las personas del equipo y si tienen avisos activados (para el chat interno). */
export async function equipoConAvisos() {
  const miembros = ok(await cliente().from('perfiles').select('id, nombre').eq('rol', 'equipo').order('nombre'));
  return Promise.all(miembros.map(async (m) => ({ ...m, dispositivos: await dispositivosDe(m.id) })));
}

export async function marcarEquipoVisto() { await cliente().rpc('marcar_equipo_visto'); }
export async function equipoSinLeer() {
  const { data, error } = await cliente().rpc('equipo_sin_leer');
  return error ? 0 : data || 0;
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
