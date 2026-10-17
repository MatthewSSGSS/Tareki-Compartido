// =============================================================================
// demo.js — Datos de prueba para ver la app sin Supabase.
// Las fechas se arman a partir de hoy para que la racha y las gráficas se vean vivas.
// La lección de muestra está en demo/muestra.html (no tiene datos de niños reales): trae
// todo lo de una lección real, con los juegos grandes del motor, para que la versión de
// prueba muestre lo que ofrecemos.
// =============================================================================

import { hoy, sumarDias } from './util.js';

const ARCHIVO_MUESTRA = 'demo/muestra.html';

// "Foto" del cuaderno para el pedido de muestra (un dibujo, no una foto real)
const FOTO_MUESTRA = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <rect width="600" height="800" fill="#fffdf4"/><line x1="70" y1="0" x2="70" y2="800" stroke="#ff9dbd" stroke-width="3"/>
  ${Array.from({ length: 22 }, (_, i) => `<line x1="0" x2="600" y1="${90 + i * 32}" y2="${90 + i * 32}" stroke="#bcd7f5" stroke-width="2"/>`).join('')}
  <g font-family="Comic Sans MS, cursive" fill="#2a3a8c"><text x="90" y="80" font-size="34">Tema: multiplicación</text>
  <text x="90" y="178" font-size="28">• Por 2 cifras: 24 × 13</text><text x="90" y="242" font-size="28">• Problemas con dinero</text>
  <text x="90" y="306" font-size="28">• Tablas del 6, 7 y 8</text><text x="90" y="402" font-size="26" fill="#d0405a">Evaluación: viernes</text></g></svg>`)}`;

// Lo mismo que la lección de muestra le cuenta a la app al abrirse (FTOP, GAMES y TIPS).
const META_MUESTRA = {
  titulo: 'Las fracciones',
  clave: 'fracciones-muestra',
  temas: {
    con: { n: '¿Qué es una fracción?', e: '🍕', game: 'pizza', q: 'Si parto una pizza en 8 pedazos y me como 3, ¿qué fracción me comí?' },
    equ: { n: 'Fracciones equivalentes', e: '⚖️', game: 'bloques', q: '¿Por qué 1/2 y 2/4 son la misma cantidad?' },
    com: { n: 'Comparar fracciones', e: '🔍', game: 'mayor', q: '¿Qué es más: 1/3 o 1/4 de un chocolate? ¿Por qué?' },
  },
  juegos: [
    { id: 'nave', nombre: 'La nave', emoji: '🚀', f: 'naveS', hab: 'atencion' },
    { id: 'plataformas', nombre: 'Plataformas', emoji: '🍄', f: 'platS', hab: 'coordinacion' },
    { id: 'bloques', nombre: 'Bloques', emoji: '🧱', f: 'bloquesS', hab: 'logica' },
    { id: 'culebrita', nombre: 'Culebrita', emoji: '🐍', f: 'culebraS', hab: 'atencion' },
    { id: 'ladrillos', nombre: 'Rompe-ladrillos', emoji: '💥', f: 'ladrillosS', hab: 'coordinacion' },
    { id: 'pizza', nombre: 'Pizza veloz', emoji: '🍕', f: 'pizzaS', hab: 'rapidez' },
    { id: 'mayor', nombre: '¿Cuál es mayor?', emoji: '🔍', f: 'mayorS', hab: 'logica' },
  ],
  tips: {
    consejos: [
      'Usen comida de verdad: una arepa partida en pedazos iguales explica más que cualquier dibujo.',
      'Pídanle que lo diga en voz alta: «partí en 8, tomé 3: tres octavos».',
      'Celebren el esfuerzo, no solo la nota: «se nota que practicaste».',
    ],
    errores: [
      'Creer que 1/4 es más que 1/3 porque 4 es mayor que 3. Entre más partes, más pequeño cada pedazo.',
      'Partir en pedazos de distinto tamaño: en una fracción todos los pedazos son iguales.',
      'Voltear la fracción (escribir 8/3 en vez de 3/8).',
    ],
    preguntas: [
      '¿Qué significa el número de abajo de una fracción?',
      'Dibuja 2/4 y 1/2. ¿Qué notas?',
      '¿Qué es más: 1/3 o 1/4 de un chocolate? ¿Por qué?',
    ],
    casa: 'A la hora del postre, que {nombre} reparta en partes iguales y diga qué fracción le tocó a cada uno.',
  },
  jefe: true,
  ficha: true,
};

/** Registro de partidas de ejemplo (el que llenan los juegos con su habilidad). */
function registroMuestra(d) {
  const P = (dia, j, h, ok, n, err, seg, fin = 'termino', m = 'n') => ({ j, h, m, ok, n, err, seg, fin, d: d(dia) });
  return [
    P(8, 'pizza', 'rapidez', 4, 6, 2, 95), P(8, 'nave', 'atencion', 14, 18, 3, 140), P(5, 'mayor', 'logica', 4, 6, 2, 80),
    P(5, 'plataformas', 'coordinacion', 5, 6, 1, 160), P(4, 'bloques', 'logica', 6, 8, 2, 210), P(3, 'pizza', 'rapidez', 6, 6, 0, 70),
    P(2, 'boss', 'logica', 9, 11, 2, 240), P(2, 'nave', 'atencion', 19, 20, 1, 150), P(1, 'pizza', 'rapidez', 6, 8, 2, 90, 'termino', 'd'),
    P(1, 'culebrita', 'atencion', 3, 5, 2, 60, 'salio'),
  ];
}

export function semilla() {
  const h = hoy();
  const d = (n) => sumarDias(h, -n);
  const ts = (n, hora = 17) => `${d(n)}T${String(hora).padStart(2, '0')}:20:00`;

  return {
    version: 13,
    usuarios: [
      { id: 'u-equipo', correo: 'equipo@tareki.demo', clave: 'tareki', rol: 'equipo', dueno: true, nombre: 'Mateo', creado: ts(30) },
      { id: 'u-familia', correo: 'familia@tareki.demo', clave: 'tareki', rol: 'familia', nombre: 'Laura Pérez', creado: ts(20), accesoHasta: sumarDias(h, 2), suspendido: false, ultimoIngreso: ts(1), celular: '573001234567' },
    ],
    ninos: [
      { id: 'n-sofia', familiaId: 'u-familia', nombre: 'Sofía', avatar: '🦊', color: '#ff9a4d', grado: '4', gustos: 'los gatos, dibujar y el fútbol', creado: ts(20) },
      { id: 'n-tomas', familiaId: 'u-familia', nombre: 'Tomás', avatar: '🐯', color: '#59c3ff', grado: '4', creado: ts(20) },
    ],
    lecciones: [
      { id: 'l-sofia-1', ninoId: 'n-sofia', titulo: 'Las fracciones', materia: 'mate', archivo: ARCHIVO_MUESTRA, subidaPor: 'u-equipo', creada: ts(9, 9) },
      { id: 'l-sofia-2', ninoId: 'n-sofia', titulo: 'Repaso de fracciones', materia: 'mate', archivo: ARCHIVO_MUESTRA, subidaPor: 'u-equipo', creada: ts(0, 8) },
      { id: 'l-tomas-1', ninoId: 'n-tomas', titulo: 'Las fracciones', materia: 'mate', archivo: ARCHIVO_MUESTRA, subidaPor: 'u-equipo', creada: ts(1, 9) },
    ],
    estados: {
      'l-sofia-1': {
        abierta: ts(8),
        actualizado: ts(1),
        meta: META_MUESTRA,
        datos: {
          'ld-progress': JSON.stringify({ 'fracciones-muestra': { naveS: 3, platS: 2, bloquesS: 2, pizzaS: 3, pizzaS_h: 2, mayorS: 2, bossS: 2, ficha100: 83 } }),
          'ld-fracciones-muestra-registro': JSON.stringify(registroMuestra(d)),
          'ld-ficha-hist': JSON.stringify([
            { d: d(8), n: 50, s: 420, t: { con: [2, 2], equ: [0, 2], com: [1, 2] }, h: 0 },
            { d: d(5), n: 67, s: 360, t: { con: [2, 2], equ: [1, 2], com: [1, 2] }, h: 0 },
            { d: d(1), n: 83, s: 300, t: { con: [2, 2], equ: [2, 2], com: [1, 2] }, h: 0 },
          ]),
        },
      },
    },
    actividad: [
      ...[[9, 22, 2], [8, 31, 3], [5, 18, 2], [4, 12, 1], [3, 20, 2], [2, 9, 1], [1, 26, 3]]
        .map(([n, minutos, logros]) => ({ ninoId: 'n-sofia', dia: d(n), minutos, logros })),
      { ninoId: 'n-tomas', dia: d(6), minutos: 3, logros: 0 },
    ],
    invitaciones: [
      { codigo: 'TAREKI-P3RZQ7', rol: 'familia', nota: 'Familia Pérez', creadaPor: 'u-equipo', creada: ts(21), expira: d(-14), usadaPor: 'u-familia', usada: ts(20) },
      { codigo: 'LEARN-DEMO', rol: 'familia', nota: 'Familia de prueba', creadaPor: 'u-equipo', creada: ts(0), expira: sumarDias(h, 7), usadaPor: null, usada: null },
    ],
    historial: [
      { id: 'h1', familiaId: 'u-familia', accion: 'registro', hasta: d(-10), nota: 'Código TAREKI-P3RZQ7', por: '', creado: ts(20) },
      { id: 'h2', familiaId: 'u-familia', accion: 'pago', meses: 1, monto: 60000, metodo: 'Llave Bre-B', nota: '', hasta: sumarDias(h, 2), por: 'u-equipo', creado: ts(3) },
    ],
    cobro: { precio: 0, precioPrimaria: 80000, precioBachillerato: 120000, llave: '@ejemplo', banco: 'Davivienda', titular: 'Learnground (ejemplo)', whatsapp: '', nota: 'Envía el comprobante por WhatsApp.' },
    mensajes: [
      { id: 'm1', titulo: '🎉 ¡Bienvenidos a Learnground!', cuerpo: 'Desde hoy las lecciones llegan aquí. Si tienen dudas, escríbannos por WhatsApp.', url: '#/inicio', destino: 'todas', familias: [], programado: ts(5, 9), enviado: ts(5, 9), creadoPor: 'u-equipo', creado: ts(5, 9) },
      { id: 'm2', titulo: '📚 Semana de evaluaciones', cuerpo: 'Esta semana hay quices en el colegio: practiquen 15 minutos al día con las fichas.', url: '#/inicio', destino: 'todas', familias: [], programado: `${sumarDias(h, 2)}T07:00:00`, enviado: null, creadoPor: 'u-equipo', creado: ts(0, 8) },
    ],
    chat: [
      { id: 'c1', familiaId: 'u-familia', autor: 'u-familia', deEquipo: false, texto: 'Hola, ¿la lección de fracciones también sirve para el quiz del viernes?', leido: true, creado: ts(2, 19) },
      { id: 'c2', familiaId: 'u-familia', autor: 'u-equipo', deEquipo: true, texto: '¡Hola Laura! Sí, cubre los mismos temas. Que Sofía haga la ficha dos veces antes del viernes 🐬', leido: true, creado: ts(2, 20) },
      { id: 'c3p', familiaId: 'u-familia', autor: 'u-familia', deEquipo: false, texto: '📚 Pedido de lección para Tomás\n🔢 Matemáticas · para esta semana\n📝 Multiplicación por 2 cifras y problemas con dinero. En el colegio le están costando las tablas del 6, 7 y 8.\n📷 1 foto', leido: false, creado: ts(0, 8), pedidoId: 'p1' },
      { id: 'c3', familiaId: 'u-familia', autor: 'u-familia', deEquipo: false, texto: 'Perfecto, gracias. Ya pagué la mensualidad, les mando el comprobante por WhatsApp.', leido: false, creado: ts(0, 9) },
    ],
    pedidos: [
      { id: 'p1', familiaId: 'u-familia', ninoId: 'n-tomas', materia: 'mate', temas: 'Multiplicación por 2 cifras y problemas con dinero. En el colegio le están costando las tablas del 6, 7 y 8.', para: sumarDias(h, 4), fotos: [FOTO_MUESTRA], estado: 'nuevo', atendidoPor: null, creado: ts(0, 8), actualizado: ts(0, 8) },
    ],
    chatEquipo: [
      { id: 'ce1', autor: 'u-equipo', texto: '¡Hola equipo! Desde hoy usamos este chat para coordinarnos 👥', creado: ts(1, 10) },
    ],
    sesion: null,
  };
}
