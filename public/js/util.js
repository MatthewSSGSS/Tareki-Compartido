// =============================================================================
// util.js — Funciones pequeñas sin dependencias (texto, fechas, almacenamiento).
// =============================================================================

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

/** Fecha local como AAAA-MM-DD (no UTC: en Colombia la noche ya sería "mañana"). */
export const fechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hoy = () => fechaLocal();

export function sumarDias(dia, n) {
  const d = new Date(`${dia}T12:00:00`);
  d.setDate(d.getDate() + n);
  return fechaLocal(d);
}
export const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000);

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS_CORTOS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** "hoy", "ayer", "hace 3 días" o "12 de octubre". */
export function fechaBonita(dia) {
  if (!dia) return '';
  const d = String(dia).slice(0, 10);
  const n = diasEntre(d, hoy());
  if (n === 0) return 'hoy';
  if (n === 1) return 'ayer';
  if (n > 1 && n < 7) return `hace ${n} días`;
  const f = new Date(`${d}T12:00:00`);
  return `${f.getDate()} de ${MESES[f.getMonth()]}`;
}
export const fechaCorta = (dia) => { const f = new Date(`${String(dia).slice(0, 10)}T12:00:00`); return `${f.getDate()}/${f.getMonth() + 1}`; };

export const primerNombre = (n) => String(n || '').trim().split(/\s+/)[0] || '';
export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export function minutosTexto(m) {
  m = Math.round(m || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

/** Nivel de una nota de 1 a 100 (misma escala de las lecciones). */
export const nivelNota = (n) =>
  n >= 90 ? { nombre: 'Superior', emoji: '🏆', clase: 'sup' }
    : n >= 80 ? { nombre: 'Alto', emoji: '🌟', clase: 'alt' }
      : n >= 60 ? { nombre: 'Básico', emoji: '👍', clase: 'bas' }
        : { nombre: 'Bajo', emoji: '💪', clase: 'baj' };

/** Quita tildes y pasa a minúsculas (para buscar). */
export const plano = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function leerLocal(clave, porDefecto) {
  try { const v = localStorage.getItem(clave); return v === null ? porDefecto : JSON.parse(v); } catch { return porDefecto; }
}
export function guardarLocal(clave, valor) {
  try { if (valor === undefined) localStorage.removeItem(clave); else localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin espacio o bloqueado */ }
}

export const promedio = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
