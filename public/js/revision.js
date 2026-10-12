// =============================================================================
// revision.js — Revisa qué niños menciona una lección HTML antes de asignarla,
// para que no le llegue a la familia equivocada.
// =============================================================================

import { plano, primerNombre } from './util.js';

const escRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const veces = (texto, nombre) => {
  const n = plano(nombre).trim();
  if (n.length < 3) return 0;
  return (texto.match(new RegExp(`(^|[^a-z0-9])${escRegex(n)}(?=[^a-z0-9]|$)`, 'g')) || []).length;
};

/** Cuántas veces aparece cada niño en el archivo (el nombre completo vale doble). */
export function coincidencias(html, lista) {
  // Los estilos y los comentarios no los ve el niño (suelen ser restos de la plantilla)
  const contenido = html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const texto = plano(contenido);
  return lista.map((n) => {
    const completo = veces(texto, n.nombre);
    const primero = n.nombre.trim().includes(' ') ? veces(texto, primerNombre(n.nombre)) : completo;
    return { nino: n, puntos: completo * 2 + primero };
  }).filter((c) => c.puntos > 0).sort((a, b) => b.puntos - a.puntos);
}

