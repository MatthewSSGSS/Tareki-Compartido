// =============================================================================
// leccion.js — Visor de una lección (#/leccion/<id>).
//
// • Si la abre el niño dueño: guarda su progreso, cuenta minutos y logros para
//   la racha, y celebra cuando la racha sube.
// • Si la abre el equipo, o un papá desde otro perfil: es solo vista previa
//   (no cambia el progreso ni la racha del niño).
// =============================================================================

import * as datos from '../datos.js';
import { montarLeccion, esClaveDeLogro } from '../puente.js';
import { analizarLeccion } from '../analisis.js';
import { calcularRacha } from '../racha.js';
import { materia } from '../carga.js';
import { esc, plural } from '../util.js';
import { aviso, confeti, barra, estrellas, lulo } from '../ui.js';

const SEG_INACTIVO = 20 * 60; // sin guardar nada en 20 min se deja de contar tiempo

export async function render(root, ctx) {
  const id = ctx.params[0];
  const l = await datos.leccion(id);
  const nino = await datos.nino(l.ninoId);
  // Si la familia la puede abrir, es de uno de sus hijos: se entra como ese niño
  if (ctx.usuario.rol === 'familia' && ctx.perfil?.id !== l.ninoId) ctx.elegirPerfil(l.ninoId);
  const propia = ctx.usuario.rol === 'familia';
  const m = materia(l.materia);
  const volver = ctx.usuario.rol === 'equipo' ? `#/papas/${l.ninoId}` : propia ? '#/inicio' : '#/papas';

  root.innerHTML = `
    <div class="visor">
      <header class="visor-barra">
        <a class="btn btn-blanco" href="${volver}" data-volver>← Salir</a>
        <span class="titulo"><strong>${m.emoji} ${esc(l.titulo)}</strong><small>${propia ? `Para ${esc(nino.nombre)}` : `Vista previa · lección de ${esc(nino.nombre)} (no cambia su progreso)`}</small></span>
        <span class="guardado" id="guardado" aria-live="polite"></span>
      </header>
      <div class="visor-cuerpo">
        <div class="cargando" id="cargando"><div><img class="lulo-buho" src="img/lulo-256.png" alt="" aria-hidden="true"><p><b>Abriendo tu lección…</b></p></div></div>
        <iframe id="marco" title="${esc(l.titulo)}" hidden></iframe>
        <aside class="visor-lado" id="lado"></aside>
      </div>
    </div>`;

  const $guardado = root.querySelector('#guardado');
  const $marco = root.querySelector('#marco');
  const $lado = root.querySelector('#lado');

  const [html, est, actividad] = await Promise.all([datos.htmlLeccion(id), datos.estado(id), propia ? datos.actividad(l.ninoId) : []]);
  let datosActuales = { ...est.datos };
  let meta = est.meta;
  let racha = calcularRacha(actividad);
  let pendiente = null;
  let ultimaSenal = Date.now();
  let segundos = 0;
  let timerGuardar = null;

  function pintarLado() {
    const a = analizarLeccion(l, { ...est, datos: datosActuales, meta });
    $lado.innerHTML = `
      ${propia ? `<div class="card racha ${racha.actual ? '' : 'fria'}" style="padding:14px"><div class="fila" style="justify-content:center;gap:12px">
        <span class="fuego" style="font-size:44px">${racha.actual ? '🔥' : '🪵'}</span><span style="text-align:left"><span class="numero" style="font-size:2.2em">${racha.actual}</span><br><span class="que">${racha.actual === 1 ? 'día seguido' : 'días seguidos'}</span></span></div>
        <p>${racha.hoyListo ? '¡Hoy ya cumpliste! 🎉' : 'Termina un juego para sumar hoy'}</p></div>` : ''}
      <div class="card pila chica"><h2 style="margin:0">Tu progreso</h2>${barra(a.progreso, 'verde')}<span class="suave peq">${a.progreso}% de la lección</span>
        ${a.fichaMejor ? `<span>📝 Mejor ficha: <b>${a.fichaMejor}</b>/100</span>` : ''}
        ${a.simulacro ? `<span>📘 Simulacro: <b>${a.simulacro}</b>/100</span>` : ''}
        ${a.tieneJefe ? `<span>⚔️ Jefe final: ${a.jefe ? estrellas(a.jefe) : 'sin vencer'}</span>` : ''}</div>
      ${a.juegos.length ? `<div class="card"><h2>🎮 Juegos <small>${a.jugados} de ${a.juegos.length}</small></h2><div class="mini-juegos">${a.juegos.map((j) => `<div><span>${esc(j.emoji || '🎮')} ${esc(j.nombre)}</span>${estrellas(j.estrellas)}</div>`).join('')}</div></div>` : ''}
      ${lulo(a.jugados < a.juegos.length ? `¡Te faltan ${plural(a.juegos.length - a.jugados, 'juego', 'juegos')}! Cada uno da hasta 3 estrellas ⭐` : '¡Ya jugaste todos! Prueba el modo difícil 🔥')}`;
  }

  function marcarGuardado(texto, ok = false) { $guardado.textContent = texto; $guardado.classList.toggle('ok', ok); }

  async function guardarAhora() {
    if (!pendiente) return;
    const d = pendiente; pendiente = null;
    try { await datos.guardarDatos(id, d); marcarGuardado('✓ Guardado', true); }
    catch { pendiente = pendiente || d; marcarGuardado('⚠️ Sin guardar'); }
  }

  async function alCambiar(nuevos) {
    ultimaSenal = Date.now();
    let logros = 0;
    for (const [k, v] of Object.entries(nuevos)) if (esClaveDeLogro(k) && datosActuales[k] !== v) logros++;
    datosActuales = nuevos;
    pintarLado();
    if (!propia) return;
    pendiente = nuevos;
    marcarGuardado('Guardando…');
    clearTimeout(timerGuardar);
    timerGuardar = setTimeout(guardarAhora, 700);
    if (logros) await sumar({ logros: 1 });
  }

  /** Suma actividad y celebra si con esto se enciende la racha de hoy. */
  async function sumar(cambio) {
    const antes = racha;
    await datos.sumarActividad(l.ninoId, cambio);
    racha = calcularRacha(await datos.actividad(l.ninoId));
    pintarLado();
    if (!antes.hoyListo && racha.hoyListo) {
      confeti();
      aviso(racha.actual > 1 ? `¡Racha de ${racha.actual} días! ¡Sigue así!` : '¡Empezaste una racha! Vuelve mañana para seguirla.', { emoji: '🔥', ms: 5000 });
    }
  }

  // Minutos de estudio: solo con la pantalla visible y si hubo actividad reciente
  const reloj = setInterval(() => {
    if (!propia || document.visibilityState !== 'visible') return;
    if ((Date.now() - ultimaSenal) / 1000 > SEG_INACTIVO) return;
    segundos += 15;
    if (segundos >= 60) { segundos -= 60; sumar({ minutos: 1 }); }
  }, 15000);

  const desconectar = montarLeccion($marco, {
    html,
    datos: est.datos,
    nombre: nino.nombre,
    nino: { avatar: nino.avatar, color: nino.color },
    alCambiar,
    alMeta: (mt) => { meta = mt; pintarLado(); datos.guardarMeta(id, mt).catch(() => {}); },
  });
  $marco.addEventListener('load', () => { root.querySelector('#cargando')?.remove(); $marco.hidden = false; }, { once: true });
  if (propia) datos.marcarAbierta(id).catch(() => {});
  pintarLado();

  const alOcultar = () => { if (document.visibilityState === 'hidden') guardarAhora(); };
  document.addEventListener('visibilitychange', alOcultar);
  window.addEventListener('pagehide', guardarAhora);

  return () => {
    clearInterval(reloj);
    clearTimeout(timerGuardar);
    guardarAhora();
    desconectar();
    document.removeEventListener('visibilitychange', alOcultar);
    window.removeEventListener('pagehide', guardarAhora);
  };
}
