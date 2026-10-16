// =============================================================================
// perfil-leccion.js — "Perfil para la próxima lección" (solo el equipo).
//
// Junta lo que la app sabe de un niño (juegos que ya vio, sus favoritos, los que
// evita, temas débiles, fichas, ritmo y gustos) en un texto para pegar en
// claude.ai junto con las fotos de la tarea. Así la skill "lesson-maker"
// arma la lección a su medida en vez de a ciegas.
// Los gustos los escribe el equipo y se recuerdan en este dispositivo.
// =============================================================================

import { esc, plano, plural, hoy, sumarDias, leerLocal, guardarLocal } from './util.js';
import { abrirHoja, aviso } from './ui.js';
import { materia } from './carga.js';

const ANIMALES = { '🦊': 'zorro', '🐯': 'tigre', '🐼': 'panda', '🐸': 'rana', '🦁': 'león', '🐨': 'koala', '🐙': 'pulpo', '🦄': 'unicornio', '🐧': 'pingüino', '🐶': 'perro', '🐱': 'gato', '🐵': 'mono', '🦖': 'dinosaurio', '🐬': 'delfín', '🦋': 'mariposa', '🐢': 'tortuga' };
const COLORES = { '#59c3ff': 'azul', '#ff6b9a': 'rosado', '#35b862': 'verde', '#ffcf3f': 'amarillo', '#a77bff': 'morado', '#ff9a4d': 'naranja' };
const RECIENTES = 3; // cuántas lecciones cuentan como "hace poco"
const claveGustos = (ninoId) => `tareki:gustos:${ninoId}`;

/** Cómo le va con cada juego, juntando el mismo juego de distintas lecciones por su nombre. */
function juegosDelNino(analisis) {
  const orden = [...analisis].sort((a, b) => String(b.leccion.creada || '').localeCompare(String(a.leccion.creada || '')));
  const ultimas = new Set(orden.slice(0, RECIENTES));
  const por = new Map();
  for (const a of orden) {
    for (const j of a.juegos) {
      const k = plano(j.nombre);
      const x = por.get(k) || { nombre: j.nombre, recientes: 0, jugado: 0, tres: 0, dificil: 0, bajo: 0, evitado: 0 };
      if (ultimas.has(a)) x.recientes++;
      if (j.estrellas || j.dificil) {
        x.jugado++;
        if (j.estrellas === 3) x.tres++;
        if (j.dificil) x.dificil++;
        if (j.estrellas === 1 && !j.dificil) x.bajo++;
      } else if (a.jugados > 0) x.evitado++; // jugó otros juegos de esa lección, pero este no
      por.set(k, x);
    }
  }
  const lista = [...por.values()];
  return {
    orden,
    vistos: lista.filter((x) => x.recientes).sort((a, b) => b.recientes - a.recientes),
    favoritos: lista.filter((x) => x.tres || x.dificil).sort((a, b) => (b.tres + b.dificil) - (a.tres + a.dificil)),
    evita: lista.filter((x) => x.evitado && !x.jugado),
    cuestan: lista.filter((x) => x.bajo && !x.tres),
  };
}

/** El texto que se pega en claude.ai. */
export function textoPerfil({ nino, analisis, resumen, actividad }, gustos = '') {
  const n = nino.nombre;
  const j = juegosDelNino(analisis);
  const nombres = (xs, extra = () => '') => xs.slice(0, 8).map((x) => `${x.nombre}${extra(x)}`).join(', ');
  const lineas = [
    `PERFIL DE ${n.toUpperCase()} PARA SU PRÓXIMA LECCIÓN (Learnground)`,
    'Usa estos datos para armar la lección a su medida: cambia los juegos que ya vio, repite sus favoritos, refuerza sus temas débiles y usa sus gustos en la historia y los ejemplos.',
    '',
    `👤 ${n} · ${nino.grado}.º grado`,
    `Animal favorito: ${nino.avatar} ${ANIMALES[nino.avatar] || ''} · Color favorito: ${COLORES[nino.color] || nino.color}`.replace(/ +·/, ' ·'),
    `Gustos: ${gustos.trim() || '(sin datos)'}`,
    '',
  ];

  if (!analisis.length) {
    lineas.push('📚 Es su primera lección: todavía no hay datos de juegos ni de temas.');
    return lineas.join('\n');
  }

  lineas.push(`📚 Últimas lecciones: ${j.orden.slice(0, RECIENTES).map((a) => `${a.leccion.titulo} (${materia(a.leccion.materia).nombre}, ${a.progreso} %)`).join('; ')}`);
  if (j.vistos.length) lineas.push(`🎮 Juegos de sus últimas lecciones (mejor cámbialos por otros): ${nombres(j.vistos, (x) => (x.recientes > 1 ? ` (en ${x.recientes} de las últimas ${Math.min(RECIENTES, j.orden.length)})` : ''))}`);
  if (j.favoritos.length) lineas.push(`⭐ Sus favoritos (3 estrellas o modo difícil): ${nombres(j.favoritos)}`);
  if (j.evita.length) lineas.push(`🙈 Los evita (juega otros, estos no): ${nombres(j.evita)}`);
  if (j.cuestan.length) lineas.push(`😓 Le cuestan (1 estrella): ${nombres(j.cuestan)}`);
  if (!j.favoritos.length && !j.evita.length) lineas.push('🎮 Todavía no ha jugado lo suficiente para saber qué juegos prefiere.');

  const debiles = [...new Map(resumen.debiles.map((t) => [plano(t.nombre), t])).values()].slice(0, 6);
  const fuertes = [...new Map(resumen.fuertes.map((t) => [plano(t.nombre), t])).values()].slice(0, 5);
  if (debiles.length) lineas.push(`🎯 Temas débiles (refuérzalos): ${debiles.map((t) => `${t.nombre} (${t.pct} %, en «${t.titulo}»)`).join('; ')}`);
  if (fuertes.length) lineas.push(`💪 Temas que ya domina: ${fuertes.map((t) => t.nombre).join(', ')}`);
  if (resumen.promedio != null) lineas.push(`📝 Fichas: promedio ${resumen.promedio}/100${resumen.notas.length ? ` · última ${resumen.notas.at(-1).nota}/100` : ''}`);

  const desde = sumarDias(hoy(), -13);
  const activos = actividad.filter((a) => a.dia >= desde && a.minutos > 0);
  if (activos.length) {
    const prom = Math.round(activos.reduce((s, a) => s + a.minutos, 0) / activos.length);
    lineas.push(`⏱️ Ritmo: estudia unos ${prom} min cuando entra, ${plural(activos.length, 'día', 'días')} de los últimos 14${prom < 10 ? ' (juegos cortos le sirven más)' : ''}`);
  } else lineas.push('⏱️ Ritmo: no ha estudiado en los últimos 14 días (que la lección enganche desde el primer juego).');

  const rapida = [...j.orden].find((a) => a.segPorPregunta != null);
  if (rapida && rapida.segPorPregunta < 6) lineas.push(`⚠️ En su última ficha respondió muy rápido (${rapida.segPorPregunta} s por pregunta): puede estar adivinando. Incluye preguntas que obliguen a pensar.`);

  return lineas.join('\n');
}

/** Ventana con los gustos (editables) y el texto listo para copiar. */
export function abrirPerfilLeccion(d) {
  const { nino } = d;
  let gustos = leerLocal(claveGustos(nino.id), '');
  abrirHoja({
    titulo: `Perfil de ${nino.nombre} para la próxima lección`,
    ancha: true,
    cuerpo: `
      <p class="suave peq">Cópialo y pégalo en claude.ai junto con las fotos de la tarea: la lección sale pensada para ${esc(nino.nombre)}.</p>
      <div class="campo"><label for="pfGustos">Gustos e intereses <small class="suave">(opcional)</small></label>
        <input id="pfGustos" maxlength="160" value="${esc(gustos)}" placeholder="Ej.: fútbol, dinosaurios, Minecraft, su perro Rocky">
        <small>Se usan en la historia y los ejemplos. Se recuerdan en este dispositivo.</small></div>
      <pre class="perfil-texto" id="pfTexto"></pre>`,
    pie: '<button class="btn" data-copiar>📋 Copiar perfil</button>',
    montar: (el) => {
      const $t = el.querySelector('#pfTexto');
      const pintar = () => { $t.textContent = textoPerfil(d, gustos); };
      pintar();
      el.querySelector('#pfGustos').addEventListener('input', (e) => { gustos = e.target.value; guardarLocal(claveGustos(nino.id), gustos.trim() || undefined); pintar(); });
      el.querySelector('[data-copiar]').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText($t.textContent); }
        catch {
          const r = document.createRange(); r.selectNodeContents($t);
          getSelection().removeAllRanges(); getSelection().addRange(r);
          aviso('Tu navegador no dejó copiar solo: el texto quedó seleccionado, cópialo tú.', { emoji: '✂️', ms: 5000 });
          return;
        }
        aviso('Perfil copiado. Pégalo en claude.ai con las fotos de la tarea.', { emoji: '📋', ms: 5000 });
      });
    },
  });
}
