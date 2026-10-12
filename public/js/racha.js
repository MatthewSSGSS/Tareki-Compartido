// =============================================================================
// racha.js — Días seguidos estudiando.
// Un día cuenta si el niño logró algo (terminó un juego, la ficha, el simulacro…)
// o estudió al menos RACHA.minutosDia minutos.
// =============================================================================

import { hoy, sumarDias } from './util.js';
import { RACHA } from './config.js';

export const diaActivo = (a) => !!a && (a.logros > 0 || a.minutos >= RACHA.minutosDia);

/**
 * @param {{dia:string, minutos:number, logros:number}[]} actividad
 * @returns {{actual:number, mejor:number, hoyListo:boolean, enRiesgo:boolean,
 *            semana:{dia:string, activo:boolean, hoy:boolean, minutos:number}[], totalDias:number}}
 */
export function calcularRacha(actividad) {
  const porDia = new Map(actividad.map((a) => [a.dia, a]));
  const activos = new Set(actividad.filter(diaActivo).map((a) => a.dia));
  const h = hoy();
  const hoyListo = activos.has(h);

  // La racha sigue viva si hoy todavía no estudia pero ayer sí.
  let dia = hoyListo ? h : sumarDias(h, -1);
  let actual = 0;
  while (activos.has(dia)) { actual++; dia = sumarDias(dia, -1); }

  let mejor = 0, seguidos = 0, anterior = null;
  for (const d of [...activos].sort()) {
    seguidos = anterior && sumarDias(anterior, 1) === d ? seguidos + 1 : 1;
    mejor = Math.max(mejor, seguidos);
    anterior = d;
  }

  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = sumarDias(h, i - 6);
    return { dia: d, activo: activos.has(d), hoy: d === h, minutos: porDia.get(d)?.minutos || 0 };
  });

  return { actual, mejor, hoyListo, enRiesgo: actual > 0 && !hoyListo, semana, totalDias: activos.size };
}

/** Frase de Lulo según cómo va la racha. */
export function fraseRacha(r, nombre) {
  if (r.hoyListo && r.actual >= 7) return `¡${r.actual} días seguidos, ${nombre}! Eres imparable 🔥`;
  if (r.hoyListo) return `¡Listo por hoy! Llevas ${r.actual} ${r.actual === 1 ? 'día' : 'días'} de racha. Vuelve mañana 🌟`;
  if (r.enRiesgo) return `¡Tu racha de ${r.actual} ${r.actual === 1 ? 'día' : 'días'} está en peligro! Juega un ratico hoy para no perderla 😱`;
  return `¡Hola, ${nombre}! Juega hoy para empezar una racha nueva 🔥`;
}
