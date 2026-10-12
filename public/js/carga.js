// =============================================================================
// carga.js — Trae todo lo de un niño de una vez (lecciones, progreso, racha) y
// lo deja analizado. Lo usan Inicio, Logros, Papás y el panel del equipo.
// =============================================================================

import * as datos from './datos.js';
import { MATERIAS } from './config.js';
import { analizarLeccion, resumenNino } from './analisis.js';
import { calcularRacha } from './racha.js';
import { hoy, sumarDias } from './util.js';

export const materia = (id) => MATERIAS.find((m) => m.id === id) || MATERIAS.at(-1);

export async function cargarNino(ninoId) {
  const [nino, lecciones, actividad] = await Promise.all([datos.nino(ninoId), datos.lecciones(ninoId), datos.actividad(ninoId)]);
  const estados = await datos.estados(lecciones.map((l) => l.id));
  const analisis = lecciones.map((l) => analizarLeccion(l, estados[l.id]));
  const racha = calcularRacha(actividad);
  const desde = sumarDias(hoy(), -6);
  const minutosSemana = actividad.filter((a) => a.dia >= desde).reduce((s, a) => s + a.minutos, 0);
  return { nino, lecciones, estados, analisis, resumen: resumenNino(analisis), actividad, racha, minutosSemana };
}
