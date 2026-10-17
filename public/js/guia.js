// =============================================================================
// guia.js — "📖 Cómo usar Learnground": la guía para papás (botón en Papás).
// Cada función de la app explicada corto y en positivo, y cómo trabaja el equipo.
// Si cambia cómo funciona algo (racha, pagos, avisos…), actualizar aquí también.
// =============================================================================

import { abrirHoja } from './ui.js';
import { RACHA } from './config.js';

const SECCIONES = [
  ['👋', 'Cómo trabajamos', `
    <ol>
      <li><b>Nos cuentas qué están viendo en el colegio</b> con «📚 Pedir una lección» (aquí en Papás) o por el chat. Las fotos del cuaderno o de la guía nos ayudan mucho.</li>
      <li><b>El equipo arma una lección hecha para tu hijo o hija:</b> con sus temas, a su nivel y con sus gustos.</li>
      <li><b>Te llega un aviso 🎁</b> y la lección aparece en su Inicio.</li>
      <li><b>Juega, aprende y presenta la ficha.</b> Aquí en Papás ves cómo va y qué hacer para ayudarle.</li>
    </ol>`],
  ['📚', 'Las lecciones', `
    <p>Cada lección tiene 5 pestañas:</p>
    <ul>
      <li><b>📝 Aprender:</b> la explicación corta de cada tema, con ejemplos, trucos 💡 y botones 🔊 que leen en voz alta.</li>
      <li><b>🔊 Palabras</b> (o <b>📖 Libro</b>): el vocabulario del tema.</li>
      <li><b>🎮 Juegos:</b> juegos para practicar, el jefe final y un simulacro del examen.</li>
      <li><b>✏️ Ficha:</b> 10 ejercicios con nota de 1 a 100. Las respuestas se ven al final.</li>
      <li><b>💡 Tips:</b> son para ti: un plan de 40 minutos, errores comunes y preguntas para hacerle.</li>
    </ul>
    <p>Abran juntos la primera vez cada lección; después, que juegue por su cuenta.</p>`],
  ['🎮', 'Juegos, estrellas y dificultad', `
    <ul>
      <li>Cada juego da de 1 a 3 estrellas ⭐.</li>
      <li><b>😊 Normal</b> es para aprender: con pistas y sin perder vidas. <b>🔥 Difícil</b> es el reto: con tiempo y 3 corazones.</li>
      <li>Cuando saque 3 estrellas en normal, rétenlo a probar el difícil.</li>
      <li>Lulo, el delfín 🐬, lo acompaña y siempre le habla en positivo.</li>
    </ul>`],
  ['🔥', 'La racha', `
    <p>Cada día que estudia suma a su racha. Un día cuenta con <b>${RACHA.minutosDia} minutos</b> de estudio o un juego terminado.</p>
    <p>Meta sugerida: 15 minutos al día, 4 días a la semana. Mejor poquito y seguido que mucho de una vez.</p>
    <p>Si no ha estudiado, a las 6 p. m. le llega un recordatorio al celular (si activaste los avisos).</p>`],
  ['🏅', 'Logros', `
    <p>En <b>🏅 Logros</b> ve sus medallas, su récord de racha y sus estrellas por lección. Celebren juntos cada medalla nueva.</p>`],
  ['👨‍👩‍👧', 'Esta pantalla (Papás)', `
    <ul>
      <li><b>💡 Qué hacer esta semana:</b> consejos según cómo le va, con su próximo reto y preguntas para hacerle.</li>
      <li><b>📈 Notas de las fichas</b> (de 1 a 100) y <b>⏱️ tiempo de estudio</b> de los últimos 7 días.</li>
      <li><b>🎯 Por tema:</b> cómo le va en cada tema de las últimas fichas.</li>
      <li><b>📚 Lecciones:</b> toca una para ver el detalle.</li>
    </ul>`],
  ['💬', 'Hablar con el equipo', `
    <ul>
      <li><b>💬 Chat:</b> le llega a todo el equipo y te respondemos ahí mismo.</li>
      <li><b>📚 Pedir una lección:</b> cuéntanos los temas, para cuándo la necesitan y adjunta fotos. Aquí mismo ves cómo va tu pedido.</li>
      <li><b>📬 Avisos del equipo:</b> novedades y recordatorios para las familias.</li>
    </ul>`],
  ['🔔', 'Avisos en el celular', `
    <p>Activa los avisos para enterarte de las lecciones nuevas, las respuestas del equipo y la racha.</p>
    <ul>
      <li><b>Android:</b> funcionan en Chrome y en los demás navegadores.</li>
      <li><b>iPhone o iPad:</b> primero instala Learnground (Compartir → «Agregar a inicio») y ábrela desde el ícono. Necesita iOS 16.4 o más nuevo.</li>
    </ul>
    <p>Si tu hijo o hija estudia en otro celular, actívalos también ahí.</p>`],
  ['👧', 'Varios hijos', `
    <p>Cada niño tiene su perfil, con su animal, su color, sus lecciones y su racha. Para cambiar de niño, toca <b>Cambiar</b> en el menú. Para agregar otro hijo o hija, en los perfiles toca <b>«Agregar otro»</b>.</p>`],
  ['💳', 'Mensualidad', `
    <ul>
      <li>Es <b>por niño</b>, según su grado.</li>
      <li>Arriba ves hasta qué día tienes acceso. Te avisamos 3 días antes, 1 día antes y el último día.</li>
      <li>Para pagar, toca <b>Cómo pagar</b>: ahí están la llave y los pasos. Después, el equipo registra tu pago.</li>
      <li>Si el acceso vence, <b>no se borra nada</b>: las lecciones y el progreso vuelven en cuanto registremos el pago.</li>
    </ul>`],
  ['🎨', 'Apariencia', `
    <p>En <b>🎨 Apariencia</b> puedes bajar el brillo o usar el modo oscuro si la pantalla cansa la vista.</p>`],
  ['🔒', 'Privacidad', `
    <p>Las lecciones y el progreso de tu hijo o hija son privados: solo los ven tu familia y el equipo de Learnground.</p>`],
];

/** Abre la guía. La primera sección viene abierta; las demás se abren al tocarlas. */
export function abrirGuia() {
  abrirHoja({
    titulo: '📖 Cómo usar Learnground',
    ancha: true,
    cuerpo: `<p class="suave">Todo lo que puedes hacer en la app, explicado corto. Toca un tema para abrirlo.</p>
      <div class="guia">${SECCIONES.map(([e, t, html], i) => `<details${i === 0 ? ' open' : ''}><summary><span aria-hidden="true">${e}</span> ${t}</summary><div>${html}</div></details>`).join('')}</div>
      <p class="suave peq" style="margin-top:12px">¿Te quedó alguna duda? Escríbenos por el chat: le llega a todo el equipo.</p>`,
  });
}
