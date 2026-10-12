// =============================================================================
// puente.js — Abre una lección HTML dentro de la app sin cambiarle nada.
//
// La lección corre en un <iframe sandbox> aislado: no puede tocar la sesión ni
// los datos de la app. Como ahí no hay localStorage, se le pone uno "de mentiras"
// antes de que arranque:
//   • Empieza lleno con lo que la lección había guardado (viene de la cuenta).
//   • Cada vez que la lección guarda algo, avisa a la app con postMessage y la
//     app lo sube a la cuenta del niño.
// Al final se agrega un script que lee los nombres de juegos, temas y tips de la
// lección (variables GAMES, FTOP, TIPS…) para el reporte de los papás.
// =============================================================================

/** Convierte un objeto a JSON seguro para meterlo dentro de <script>. */
const jsonSeguro = (x) => JSON.stringify(x).replace(/</g, '\\u003c');

function scriptAlmacen(datos, nombre) {
  return `<script>(function(){
  var d = ${jsonSeguro(datos || {})};
  var nombre = ${jsonSeguro(nombre || '')};
  var has = function(k){ return Object.prototype.hasOwnProperty.call(d, k); };
  var aviso = function(){ try { parent.postMessage({ tareki: "datos", datos: d }, "*"); } catch (e) {} };
  var almacen = {
    getItem: function(k){
      k = String(k);
      if (has(k)) return d[k];
      // La lección pregunta el nombre del niño ("ld6-name"…): se lo damos sin preguntar.
      if (nombre && /(^|[-_])(name|nombre)$/i.test(k)) return nombre;
      return null;
    },
    setItem: function(k, v){ k = String(k); v = String(v); if (d[k] === v) return; d[k] = v; aviso(); },
    removeItem: function(k){ k = String(k); if (!has(k)) return; delete d[k]; aviso(); },
    clear: function(){ d = {}; aviso(); },
    key: function(i){ return Object.keys(d)[i] || null; },
    get length(){ return Object.keys(d).length; }
  };
  try { Object.defineProperty(window, "localStorage", { value: almacen, configurable: true }); } catch (e) {}
  try { Object.defineProperty(window, "sessionStorage", { value: almacen, configurable: true }); } catch (e) {}
})();<\/script>`;
}

const SCRIPT_META = `<script>(function(){
  function g(f){ try { return f(); } catch (e) { return undefined; } }
  function limpio(x){ try { return JSON.parse(JSON.stringify(x)); } catch (e) { return undefined; } }
  var h1 = document.querySelector("h1");
  var meta = {
    titulo: (h1 && h1.textContent.trim()) || document.title,
    clave: g(function(){ return KEY; }),
    temas: limpio(g(function(){ return FTOP; })),
    juegos: g(function(){ return GAMES.map(function(x){ return { id: x.id, nombre: x.name, emoji: x.emoji, f: x.f }; }); }),
    tips: limpio(g(function(){ return TIPS; })),
    jefe: g(function(){ return typeof bossGame === "function"; }) || false,
    simulacro: g(function(){ return typeof examFinal === "function"; }) || false,
    ficha: g(function(){ return typeof fichaMission === "function"; }) || false
  };
  try { parent.postMessage({ tareki: "meta", meta: meta }, "*"); } catch (e) {}
})();<\/script>`;

/** Arma el HTML final: almacén al principio, lector de datos al final. */
export function prepararHtml(html, datos, nombre = '') {
  const almacen = scriptAlmacen(datos, nombre);
  let out = /<head(\s[^>]*)?>/i.test(html) ? html.replace(/<head(\s[^>]*)?>/i, (m) => m + almacen) : almacen + html;
  const fin = out.toLowerCase().lastIndexOf('</body>');
  out = fin >= 0 ? out.slice(0, fin) + SCRIPT_META + out.slice(fin) : out + SCRIPT_META;
  return out;
}

/** Claves que guardan logros (progreso o historial), no ajustes como el sonido. */
export const esClaveDeLogro = (k) => /progress|progreso|hist/i.test(k);

/**
 * Monta la lección en un iframe.
 * @param {HTMLIFrameElement} iframe
 * @param {{html:string, datos:object, nombre?:string, alCambiar:(datos:object)=>void, alMeta:(meta:object)=>void}} o
 * @returns {() => void} función para desconectar
 */
export function montarLeccion(iframe, { html, datos, nombre, alCambiar, alMeta }) {
  // Sin allow-same-origin: la lección queda en un origen aparte y no puede leer la app.
  iframe.setAttribute('sandbox', 'allow-scripts allow-modals allow-popups allow-downloads');
  iframe.setAttribute('allow', 'autoplay; fullscreen');
  const escuchar = (e) => {
    if (e.source !== iframe.contentWindow || !e.data || typeof e.data !== 'object') return;
    if (e.data.tareki === 'datos' && e.data.datos && typeof e.data.datos === 'object') {
      const limpio = {};
      for (const [k, v] of Object.entries(e.data.datos)) if (typeof v === 'string' && k.length < 200 && v.length < 200000) limpio[k] = v;
      alCambiar(limpio);
    }
    if (e.data.tareki === 'meta' && e.data.meta && typeof e.data.meta === 'object') alMeta(e.data.meta);
  };
  window.addEventListener('message', escuchar);
  iframe.srcdoc = prepararHtml(html, datos, nombre);
  return () => window.removeEventListener('message', escuchar);
}

/** Busca el nombre de la lección dentro del HTML (para sugerir el título al subirla). */
export function tituloDeHtml(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const limpiar = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return limpiar(h1) || limpiar(t).split('·')[0].trim();
}
