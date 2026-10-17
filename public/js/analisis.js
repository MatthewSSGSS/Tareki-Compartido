// =============================================================================
// analisis.js — Convierte lo que guardan las lecciones en números para la app.
//
// Las lecciones de Lección Divertida guardan su progreso así (claves de ejemplo):
//   "ld6-progress"   → {"<clave-lección>": {pizzaS:3, bossS:2, exam100:85, ficha100:90, pizzaS_h:1, …}}
//                       (campos que terminan en S = estrellas de un juego; _h = modo difícil)
//   "ld6-ficha-hist" → [{d:"2026-10-01", n:80, s:300, t:{tema:[aciertos, total]}, h:0}, …]
// Los prefijos cambian entre lecciones, así que aquí se reconocen por su forma.
// Los nombres de juegos y temas llegan en `meta` (el puente los lee de la lección).
// =============================================================================

import { promedio, primerNombre, diasEntre, hoy, sumarDias } from './util.js';

const leer = (v) => { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return v; } };
const esHistorial = (x) => Array.isArray(x) && x.length > 0 && x.every((e) => e && typeof e === 'object' && typeof e.n === 'number' && typeof e.d === 'string');

/**
 * Analiza una lección.
 * @returns {object} juegos, estrellas, ficha, simulacro, jefe, historial, temas, progreso (0-100), estado
 */
export function analizarLeccion(leccion, est = {}) {
  const datos = est.datos || {};
  const meta = est.meta || {};
  const campos = {};
  let historial = [];

  for (const v of Object.values(datos)) {
    const x = leer(v);
    if (esHistorial(x)) { if (x.length > historial.length) historial = x; continue; }
    if (x && typeof x === 'object' && !Array.isArray(x)) {
      for (const sub of Object.values(x)) {
        if (!sub || typeof sub !== 'object' || Array.isArray(sub)) continue;
        for (const [k, n] of Object.entries(sub)) if (typeof n === 'number') campos[k] = Math.max(campos[k] || 0, n);
      }
    }
  }

  const listaJuegos = meta.juegos?.length
    ? meta.juegos
    : Object.keys(campos).filter((k) => /S$/.test(k) && k !== 'bossS').map((f) => ({ id: f, nombre: f.replace(/S$/, ''), emoji: '🎮', f }));
  const juegos = listaJuegos.map((j) => ({ ...j, estrellas: Math.min(3, campos[j.f] || 0), dificil: Math.min(3, campos[`${j.f}_h`] || 0) }));
  const jugados = juegos.filter((j) => j.estrellas || j.dificil).length;

  const jefe = Math.min(3, Math.max(campos.bossS || 0, campos.bossS_h || 0));
  const tieneJefe = !!meta.jefe || jefe > 0;
  const simulacro = Math.max(campos.exam100 || 0, campos.exam100_h || 0) || null;
  const tieneSimulacro = !!meta.simulacro || !!simulacro;

  const hist = historial
    .map((h) => ({ dia: String(h.d).slice(0, 10), nota: h.n, segundos: h.s || 0, temas: h.t || {}, dificil: !!h.h }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
  const fichaMejor = campos.ficha100 || (hist.length ? Math.max(...hist.map((h) => h.nota)) : null);
  const tieneFicha = !!meta.ficha || !!fichaMejor;
  const ultimaNota = hist.at(-1)?.nota ?? fichaMejor ?? null;
  const notaAnterior = hist.length > 1 ? hist.at(-2).nota : null;

  // Temas: se suman las dos últimas fichas (más estable que una sola)
  const nombresTemas = meta.temas || {};
  const recientes = hist.slice(-2);
  const claves = new Set([...Object.keys(nombresTemas), ...recientes.flatMap((h) => Object.keys(h.temas))]);
  const temas = [...claves].map((k) => {
    let ok = 0, total = 0;
    recientes.forEach((h) => { const t = h.temas[k]; if (Array.isArray(t)) { ok += t[0]; total += t[1]; } });
    const info = nombresTemas[k] || {};
    const juego = listaJuegos.find((j) => j.id === info.game);
    return { clave: k, nombre: info.n || k, emoji: info.e || '📌', pregunta: info.q || '', juego: juego?.nombre || null, ok, total, pct: total ? Math.round((ok * 100) / total) : null };
  }).filter((t) => t.total);

  // Segundos por pregunta en la última ficha (si responde muy rápido, puede estar adivinando)
  const ultima = hist.at(-1);
  const preguntasUltima = ultima ? Object.values(ultima.temas).reduce((s, t) => s + (Array.isArray(t) ? t[1] : 0), 0) : 0;
  const segPorPregunta = ultima && preguntasUltima ? Math.round(ultima.segundos / preguntasUltima) : null;

  // Progreso: juegos 45 %, ficha 25 %, jefe 15 %, simulacro 15 % (solo lo que tenga la lección)
  const partes = [];
  if (juegos.length) partes.push([45, jugados / juegos.length]);
  if (tieneFicha) partes.push([25, fichaMejor ? 1 : 0]);
  if (tieneJefe) partes.push([15, jefe ? 1 : 0]);
  if (tieneSimulacro) partes.push([15, simulacro ? 1 : 0]);
  const peso = partes.reduce((s, [p]) => s + p, 0);
  const progreso = peso ? Math.round(partes.reduce((s, [p, v]) => s + p * v, 0) * 100 / peso) : 0;

  const estrellas = juegos.reduce((s, j) => s + j.estrellas, 0) + jefe;
  const estrellasMax = juegos.length * 3 + (tieneJefe ? 3 : 0);
  const empezada = !!est.abierta || progreso > 0;
  const terminada = progreso >= 75 && !!fichaMejor;

  return {
    leccion, meta,
    juegos, jugados, jefe, tieneJefe, simulacro, fichaMejor, ultimaNota, notaAnterior,
    historial: hist, temas, segPorPregunta,
    estrellas, estrellasMax, progreso,
    estado: terminada ? 'terminada' : empezada ? 'empezada' : 'nueva',
    ultimaVez: est.actualizado || est.abierta || null,
    tips: meta.tips || null,
  };
}

/** Junta el análisis de todas las lecciones de un niño. */
export function resumenNino(analisis) {
  const notas = analisis
    .flatMap((a) => a.historial.map((h) => ({ ...h, titulo: a.leccion.titulo, leccionId: a.leccion.id })))
    .sort((x, y) => x.dia.localeCompare(y.dia));
  const conNota = analisis.filter((a) => a.ultimaNota != null);
  const temas = analisis.flatMap((a) => a.temas.map((t) => ({ ...t, titulo: a.leccion.titulo, leccionId: a.leccion.id })));
  return {
    estrellas: analisis.reduce((s, a) => s + a.estrellas, 0),
    terminadas: analisis.filter((a) => a.estado === 'terminada').length,
    enCurso: analisis.filter((a) => a.estado === 'empezada').length,
    nuevas: analisis.filter((a) => a.estado === 'nueva').length,
    jefes: analisis.filter((a) => a.jefe > 0).length,
    notas,
    promedio: conNota.length ? Math.round(promedio(conNota.map((a) => a.ultimaNota))) : null,
    mejorNota: notas.length ? Math.max(...notas.map((n) => n.nota)) : null,
    debiles: temas.filter((t) => t.pct < 70).sort((a, b) => a.pct - b.pct),
    fuertes: temas.filter((t) => t.pct === 100),
  };
}

/**
 * Consejos para los papás, de lo más urgente a lo menos.
 * @returns {{emoji:string, titulo:string, texto:string, tono:'alerta'|'bien'|'idea'}[]}
 */
export function consejosPapas({ nino, resumen, racha, actividad, analisis }) {
  const n = nino.nombre;
  const out = [];
  const diasActivos = actividad.filter((a) => a.minutos > 0 || a.logros > 0).map((a) => a.dia).sort();
  const ultimoDia = diasActivos.at(-1);
  const sinEstudiar = ultimoDia ? diasEntre(ultimoDia, hoy()) : null;
  const semana = actividad.filter((a) => a.dia > sumarDias(hoy(), -7)).reduce((s, a) => s + a.minutos, 0);

  // Siempre en positivo: qué hacer, no qué está mal (regla 2 de PROPUESTAS.md)
  if (racha.enRiesgo) out.push({ emoji: '🔥', tono: 'idea', titulo: `¡Hoy puede llegar a ${racha.actual + 1} días de racha!`, texto: `Todavía hay tiempo: con 10 minutos en cualquier juego, ${n} sigue sumando días.` });
  if (sinEstudiar != null && sinEstudiar >= 3) out.push({ emoji: '🌱', tono: 'idea', titulo: '¡Buen momento para volver!', texto: `Hace ${sinEstudiar} días que ${n} no juega. Propónganle un juego corto juntos, sin presión: volver es más fácil si el primer paso es divertido.` });
  if (resumen.nuevas) out.push({ emoji: '🎁', tono: 'idea', titulo: resumen.nuevas === 1 ? 'Hay una lección nueva esperando' : `Hay ${resumen.nuevas} lecciones nuevas esperando`, texto: `Ábranla juntos la primera vez: lean la pestaña Aprender y luego dejen que ${n} juegue por su cuenta.` });

  for (const a of analisis) {
    if (a.notaAnterior != null && a.ultimaNota != null && a.ultimaNota - a.notaAnterior >= 10) {
      out.push({ emoji: '📈', tono: 'bien', titulo: `Subió de ${a.notaAnterior} a ${a.ultimaNota} en «${a.leccion.titulo}»`, texto: `Feliciten a ${n} por el esfuerzo, no solo por la nota: «Se nota que practicaste».` });
    } else if (a.notaAnterior != null && a.ultimaNota != null && a.notaAnterior - a.ultimaNota >= 10) {
      out.push({ emoji: '🌱', tono: 'idea', titulo: `«${a.leccion.titulo}»: esta ficha trajo retos nuevos`, texto: `Pasó de ${a.notaAnterior} a ${a.ultimaNota}. Es normal: cada ficha trae ejercicios distintos. Repasen juntos su próximo reto y vuelvan a intentarla: la segunda vez suele salir mejor.` });
    }
    if (a.segPorPregunta != null && a.segPorPregunta < 12 && a.ultimaNota < 80) {
      out.push({ emoji: '📖', tono: 'idea', titulo: 'Una idea: leer con calma', texto: `En «${a.leccion.titulo}» respondió en ${a.segPorPregunta} segundos por pregunta. Pídanle que lea cada pregunta en voz alta antes de responder: así piensa mejor y la nota sube.` });
    }
  }

  resumen.debiles.slice(0, 2).forEach((t) => out.push({
    emoji: t.emoji, tono: 'idea', titulo: `Su próximo reto: ${t.nombre}`,
    texto: `Va ${t.ok} de ${t.total} en «${t.titulo}» y está fortaleciendo este tema.${t.juego ? ` Jueguen «${t.juego}».` : ''}${t.pregunta ? ` Pregúntenle hoy: «${t.pregunta}»` : ''}`,
  }));

  if (racha.hoyListo && racha.actual >= 3) out.push({ emoji: '🏅', tono: 'bien', titulo: `¡${racha.actual} días seguidos!`, texto: `Reconózcanle la constancia a ${n}. La racha es lo que más engancha: que no se rompa el fin de semana.` });
  if (semana < 40 && diasActivos.length) out.push({ emoji: '🗓️', tono: 'idea', titulo: 'Meta de la semana: 60 minutos', texto: `Van ${semana} minutos. Mejor poquito y seguido: 15 minutos al día, 4 días a la semana.` });
  if (!out.length) out.push({ emoji: '🌟', tono: 'bien', titulo: `${n} va muy bien`, texto: 'Sigan así. Cuando saque 3 estrellas en todo, rétenlo con el modo difícil.' });
  return out;
}

/** Medallas que se ganan jugando. */
export function medallas({ resumen, racha, analisis }) {
  const max = Math.max(racha.mejor, racha.actual);
  const notas = resumen.notas.map((x) => x.nota);
  const lista = [
    { emoji: '🚀', nombre: 'Despegue', texto: 'Abre tu primera lección', ok: analisis.some((a) => a.estado !== 'nueva') },
    { emoji: '⭐', nombre: 'Estrella', texto: 'Gana 3 estrellas en un juego', ok: analisis.some((a) => a.juegos.some((j) => j.estrellas === 3)) },
    { emoji: '🔥', nombre: 'En llamas', texto: 'Racha de 3 días', ok: max >= 3 },
    { emoji: '☄️', nombre: 'Semana de fuego', texto: 'Racha de 7 días', ok: max >= 7 },
    { emoji: '🌋', nombre: 'Volcán', texto: 'Racha de 30 días', ok: max >= 30 },
    { emoji: '📝', nombre: 'Primera ficha', texto: 'Presenta una ficha', ok: notas.length > 0 },
    { emoji: '🏆', nombre: 'Superior', texto: 'Saca 90 o más en una ficha', ok: notas.some((x) => x >= 90) },
    { emoji: '📈', nombre: 'Escalador', texto: 'Mejora tu nota en una lección', ok: analisis.some((a) => a.notaAnterior != null && a.ultimaNota > a.notaAnterior) },
    { emoji: '⚔️', nombre: 'Cazajefes', texto: 'Vence a un jefe final', ok: resumen.jefes > 0 },
    { emoji: '🎓', nombre: 'Graduado', texto: 'Termina una lección completa', ok: resumen.terminadas > 0 },
    { emoji: '💯', nombre: 'Coleccionista', texto: 'Junta 50 estrellas', ok: resumen.estrellas >= 50 },
    { emoji: '🌶️', nombre: 'Picante', texto: 'Gana un juego en modo difícil', ok: analisis.some((a) => a.juegos.some((j) => j.dificil > 0)) },
  ];
  return lista;
}
