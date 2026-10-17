/* =============================================================================
   motor-v1.js — Juegos grandes de Learnground (versión 1).

   La app lo mete en cada lección al abrirla (puente.js), junto con
   window.LG_NINO = { nombre, avatar, color }. La lección solo manda los datos:

     LG.jugar("nave", host, datos, opciones)

   Juegos: "nave" (shoot 'em up).
   Reglas de todos los juegos:
   • Siempre en positivo: nada de "Incorrecto" ni "Perdiste".
   • Normal: sin vidas y a buen ritmo. Difícil: más rápido y 3 corazones.
   • Cada partida se anota en opciones.registro con el mismo formato de la skill:
     { j, h, m, ok, n, err, seg, fin: "termino" | "perdio" | "salio", d }.
   No se cambia el comportamiento de una versión publicada: los cambios grandes
   van en motor-v2.js para no dañar lecciones viejas.
   ============================================================================= */
(function () {
  "use strict";
  if (window.LG && window.LG.version >= 1) return;

  // ---------- Utilidades ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const elegir = (a) => a[(Math.random() * a.length) | 0];
  const azar = (a, b) => a + Math.random() * (b - a);
  const mezclar = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const sacar = (x) => (typeof x === "function" ? x() : Array.isArray(x) ? elegir(x) : x);
  const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const leerJSON = (k, d) => { try { const v = JSON.parse(leer(k)); return v ?? d; } catch (e) { return d; } };
  const hoyLocal = () => new Date().toLocaleDateString("en-CA");
  const conTeclado = () => { try { return matchMedia("(pointer: fine)").matches; } catch (e) { return false; } };
  const quieto = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  const FUENTE = '"Baloo 2","Trebuchet MS",system-ui,sans-serif';
  const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  // ---------- Sonido y voz (sin archivos; respeta el 🔇 de la lección) ----------
  let actx = null;
  const enSilencio = () => leer("ld-muted") === "1";
  function tono(frecs, dur = 0.12, tipo = "sine", paso = 0.08, vol = 0.14) {
    if (enSilencio()) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const t0 = actx.currentTime;
      frecs.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain(), t = t0 + i * paso;
        o.type = tipo; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
      });
    } catch (e) {}
  }
  const SON = {
    disparo: () => tono([900], 0.04, "square", 0, 0.025),
    bien: () => tono([660, 990], 0.13, "triangle"),
    mal: () => tono([260, 190], 0.18, "sawtooth", 0.11, 0.05),
    golpe: () => tono([900, 300], 0.12, "square", 0.05, 0.09),
    cuenta: () => tono([520], 0.1),
    ya: () => tono([880], 0.18),
    gana: () => tono([523, 659, 784, 1046, 1318], 0.2, "triangle", 0.1),
  };
  function hablar(t) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(t)); u.lang = "es-CO"; u.rate = 0.95;
      const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith("es"));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---------- Estilos (una sola vez por página) ----------
  function estilos() {
    if (document.getElementById("lg-estilos")) return;
    const s = document.createElement("style");
    s.id = "lg-estilos";
    s.textContent = `
.lg-juego{position:relative;border:3px solid #1f2544;border-radius:24px;overflow:hidden;background:#14123a;color:#fff;box-shadow:5px 5px 0 #1f2544;
  font-family:var(--f-body,"Nunito","Trebuchet MS",system-ui,sans-serif);font-weight:700;line-height:1.35;user-select:none;-webkit-user-select:none;scroll-margin-top:92px}
.lg-juego *{box-sizing:border-box}
.lg-hud{display:flex;align-items:center;gap:8px;padding:10px 12px 6px}
.lg-hud strong{flex:1;min-width:0;font-family:var(--f-head,${FUENTE});font-weight:800;font-size:1em;line-height:1.05;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lg-b{background:#fff;color:#1f2544;border:3px solid #1f2544;border-radius:14px;width:38px;height:38px;font-size:17px;cursor:pointer;flex:none;padding:0}
.lg-pts{background:#ffcf3f;color:#1f2544;border:2px solid #1f2544;border-radius:999px;padding:2px 10px;font-weight:800;flex:none;font-size:.9em}
.lg-vidas{flex:none;font-size:15px;letter-spacing:1px}
.lg-vidas .off{filter:grayscale(1);opacity:.3}
.lg-consigna{display:flex;align-items:center;gap:8px;margin:0 12px;background:#fff;color:#1f2544;border:3px solid #1f2544;border-radius:16px;padding:6px 10px;
  font-family:var(--f-head,${FUENTE});font-weight:800;font-size:1.02em;line-height:1.15;min-height:calc(2.3em + 18px)}
.lg-consigna span{flex:1;min-width:0;overflow-wrap:anywhere}
.lg-consigna.lg-pop{animation:lg-pop .35s}
.lg-oir{flex:none;background:#d6f0ff;color:#1f2544;border:2px solid #1f2544;border-radius:12px;padding:2px 8px;cursor:pointer;font-size:.9em}
.lg-fila2{display:flex;align-items:center;gap:8px;margin:8px 12px 0}
.lg-barra{flex:1;height:10px;border:2px solid #fff;border-radius:99px;background:rgba(255,255,255,.15);overflow:hidden}
.lg-barra i{display:block;height:100%;width:0;background:#35b862;transition:width .4s}
.lg-zona{position:relative;margin-top:8px}
.lg-zona canvas{display:block;width:100%;touch-action:none;cursor:crosshair}
.lg-capa{position:absolute;inset:0;display:flex;padding:12px;text-align:center;background:rgba(15,12,40,.72);overflow:auto}
.lg-capa>*{margin:auto}
.lg-capa[hidden]{display:none}
.lg-tarjeta{background:#fff;color:#1f2544;border:3px solid #1f2544;border-radius:22px;box-shadow:5px 5px 0 #1f2544;padding:14px 16px;max-width:340px;width:100%;animation:lg-pop .35s}
.lg-tarjeta h3{font-family:var(--f-head,${FUENTE});font-weight:800;font-size:1.45em;margin:4px 0;line-height:1.1}
.lg-tarjeta p{margin:6px 0;font-size:.95em}
.lg-grande{font-size:52px;line-height:1.1}
.lg-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-top:10px;font-family:var(--f-head,${FUENTE});font-weight:800;font-size:1.12em;
  background:#ff6b9a;color:#fff;border:3px solid #1f2544;border-radius:999px;padding:9px 16px;box-shadow:4px 4px 0 #1f2544;cursor:pointer}
.lg-btn:active{transform:translate(3px,3px);box-shadow:1px 1px 0 #1f2544}
.lg-btn.lg-claro{background:#fff;color:#1f2544}
.lg-btn.lg-rojo{background:#e8452c}
.lg-link{background:none;border:0;color:#4a5075;text-decoration:underline;cursor:pointer;margin-top:8px;font:inherit;font-size:.9em}
.lg-insignia{display:inline-block;background:#35b862;color:#fff;border:2px solid #1f2544;border-radius:999px;padding:1px 12px;font-weight:800;font-size:.85em}
.lg-insignia.h{background:#e8452c}
.lg-cuenta{font-family:var(--f-head,${FUENTE});font-weight:800;font-size:110px;line-height:1;color:#ffcf3f;text-shadow:6px 6px 0 #1f2544;animation:lg-pop .45s}
.lg-estrellas{font-size:34px;letter-spacing:6px;margin:2px 0}
.lg-estrellas .off{filter:grayscale(1);opacity:.25}
.lg-medalla{display:inline-block;margin-top:6px;background:#ffcf3f;color:#1f2544;border:3px solid #1f2544;border-radius:999px;padding:3px 12px;font-weight:800;font-size:.9em}
.lg-masc{display:flex;align-items:flex-end;gap:8px;padding:8px 12px 12px}
.lg-masc>span:first-child{font-size:38px;line-height:1;flex:none}
.lg-msg{flex:1;min-width:0;background:#fff;color:#1f2544;border:3px solid #1f2544;border-radius:16px 16px 16px 4px;padding:6px 12px;font-weight:800;font-size:.92em;min-height:calc(2.7em + 18px);display:flex;align-items:center;overflow-wrap:anywhere}
.lg-teclas{font-size:.8em;color:#4a5075}
.lg-preg-t{margin:0 0 4px;font-weight:800;color:#4a5075;font-size:.9em}
.lg-preg{padding:12px 14px}
.lg-preg h3{font-size:1.2em;overflow-wrap:anywhere}
.lg-preg h3 .lg-oir{font-size:.6em;vertical-align:middle}
.lg-ops{display:grid;gap:7px;margin-top:8px}
.lg-op{background:#fff;color:#1f2544;border:3px solid #1f2544;border-radius:14px;box-shadow:3px 3px 0 #1f2544;padding:7px 8px;
  font-family:var(--f-head,${FUENTE});font-weight:800;font-size:1.1em;cursor:pointer;overflow-wrap:anywhere}
.lg-op:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #1f2544}
.lg-op.lg-si{background:#8ee0a8}
.lg-op.lg-no{background:#ff9dbd;opacity:.7}
.lg-preg-x{min-height:1.3em;font-weight:800;margin:8px 0 0}
.lg-reloj{height:10px;border:2px solid #1f2544;border-radius:99px;overflow:hidden;margin-top:6px}
.lg-reloj i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#ff6b6b,#ffcf3f,#35b862)}
.lg-controles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:10px 12px 0}
.lg-controles[hidden]{display:none}
.lg-ctl{background:#fff;color:#1f2544;border:3px solid #1f2544;border-radius:16px;box-shadow:3px 3px 0 #1f2544;font-size:24px;height:54px;cursor:pointer;
  touch-action:none;padding:0;font-family:var(--f-head,${FUENTE});font-weight:800}
.lg-ctl:active,.lg-ctl.lg-on{transform:translate(2px,2px);box-shadow:1px 1px 0 #1f2544;background:#ffcf3f}
.lg-ctl.lg-ancho{grid-column:1/-1;font-size:1.25em}
.lg-ctl.lg-cmd{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-size:.74em;line-height:1.05;height:58px;padding:0 2px;overflow:hidden}
.lg-ctl.lg-cmd span{font-size:22px;line-height:1}
.lg-ctl:disabled{opacity:.45;cursor:default}
.lg-rpg{position:relative;overflow:hidden;background:linear-gradient(#3b2a7a,#6a4fbf 56%,#3f8a4f 56%,#2f6a3d)}
.lg-rpg .lg-ene{position:absolute;right:12px;top:12px;display:flex;flex-direction:column;align-items:flex-end;gap:4px;max-width:70%}
.lg-rpg .lg-her{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:flex-end;gap:10px}
.lg-ficha{background:#fff;color:#1f2544;border:3px solid #1f2544;border-radius:14px;padding:4px 10px;min-width:150px;max-width:230px;box-shadow:3px 3px 0 #1f2544}
.lg-ficha b{display:block;font-family:var(--f-head,${FUENTE});font-size:.95em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lg-hp{height:10px;border:2px solid #1f2544;border-radius:99px;background:#eee;overflow:hidden;margin:3px 0}
.lg-hp i{display:block;height:100%;width:100%;background:#ff5b5b;transition:width .4s}
.lg-hp.v i{background:#35b862}
.lg-ficha small{display:block;font-size:.78em;font-weight:800;min-height:1.2em}
.lg-cara{font-size:78px;line-height:1;filter:drop-shadow(0 6px 0 rgba(0,0,0,.25));align-self:center;margin-right:20px}
.lg-ene-cara{animation:lg-flota 2.4s ease-in-out infinite}
.lg-her-cara{font-size:44px;width:78px;height:78px;border-radius:50%;border:3px solid #1f2544;display:grid;place-items:center;box-shadow:3px 3px 0 #1f2544;flex:none}
.lg-num{position:absolute;z-index:3;font-family:var(--f-head,${FUENTE});font-weight:800;font-size:30px;-webkit-text-stroke:2px #1f2544;pointer-events:none;animation:lg-sube .9s forwards}
.lg-golpe{animation:lg-golpe .45s}
.lg-ataca{animation:lg-ataca .45s}
.lg-ataca-ene{animation:lg-ataca-ene .45s}
.lg-carga{animation:lg-carga .8s 2}
.lg-escudo{animation:lg-escudo .6s}
.lg-entra{animation:lg-entra .6s}
.lg-muere{animation:lg-muere .8s forwards}
@keyframes lg-flota{50%{transform:translateY(-8px)}}
@keyframes lg-golpe{20%{transform:translateX(-12px);filter:brightness(2.2)}40%{transform:translateX(10px)}60%{transform:translateX(-6px)}}
@keyframes lg-ataca{40%{transform:translate(34px,-22px) scale(1.12)}}
@keyframes lg-ataca-ene{40%{transform:translate(-34px,24px) scale(1.12)}}
@keyframes lg-carga{50%{transform:scale(1.18);filter:drop-shadow(0 0 14px #ffcf3f)}}
@keyframes lg-escudo{50%{box-shadow:0 0 0 10px rgba(89,195,255,.7)}}
@keyframes lg-entra{from{transform:translateX(80px) scale(.4);opacity:0}}
@keyframes lg-muere{to{transform:scale(0) rotate(200deg);opacity:0}}
@keyframes lg-sube{to{transform:translateY(-60px);opacity:0}}
@media (prefers-reduced-motion: reduce){.lg-ene-cara,.lg-golpe,.lg-ataca,.lg-ataca-ene,.lg-carga,.lg-escudo,.lg-entra{animation:none}}
@media (max-height:780px){
  .lg-hud{padding:8px 10px 4px}
  .lg-b{width:34px;height:34px;font-size:15px;border-radius:12px}
  .lg-consigna{min-height:calc(2.3em + 14px);font-size:.95em;padding:4px 10px;margin:0 10px}
  .lg-fila2{margin:6px 10px 0}
  .lg-zona{margin-top:6px}
  .lg-controles{padding:8px 10px 0;gap:6px}
  .lg-ctl{height:48px;font-size:22px}
  .lg-masc{padding:6px 10px 8px}
  .lg-masc>span:first-child{font-size:28px}
  .lg-msg{min-height:calc(2.7em + 14px);padding:4px 10px;font-size:.85em}
}
@keyframes lg-pop{from{transform:scale(.3);opacity:0}}
@media (prefers-reduced-motion: reduce){.lg-tarjeta,.lg-cuenta,.lg-consigna.lg-pop{animation:none}}`;
    document.head.appendChild(s);
  }

  // ---------- Piezas comunes a todos los juegos ----------
  const BIEN = ["¡Eso, {n}!", "¡Bien apuntado!", "¡Súper!", "¡Así se hace!", "¡Qué puntería!", "¡Pensaste muy bien!"];
  const GOLPE = ["¡Golpe directo! 💥", "¡Toma eso! ⚡", "¡Le diste!", "¡Eso le dolió! 🌟"];

  function nino(opts) {
    const n = window.LG_NINO || {};
    const h = opts.heroe || {};
    return {
      nombre: opts.nombre || n.nombre || "campeón",
      emoji: h.emoji || n.avatar || "🐬",
      color: h.color || n.color || "#ff6b9a",
    };
  }

  /** Marco con HUD, consigna, barra, zona de juego y mascota. */
  function marco(host, titulo) {
    host.innerHTML = `<div class="lg-juego">
      <div class="lg-hud"><button class="lg-b" data-salir aria-label="Volver">←</button><strong>${esc(titulo)}</strong>
        <span class="lg-pts">⭐ 0</span>
        <button class="lg-b" data-sonido aria-label="Sonido">${enSilencio() ? "🔇" : "🔊"}</button></div>
      <div class="lg-consigna" aria-live="polite"><span></span><button class="lg-oir" aria-label="Escuchar">🔊</button></div>
      <div class="lg-fila2"><div class="lg-barra"><i></i></div><span class="lg-vidas" hidden></span></div>
      <div class="lg-zona"><div class="lg-capa" hidden></div></div>
      <div class="lg-controles" hidden></div>
      <div class="lg-masc"><span aria-hidden="true">🐬</span><span class="lg-msg" aria-live="polite"></span></div></div>`;
    const raiz = host.querySelector(".lg-juego"), $ = (s) => raiz.querySelector(s);
    const capa = $(".lg-capa");
    $("[data-sonido]").onclick = (e) => { const s = !enSilencio(); guardar("ld-muted", s ? "1" : "0"); e.currentTarget.textContent = s ? "🔇" : "🔊"; };
    $(".lg-oir").onclick = () => hablar($(".lg-consigna span").textContent);
    requestAnimationFrame(() => { try { raiz.scrollIntoView({ block: "start", behavior: quieto() ? "auto" : "smooth" }); } catch (e) {} });
    return {
      raiz, zona: $(".lg-zona"), capa,
      alSalir(fn) { $("[data-salir]").onclick = fn; },
      controles(html) { const c = $(".lg-controles"); c.innerHTML = html; c.hidden = false; return c; },
      decir(t) { $(".lg-msg").textContent = t; },
      consigna(t) { const c = $(".lg-consigna"); c.querySelector("span").textContent = t; c.classList.remove("lg-pop"); void c.offsetWidth; c.classList.add("lg-pop"); },
      puntos(n) { $(".lg-pts").textContent = "⭐ " + n; },
      barra(f) { $(".lg-barra i").style.width = Math.round(Math.max(0, Math.min(1, f)) * 100) + "%"; },
      vidas(n, max) { const v = $(".lg-vidas"); v.hidden = !max; v.innerHTML = Array.from({ length: max }, (_, i) => `<span class="${i < n ? "" : "off"}">❤️</span>`).join(""); },
      mostrar(html) { capa.innerHTML = html; capa.hidden = false; },
      ocultar() { capa.hidden = true; capa.innerHTML = ""; },
    };
  }

  /**
   * Alto de la zona de juego para que TODO el juego quepa en la pantalla sin desplazarse.
   * Dentro de la lección, las pestañas quedan fijas arriba (unos 92 px): por eso la reserva.
   * Llamar después de poner los controles, porque cuentan en el alto.
   */
  const RESERVA = 96;
  function altoDisponible(M, min, max) {
    const resto = M.raiz.offsetHeight - M.zona.offsetHeight;
    const libre = (window.innerHeight || 700) - resto - RESERVA;
    return Math.round(Math.max(min, Math.min(max, libre)));
  }

  /** Pantalla de inicio y cuenta 3-2-1. */
  function presentar(M, info, D, rapido, alEmpezar) {
    const cuenta = () => {
      let n = 3;
      const pintar = (t) => M.mostrar(`<div class="lg-cuenta">${t}</div>`);
      pintar(n); SON.cuenta();
      const t = setInterval(() => {
        if (!M.raiz.isConnected) return clearInterval(t);
        n--;
        if (n > 0) { pintar(n); SON.cuenta(); }
        else if (n === 0) { pintar("¡Ya!"); SON.ya(); }
        else { clearInterval(t); M.ocultar(); alEmpezar(); }
      }, 600);
    };
    if (rapido) return cuenta();
    M.mostrar(`<div class="lg-tarjeta"><div class="lg-grande">${info.icono}</div><h3>${esc(info.nombre)}</h3>
      <span class="lg-insignia ${D ? "h" : ""}">${D ? "🔥 Modo difícil" : "😊 Modo normal"}</span>
      <p>${esc(info.como)}${D && info.dificil ? `<br><b>🔥 ${esc(info.dificil)}</b>` : ""}</p>
      ${info.teclas && conTeclado() ? `<p class="lg-teclas">${esc(info.teclas)}</p>` : ""}
      <button class="lg-btn" data-jugar>▶ ¡A jugar!</button><button class="lg-link" data-leer>🔊 Escuchar cómo se juega</button></div>`);
    M.capa.querySelector("[data-jugar]").onclick = cuenta;
    M.capa.querySelector("[data-leer]").onclick = () => hablar(info.como + (D && info.dificil ? " " + info.dificil : ""));
  }

  /** Estrellas según aciertos sobre intentos (igual que la skill). */
  const estrellasDe = (ok, n) => { const r = n ? ok / n : 0; return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1; };

  /** Pantalla final, positiva siempre. */
  function cierre(M, r, opts, D, otraVez) {
    const nombre = esc(nino(opts).nombre);
    if (r.gano) {
      const e = r.estrellas;
      M.mostrar(`<div class="lg-tarjeta"><div class="lg-grande">${e === 3 ? "🏆" : e === 2 ? "🥈" : "🎖️"}</div>
        <div class="lg-estrellas">${[1, 2, 3].map((i) => `<span class="${i <= e ? "" : "off"}">⭐</span>`).join("")}</div>
        <h3>${e === 3 ? "¡Perfecto" : e === 2 ? "¡Muy bien" : "¡Buen comienzo"}, ${nombre}!</h3>
        <p>${esc(r.resumen)}</p>
        ${D ? `<div class="lg-medalla">🔥 ¡Superaste el modo difícil!</div>` : ""}
        <button class="lg-btn" data-otra>🔁 Jugar otra vez</button>
        ${!D && e === 3 && opts.alCambiarDificultad ? `<button class="lg-btn lg-rojo" data-dificil>🔥 Probar en difícil</button>` : ""}
        <button class="lg-btn lg-claro" data-fuera>Elegir otro juego</button></div>`);
      M.decir(e === 3 ? "¡Ganaste las tres estrellas! 🎉" : e === 2 ? "¡Muy bien! Juega otra vez por la tercera estrella ⭐" : "¡Buen comienzo! Cada partida te sale mejor 💪");
    } else {
      M.mostrar(`<div class="lg-tarjeta"><div class="lg-grande">💪</div><h3>${esc(r.titulo || "¡Los corazones se acabaron por ahora!")}</h3>
        <p>${esc(r.resumen)} ¡Estuviste muy cerca!</p>
        <button class="lg-btn" data-otra>🔁 Intentar otra vez</button>
        ${D && opts.alCambiarDificultad ? `<button class="lg-btn lg-claro" data-normal>😊 Jugar en normal</button>` : ""}
        <button class="lg-btn lg-claro" data-fuera>Elegir otro juego</button></div>`);
      M.decir("¡No te rindas! Cada intento te hace más fuerte 💪");
    }
    const c = M.capa;
    c.querySelector("[data-otra]").onclick = () => otraVez(D);
    c.querySelector("[data-dificil]")?.addEventListener("click", () => { opts.alCambiarDificultad("dificil"); otraVez(true); });
    c.querySelector("[data-normal]")?.addEventListener("click", () => { opts.alCambiarDificultad("normal"); otraVez(false); });
    c.querySelector("[data-fuera]").onclick = () => (opts.alSalir ? opts.alSalir() : null);
  }

  /** Anota la partida en el registro de la lección (para el equipo; el niño no lo ve). */
  function anotar(opts, tipo, hab, D, S, fin) {
    if (S.anotado || !S.inicio || !opts.registro) return;
    S.anotado = true;
    let r = leerJSON(opts.registro, []);
    if (!Array.isArray(r)) r = [];
    r.push({
      j: opts.id || tipo, h: opts.hab ?? hab, m: D ? "d" : "n",
      ok: S.aciertos, n: S.aciertos + S.errores + S.escapados, err: S.errores,
      seg: Math.round((Date.now() - S.inicio) / 1000), fin, d: hoyLocal(),
    });
    guardar(opts.registro, JSON.stringify(r.slice(-300)));
  }

  // ---------- Preguntas (las mismas de la lección: { pregunta, opciones, correcta, explicacion?, pista? }) ----------
  /** Deja 3 opciones en normal y 4 en difícil, mezcladas, y descarta las preguntas mal armadas. */
  function normalizar(fuente, D) {
    let lista;
    try { const v = typeof fuente === "function" ? fuente() : fuente; lista = Array.isArray(v) ? v : []; }
    catch (e) { console.error("[Learnground]", e); lista = []; }
    return mezclar(lista.filter((q) => q && q.pregunta && Array.isArray(q.opciones) && q.opciones.length >= 2 && q.opciones[Number(q.correcta)] != null)).map((q) => {
      const correcta = String(q.opciones[Number(q.correcta)]);
      const otras = mezclar([...new Set(q.opciones.map(String))].filter((o) => o !== correcta)).slice(0, D ? 3 : 2);
      return { pregunta: String(q.pregunta), opciones: mezclar([correcta, ...otras]), correcta, explicacion: q.explicacion ? String(q.explicacion) : "", pista: q.pista ? String(q.pista) : "" };
    });
  }
  /** Entrega preguntas sin repetir; cuando se acaban, pide más a la lección. */
  function cola(fuente, D) {
    let c = [];
    return () => { if (!c.length) c = normalizar(fuente, D); return c.shift() || null; };
  }
  /**
   * Tarjeta de pregunta encima del juego.
   * reintentar: true en las puertas (hay que acertar para pasar); false en los demás (un intento).
   * ev.fallo() se llama en cada error y devuelve false si el juego se acabó; ev.fin(acerto, primera) al cerrar.
   */
  function preguntar(M, q, { D, reintentar, titulo, segundos }, ev) {
    let primera = true, listo = false, reloj = 0;
    M.mostrar(`<div class="lg-tarjeta lg-preg"><p class="lg-preg-t">${esc(titulo || "❓ ¡Pregunta!")}</p>
      <h3>${esc(q.pregunta)} <button class="lg-oir" data-oir aria-label="Escuchar">🔊</button></h3>
      ${D ? `<div class="lg-reloj"><i></i></div>` : ""}
      <div class="lg-ops">${q.opciones.map((o, i) => `<button class="lg-op" data-i="${i}">${esc(o)}</button>`).join("")}</div>
      <p class="lg-preg-x" aria-live="polite"></p></div>`);
    const c = M.capa, x = c.querySelector(".lg-preg-x"), botones = [...c.querySelectorAll(".lg-op")];
    c.querySelector("[data-oir]").onclick = () => hablar(q.pregunta + ". " + q.opciones.join(", "));
    const correcto = botones.find((b) => q.opciones[b.dataset.i] === q.correcta);
    function cerrar(acerto, ms) {
      if (listo) return;
      listo = true; clearTimeout(reloj);
      setTimeout(() => { if (!M.raiz.isConnected) return; M.ocultar(); ev.fin(acerto, primera); }, ms);
    }
    function arrancarReloj() {
      if (!D) return;
      const s = segundos || 15, bar = c.querySelector(".lg-reloj i");
      bar.style.transition = "none"; bar.style.width = "100%";
      requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = `width ${s}s linear`; bar.style.width = "0%"; }));
      clearTimeout(reloj);
      reloj = setTimeout(() => { if (!listo && M.raiz.isConnected) error(null); }, s * 1000);
    }
    function error(b) {
      SON.mal();
      const antes = primera; primera = false;
      if (b) { b.classList.add("lg-no"); b.disabled = true; }
      const sigue = ev.fallo(antes);
      if (sigue === false) { listo = true; clearTimeout(reloj); return; }
      if (reintentar) {
        x.textContent = (b ? "¡Casi! " : "¡Se acabó el tiempo! ") + (q.pista || "Prueba otra opción 💡");
        arrancarReloj();
      } else {
        botones.forEach((o) => { o.disabled = true; }); correcto.classList.add("lg-si");
        x.textContent = `Era «${q.correcta}». ${q.explicacion}`;
        cerrar(false, 2200);
      }
    }
    botones.forEach((b) => b.onclick = () => {
      if (listo) return;
      if (b === correcto) {
        b.classList.add("lg-si"); botones.forEach((o) => { o.disabled = true; });
        SON.bien(); x.textContent = `¡Eso! ${q.explicacion}`;
        cerrar(true, q.explicacion ? 1300 : 800);
      } else error(b);
    });
    arrancarReloj();
  }

  // ---------- Dibujo ----------
  function caja(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  /** Tamaño de letra que cabe en el ancho (mínimo 11 px) y el texto recortado si aun así no cabe. */
  function ajustar(ctx, txt, ancho, base) {
    let fs = base;
    ctx.font = `800 ${fs}px ${FUENTE}`;
    while (fs > 11 && ctx.measureText(txt).width > ancho) { fs--; ctx.font = `800 ${fs}px ${FUENTE}`; }
    let t = txt;
    while (t.length > 1 && ctx.measureText(t).width > ancho) t = t.slice(0, -2) + "…";
    return [fs, t];
  }

  // =====================================================================
  // 🚀 La nave (shoot 'em up)
  // datos = {
  //   titulo?: "🚀 La nave de las tablas",
  //   rondas: [{ consigna: "Dispara a los resultados de la tabla del 3",
  //              bien: [..] | () => "12", mal: [..] | () => "7", explica?: "La tabla del 3: 3, 6, 9…" }],
  //   jefe?: { nombre: "Olvidón", emoji: "👾",
  //            preguntas: [..] | () => [{ pregunta, opciones: [..], correcta: 0, explicacion? }] },
  //   enemigos?: ["👾", "🛸"]
  // }
  // =====================================================================
  const INFO_NAVE = {
    icono: "🚀", nombre: "La nave",
    como: "Deja el dedo en la pantalla para disparar y arrástralo para moverte. Dispara SOLO a lo que dice arriba.",
    dificil: "Más rápido y con 3 corazones: los tiros al que no es y los choques te quitan uno.",
    teclas: "Con teclado: ← → para moverte y espacio para disparar.",
  };

  function nave(host, datos, opts, rapido) {
    const D = !!opts.dificil;
    const rondas = (datos.rondas || []).filter((r) => r && r.consigna && r.bien != null && r.mal != null);
    if (!rondas.length) throw new Error("La nave necesita al menos una ronda con consigna, bien y mal.");
    const jefeDatos = datos.jefe && datos.jefe.preguntas ? datos.jefe : null;
    const EMOJIS = Array.isArray(datos.enemigos) && datos.enemigos.length ? datos.enemigos : ["👾", "🛸", "☄️", "👽"];
    const META = D ? 8 : 6;
    const heroe = nino(opts);
    const M = marco(host, datos.titulo || "🚀 La nave");
    const cv = document.createElement("canvas");
    cv.setAttribute("aria-label", "Zona de juego de la nave");
    M.zona.prepend(cv);
    const ctx = cv.getContext("2d");

    let W = 340, H = 420;
    function medir() {
      W = M.zona.clientWidth || 340;
      H = altoDisponible(M, 260, 540);
      const r = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * r); cv.height = Math.round(H * r); cv.style.height = H + "px";
      ctx.setTransform(r, 0, 0, r, 0, 0);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
    }
    medir();

    const S = {
      fase: "intro", ronda: 0, progreso: 0, aciertos: 0, errores: 0, escapados: 0, puntos: 0, racha: 0,
      vidas: D ? 3 : 0, invulnerable: 0, gracia: 0, triple: 0, temblor: 0, disparos: 0,
      jugador: { x: W / 2 }, disparando: false, recarga: 0, siguiente: 0.6, seguidosMalos: 0,
      balas: [], enemigos: [], chispas: [], textos: [], fuego: [], rayos: [],
      fondo: Array.from({ length: 55 }, () => ({ x: Math.random(), y: Math.random(), v: azar(0.02, 0.09), r: azar(0.6, 1.9) })),
      jefe: null, pregunta: null, reloj: 0, inicio: 0, anotado: false,
    };
    window.LG._estado = S; // solo para las pruebas automáticas

    // --- Reloj del juego ---
    const timers = [];
    let raf = 0, ultimo = 0, parado = false;
    const luego = (fn, ms) => timers.push(setTimeout(() => { if (!parado && cv.isConnected) fn(); }, ms));
    function parar() {
      parado = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout);
      window.removeEventListener("keydown", tecla); window.removeEventListener("keyup", tecla); window.removeEventListener("resize", alCambiarTamano);
    }
    const alCambiarTamano = () => { if (!cv.isConnected) return; medir(); S.jugador.x = Math.max(24, Math.min(W - 24, S.jugador.x)); };
    window.addEventListener("resize", alCambiarTamano);

    // --- Controles: dedo (mantener = disparar, arrastrar = mover) y teclado ---
    let arrastre = null;
    const jugando = () => S.fase === "juego" || S.fase === "jefe";
    cv.addEventListener("pointerdown", (e) => {
      if (!jugando()) return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      arrastre = { px: e.clientX, x: S.jugador.x }; S.disparando = true;
    });
    cv.addEventListener("pointermove", (e) => { if (arrastre) S.jugador.x = arrastre.x + (e.clientX - arrastre.px) * 1.15; });
    const soltar = () => { arrastre = null; S.disparando = false; };
    cv.addEventListener("pointerup", soltar); cv.addEventListener("pointercancel", soltar);
    const teclas = {};
    function tecla(e) {
      const v = e.type === "keydown", k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") teclas.izq = v;
      else if (k === "ArrowRight" || k === "d" || k === "D") teclas.der = v;
      else if (k === " " || k === "ArrowUp") teclas.fuego = v;
      else return;
      if (jugando()) e.preventDefault();
    }
    window.addEventListener("keydown", tecla); window.addEventListener("keyup", tecla);

    // --- Salir con ← ---
    M.alSalir(() => {
      if (S.fase !== "fin") anotar(opts, "nave", "atencion", D, S, "salio");
      parar(); try { speechSynthesis.cancel(); } catch (e) {}
      if (opts.alSalir) opts.alSalir(); else host.innerHTML = "";
    });

    // --- Ayudas ---
    const nombreNino = heroe.nombre;
    const etapas = rondas.length + (jefeDatos ? 1 : 0);
    function barra() {
      if (S.fase === "jefe" && S.jefe) M.barra((rondas.length + 1 - S.jefe.vida / S.jefe.max) / etapas);
      else M.barra((S.ronda + S.progreso / META) / etapas);
    }
    function chispas(x, y, color, n) {
      if (quieto()) n = Math.min(n, 4);
      for (let i = 0; i < n; i++) S.chispas.push({ x, y, vx: azar(-170, 170), vy: azar(-190, 120), t: azar(0.35, 0.7), color });
    }
    const texto = (x, y, txt, color, escala = 1) => S.textos.push({ x, y, txt, color, t: 1, escala });
    function perderVida() {
      if (!D) return;
      S.vidas--; M.vidas(S.vidas, 3);
      if (S.vidas <= 0 && S.fase !== "fin" && S.fase !== "final") { S.fase = "final"; S.enemigos = []; luego(() => terminar(false), 800); }
    }
    // Un mal tiro cuesta un corazón, pero una ráfaga seguida cuenta como uno solo.
    function malTiro() {
      if (S.gracia > 0) return;
      S.gracia = 0.6;
      perderVida();
    }
    function choque(msg) {
      if (S.invulnerable > 0) return;
      S.invulnerable = 1.2; S.temblor = 0.35; SON.mal(); M.decir(msg);
      perderVida();
    }

    // --- Rondas ---
    const carriles = () => Math.max(3, Math.min(6, Math.floor(W / 82)));
    const velocidad = () => (H / (D ? 6 : 8.5)) * (1 + S.ronda * 0.08);
    function ponerConsigna() { M.consigna(rondas[S.ronda].consigna); }
    function crear() {
      const r = rondas[S.ronda], n = carriles();
      const libres = mezclar([...Array(n).keys()]).filter((c) => !S.enemigos.some((e) => Math.abs(e.x - (c + 0.5) * (W / n)) < 10 && e.y < 120));
      if (!libres.length) return;
      const bueno = S.seguidosMalos >= 2 ? true : Math.random() < (D ? 0.45 : 0.5);
      let txt = "", g = 0;
      do { txt = String(sacar(bueno ? r.bien : r.mal) ?? ""); } while ((!txt || S.enemigos.some((e) => e.txt === txt)) && g++ < 10);
      if (!txt) return;
      S.seguidosMalos = bueno ? 0 : S.seguidosMalos + 1;
      const w = Math.min(96, W / n - 10);
      S.enemigos.push({ x: (libres[0] + 0.5) * (W / n), y: -40, w, h: 62, vy: velocidad() * azar(0.85, 1.15), txt, bueno, emoji: elegir(EMOJIS), fase: azar(0, 6), vivo: true });
    }
    function rondaCompleta() {
      S.fase = "pausa";
      S.enemigos.forEach((e) => chispas(e.x, e.y, "#ffffff", 6)); S.enemigos = [];
      SON.gana();
      const ultima = S.ronda >= rondas.length - 1;
      texto(W / 2, H / 2, `¡Ronda ${S.ronda + 1} completa! 🎉`, "#ffcf3f", 1.5);
      M.decir(ultima && jefeDatos ? `¡Ronda completa! Ahora viene ${jefeDatos.nombre || "el jefe"}… 😮` : "¡Ronda completa! ¡Vas volando! 🚀");
      luego(() => {
        if (ultima) { if (jefeDatos) empezarJefe(); else terminar(true); return; }
        S.ronda++; S.progreso = 0; S.fase = "juego"; S.siguiente = 0.8; ponerConsigna(); barra();
        M.decir("¡Nueva misión! Lee bien lo que dice arriba 👆");
      }, 1700);
    }
    function golpe(e) {
      if (e.bueno) {
        S.aciertos++; S.racha++; S.progreso++;
        const p = S.racha >= 5 ? 20 : 10; S.puntos += p; M.puntos(S.puntos);
        chispas(e.x, e.y, "#35b862", 18); texto(e.x, e.y - 20, "+" + p, "#7fffa0"); SON.bien();
        if (S.racha % 5 === 0) { S.triple = 7; texto(W / 2, H * 0.45, "¡DISPARO TRIPLE!", "#ffcf3f", 1.4); M.decir(`¡${S.racha} seguidas! Disparo triple 🔥`); }
        else M.decir(elegir(BIEN).replace("{n}", nombreNino));
        barra();
        if (S.progreso >= META) rondaCompleta();
      } else {
        S.errores++; S.racha = 0; S.temblor = 0.2;
        chispas(e.x, e.y, "#ff6b9a", 10); texto(e.x, e.y - 20, "¡Ese no!", "#ffb3c8"); SON.mal();
        const r = rondas[S.ronda];
        M.decir(`¡Casi! «${e.txt}» no va en esta ronda.` + (r.explica && !D ? " " + r.explica : ""));
        malTiro();
      }
    }

    // --- El jefe ---
    const siguienteJefe = jefeDatos ? cola(jefeDatos.preguntas, D) : () => null;
    let pendiente = null;
    function empezarJefe() {
      pendiente = siguienteJefe();
      if (!pendiente) return terminar(true);
      const vida = D ? 8 : 5;
      S.jefe = { nombre: jefeDatos.nombre || "El jefe", emoji: jefeDatos.emoji || "👾", x: W / 2, y: 74, dir: 1, vida, max: vida, golpe: 0, enojo: false, recarga: 3 };
      S.fase = "jefe"; S.enemigos = []; barra();
      texto(W / 2, H / 2, `⚠️ ¡${S.jefe.nombre}! ⚠️`, "#ff9dbd", 1.5);
      M.consigna(`${S.jefe.emoji} ¡Apareció ${S.jefe.nombre}!`);
      M.decir(`Dispárale a la respuesta correcta para atacar a ${S.jefe.nombre} 💥 ¡Y esquiva su fuego!`);
      luego(preguntaJefe, 1500);
    }
    function preguntaJefe() {
      if (S.fase !== "jefe") return;
      const q = pendiente || siguienteJefe();
      pendiente = null;
      if (!q) return jefeVencido();
      S.pregunta = q;
      M.consigna(`${S.jefe.emoji} ${q.pregunta}`);
      const n = q.opciones.length, w = Math.min(130, (W - 12) / n - 8);
      S.enemigos = q.opciones.map((o, i) => ({ x: (i + 0.5) * (W / n), y: 150, w, h: 46, vy: H / (D ? 7.5 : 10.5), txt: o, bueno: o === q.correcta, orbe: true, vivo: true, fase: azar(0, 6) }));
    }
    function golpeOrbe(e) {
      const J = S.jefe, q = S.pregunta;
      if (e.bueno) {
        S.aciertos++; S.racha++; SON.golpe();
        chispas(e.x, e.y, "#35b862", 14);
        S.rayos.push({ x: e.x, y: e.y, t: 0.3 });
        J.vida--; J.golpe = 0.45; S.puntos += 25; M.puntos(S.puntos);
        texto(J.x, J.y + 10, "-1 💥", "#ffcf3f", 1.3); chispas(J.x, J.y, "#ffcf3f", 16);
        S.enemigos.forEach((o) => { if (o !== e && o.vivo) { o.vivo = false; chispas(o.x, o.y, "#ffffff", 5); } });
        barra();
        if (J.vida <= 0) return jefeVencido();
        M.decir(elegir(GOLPE) + (q && q.explicacion ? " " + q.explicacion : ""));
        if (!J.enojo && J.vida <= J.max / 2) { J.enojo = true; texto(W / 2, H * 0.42, `¡${J.nombre} se enojó! 😠`, "#ff9dbd", 1.2); }
        luego(preguntaJefe, 1100);
      } else {
        S.errores++; S.racha = 0; SON.mal(); chispas(e.x, e.y, "#ff6b9a", 8);
        if (D && J.vida < J.max) { J.vida++; texto(J.x, J.y + 10, "+1 😈", "#ff9dbd"); barra(); }
        M.decir(`¡Uy! «${e.txt}» no era. ${D ? "" : "Mira bien las otras opciones 💡"}`);
        malTiro();
      }
    }
    function jefeVencido() {
      S.fase = "final"; S.enemigos = []; S.fuego = [];
      for (let i = 0; i < 4; i++) luego(() => { chispas(S.jefe.x + azar(-30, 30), S.jefe.y + azar(-20, 20), elegir(["#ffcf3f", "#ff6b9a", "#59c3ff", "#35b862"]), 22); SON.golpe(); }, i * 220);
      M.decir(`¡Venciste a ${S.jefe.nombre}! 🎉`);
      M.consigna(`🏆 ¡Venciste a ${S.jefe.nombre}!`);
      luego(() => { S.jefe.vivo = false; SON.gana(); }, 900);
      luego(() => terminar(true), 1600);
    }

    // --- Fin ---
    function terminar(gano) {
      if (S.fase === "fin") return;
      S.fase = "fin"; parar();
      anotar(opts, "nave", "atencion", D, S, gano ? "termino" : "perdio");
      const n = S.aciertos + S.errores + S.escapados;
      const estrellas = gano ? estrellasDe(S.aciertos, n) : 0;
      if (gano && opts.alTerminar) { try { opts.alTerminar(estrellas); } catch (e) { console.error("[Learnground]", e); } }
      dibujar();
      cierre(M, { gano, estrellas, resumen: `Acertaste ${S.aciertos} ${S.aciertos === 1 ? "vez" : "veces"}${S.jefe && S.jefe.vida <= 0 ? ` y venciste a ${S.jefe.nombre}` : ""}.` }, opts, D,
        (dif) => LG.jugar("nave", host, datos, { ...opts, dificil: dif }, true));
    }

    // --- Un paso del juego ---
    function paso(dt) {
      S.reloj += dt;
      const veloz = S.fase === "jefe" ? 1.6 : 1;
      S.fondo.forEach((s) => { s.y += s.v * dt * veloz; if (s.y > 1) { s.y = 0; s.x = Math.random(); } });
      S.chispas.forEach((c) => { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 260 * dt; c.t -= dt; });
      S.chispas = S.chispas.filter((c) => c.t > 0);
      S.textos.forEach((t) => { t.y -= 40 * dt; t.t -= dt * 0.8; });
      S.textos = S.textos.filter((t) => t.t > 0);
      S.rayos.forEach((r) => { r.t -= dt; }); S.rayos = S.rayos.filter((r) => r.t > 0);
      if (S.temblor > 0) S.temblor -= dt;
      if (S.jefe && S.jefe.golpe > 0) S.jefe.golpe -= dt;
      if (S.fase === "intro" || S.fase === "fin") return;

      // Nave
      if (teclas.izq) S.jugador.x -= 380 * dt;
      if (teclas.der) S.jugador.x += 380 * dt;
      S.jugador.x = Math.max(24, Math.min(W - 24, S.jugador.x));
      if (S.invulnerable > 0) S.invulnerable -= dt;
      if (S.gracia > 0) S.gracia -= dt;
      if (S.triple > 0) S.triple -= dt;
      S.recarga -= dt;
      if ((S.disparando || teclas.fuego) && S.recarga <= 0 && jugando()) {
        S.recarga = D ? 0.2 : 0.24;
        const y = H - 80;
        S.balas.push({ x: S.jugador.x, y, vx: 0, vy: -650 });
        // Disparo triple: tres balas rectas y juntas (un rayo más grueso), para no pegarles a los de los lados.
        if (S.triple > 0) S.balas.push({ x: S.jugador.x - 9, y: y + 6, vx: 0, vy: -650 }, { x: S.jugador.x + 9, y: y + 6, vx: 0, vy: -650 });
        if (++S.disparos % 3 === 0) SON.disparo();
      }
      S.balas.forEach((b) => { b.x += b.vx * dt; b.y += b.vy * dt; });

      // Enemigos
      if (S.fase === "juego") {
        S.siguiente -= dt;
        if (S.siguiente <= 0 && S.enemigos.length < (D ? Math.min(6, carriles() + 1) : 4)) { crear(); S.siguiente = D ? azar(0.55, 0.95) : azar(0.9, 1.4); }
      }
      S.enemigos.forEach((e) => { e.y += e.vy * dt; e.fase += dt; });

      // Choques de las balas
      for (const b of S.balas) {
        if (b.usada) continue;
        for (const e of S.enemigos) {
          if (e.vivo && Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) {
            b.usada = true; e.vivo = false;
            // La explosión se lleva las balas que iban hacia él: así no le pegan al de atrás sin querer.
            S.balas.forEach((o) => { if (o.y > e.y && Math.abs(o.x - e.x) < e.w / 2 + 6) o.usada = true; });
            if (e.orbe) golpeOrbe(e); else golpe(e);
            break;
          }
        }
        if (!b.usada && S.jefe && S.fase === "jefe" && Math.abs(b.x - S.jefe.x) < 34 && Math.abs(b.y - S.jefe.y) < 34) { b.usada = true; chispas(b.x, b.y, "#ffffff", 3); }
      }
      S.balas = S.balas.filter((b) => !b.usada && b.y > -20 && b.x > -20 && b.x < W + 20);

      // Choques con la nave (solo los enemigos de las rondas; las respuestas del jefe pasan por encima)
      const jy = H - 50;
      if (S.fase === "juego") {
        for (const e of S.enemigos) {
          if (e.vivo && Math.abs(e.x - S.jugador.x) < e.w / 2 + 14 && Math.abs(e.y - jy) < e.h / 2 + 16) {
            e.vivo = false; chispas(e.x, e.y, "#ff9a4d", 12);
            // Solo hacen daño los que no son; uno correcto que llega a la nave cuenta como que se escapó.
            if (e.bueno) { S.escapados++; M.decir(`¡Dispárale al «${e.txt}» antes de que llegue! 🎯`); }
            else choque("¡Uy, te chocó! Mueve la nave para esquivarlos 🚀");
          }
        }
      }

      // Lo que se sale por abajo
      for (const e of S.enemigos) {
        if (!e.vivo || e.y - e.h / 2 <= H) continue;
        e.vivo = false;
        if (!e.bueno) continue;
        S.escapados++;
        if (e.orbe && S.fase === "jefe") {
          S.enemigos.forEach((o) => { o.vivo = false; });
          const q = S.pregunta;
          M.decir(`Era «${e.txt}». ${q && q.explicacion ? q.explicacion + " " : ""}¡Va otra!`);
          luego(preguntaJefe, 1300);
        } else if (S.fase === "juego") M.decir(`Se escapó el «${e.txt}». ¡Atrapa el próximo! 💪`);
      }
      S.enemigos = S.enemigos.filter((e) => e.vivo);

      // El jefe se mueve y lanza fuego
      const J = S.jefe;
      if (J && S.fase === "jefe") {
        J.x += J.dir * (J.enojo ? 95 : 60) * dt;
        if (J.x > W - 50) J.dir = -1;
        if (J.x < 50) J.dir = 1;
        J.recarga -= dt;
        if (J.recarga <= 0) {
          J.recarga = (D ? 2 : 2.8) * (J.enojo ? 0.8 : 1);
          const dx = S.jugador.x - J.x, dy = jy - (J.y + 30), d = Math.hypot(dx, dy) || 1, v = D ? 190 : 150;
          S.fuego.push({ x: J.x, y: J.y + 30, vx: (dx / d) * v, vy: (dy / d) * v });
        }
      }
      S.fuego.forEach((f) => { f.x += f.vx * dt; f.y += f.vy * dt; });
      for (const f of S.fuego) {
        if (!f.usado && Math.abs(f.x - S.jugador.x) < 22 && Math.abs(f.y - jy) < 24) { f.usado = true; chispas(f.x, f.y, "#ff9a4d", 10); choque("¡Cuidado con el fuego! Muévete a un lado 🔥"); }
      }
      S.fuego = S.fuego.filter((f) => !f.usado && f.y < H + 20 && f.x > -20 && f.x < W + 20);
    }

    // --- Dibujo ---
    function dibujar() {
      ctx.save();
      if (S.temblor > 0 && !quieto()) ctx.translate(azar(-4, 4), azar(-4, 4));
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, S.fase === "jefe" || S.fase === "final" ? "#2a0f3d" : "#14123a"); g.addColorStop(1, "#3b2a7a");
      ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20);
      ctx.fillStyle = "#fff";
      S.fondo.forEach((s) => { ctx.globalAlpha = 0.35 + s.r / 3; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1;

      if (S.jefe && S.jefe.vivo !== false) dibujarJefe();
      S.enemigos.forEach(dibujarEnemigo);

      ctx.fillStyle = "#ffcf3f"; ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 2;
      S.balas.forEach((b) => { caja(ctx, b.x - 3, b.y - 9, 6, 18, 3); ctx.fill(); ctx.stroke(); });
      ctx.font = `24px ${EMOJI}`;
      S.fuego.forEach((f) => ctx.fillText("🔥", f.x, f.y));
      S.rayos.forEach((r) => {
        if (!S.jefe) return;
        ctx.strokeStyle = `rgba(255,207,63,${Math.min(1, r.t * 4)})`; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(S.jefe.x, S.jefe.y); ctx.stroke();
      });
      if (S.fase !== "intro") dibujarNave();

      S.chispas.forEach((c) => { ctx.globalAlpha = Math.max(0, Math.min(1, c.t * 2)); ctx.fillStyle = c.color; ctx.fillRect(c.x - 3, c.y - 3, 6, 6); });
      ctx.globalAlpha = 1;
      S.textos.forEach((t) => {
        ctx.globalAlpha = Math.max(0, Math.min(1, t.t * 1.5));
        const [fs, tx] = ajustar(ctx, t.txt, W - 24, Math.round(20 * t.escala));
        ctx.font = `800 ${fs}px ${FUENTE}`; ctx.lineWidth = 4; ctx.strokeStyle = "#1f2544";
        ctx.strokeText(tx, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(tx, t.x, t.y);
      });
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    function dibujarEnemigo(e) {
      const bob = Math.sin(e.fase * 3) * 3;
      ctx.lineWidth = 3; ctx.strokeStyle = "#1f2544";
      if (!e.orbe) { ctx.font = `30px ${EMOJI}`; ctx.fillText(e.emoji, e.x, e.y - 12 + bob); }
      const [fs, tx] = ajustar(ctx, e.txt, e.w - 12, e.orbe ? 18 : 17);
      const hh = fs + 12, yy = e.orbe ? e.y + bob : e.y + 16 + bob;
      ctx.fillStyle = e.orbe ? "#fff1a8" : "#ffffff";
      caja(ctx, e.x - e.w / 2, yy - hh / 2, e.w, hh, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#1f2544"; ctx.font = `800 ${fs}px ${FUENTE}`; ctx.fillText(tx, e.x, yy + 1);
    }
    function dibujarNave() {
      const x = S.jugador.x, y = H - 50;
      if (S.invulnerable > 0 && Math.floor(S.invulnerable * 10) % 2) ctx.globalAlpha = 0.45;
      if (S.triple > 0) { ctx.strokeStyle = "rgba(255,207,63,.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 4, 36 + Math.sin(S.reloj * 10) * 2, 0, 7); ctx.stroke(); }
      const llama = 10 + Math.sin(S.reloj * 30) * 4;
      ctx.fillStyle = "#ff9a4d"; ctx.beginPath(); ctx.moveTo(x - 8, y + 18); ctx.lineTo(x + 8, y + 18); ctx.lineTo(x, y + 18 + llama); ctx.closePath(); ctx.fill();
      ctx.fillStyle = heroe.color; ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 3;
      [-1, 1].forEach((l) => { ctx.beginPath(); ctx.moveTo(x + l * 16, y - 2); ctx.lineTo(x + l * 32, y + 20); ctx.lineTo(x + l * 14, y + 17); ctx.closePath(); ctx.fill(); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(x, y - 36);
      ctx.quadraticCurveTo(x + 24, y - 10, x + 19, y + 18); ctx.lineTo(x - 19, y + 18);
      ctx.quadraticCurveTo(x - 24, y - 10, x, y - 36); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x, y - 6, 14, 0, 7); ctx.fill(); ctx.stroke();
      ctx.font = `18px ${EMOJI}`; ctx.fillText(heroe.emoji, x, y - 5);
      ctx.globalAlpha = 1;
    }
    function dibujarJefe() {
      const J = S.jefe, y = J.y + Math.sin(S.reloj * 2) * 6;
      ctx.save();
      if (J.golpe > 0) { ctx.globalAlpha = 0.55 + Math.sin(J.golpe * 40) * 0.3; }
      ctx.font = `${J.enojo ? 64 : 58}px ${EMOJI}`;
      ctx.fillText(J.enojo && !jefeDatos.emoji ? "👹" : J.emoji, J.x, y);
      ctx.restore();
      const bw = Math.min(220, W - 40), x0 = W / 2 - bw / 2;
      ctx.fillStyle = "rgba(0,0,0,.45)"; caja(ctx, x0, 8, bw, 14, 7); ctx.fill();
      ctx.fillStyle = "#ff5b5b"; caja(ctx, x0, 8, Math.max(0, bw * (J.vida / J.max)), 14, 7); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; caja(ctx, x0, 8, bw, 14, 7); ctx.stroke();
      const [fs, tx] = ajustar(ctx, `${J.nombre}${J.enojo ? " 😠" : ""}`, bw, 13);
      ctx.font = `800 ${fs}px ${FUENTE}`; ctx.fillStyle = "#fff"; ctx.fillText(tx, W / 2, 31);
    }

    function cuadro(t) {
      if (!cv.isConnected) return parar();
      if (parado) return;
      raf = requestAnimationFrame(cuadro);
      if (document.hidden) { ultimo = t; return; }
      const dt = Math.min(0.05, ultimo ? (t - ultimo) / 1000 : 0);
      ultimo = t;
      paso(dt); dibujar();
    }
    raf = requestAnimationFrame(cuadro);

    M.consigna(rondas[0].consigna);
    M.decir(D ? "¡Modo difícil! ¿Aceptas el reto? 🔥" : `¡Hola, ${nombreNino}! Soy Lulo 🐬 ¿Listo para volar?`);
    if (D) M.vidas(3, 3);
    presentar(M, INFO_NAVE, D, rapido, () => {
      S.fase = "juego"; S.inicio = Date.now(); S.jugador.x = W / 2;
      ponerConsigna(); barra();
      M.decir("¡Dispara solo a lo que dice arriba! 👆");
    });
  }

  // =====================================================================
  // 🧱 Bloques (tipo Tetris)
  // datos = { titulo?: "🧱 Bloques de las tablas",
  //           preguntas: [..] | () => [{ pregunta, opciones: [..], correcta: 0, explicacion?, pista? }] }
  // Cada 3 piezas sale una pregunta: acertar da la pieza larga 💎 y baja un poco la velocidad;
  // en difícil, fallar sube una fila de piedra. Se gana al borrar las líneas de la meta.
  // En normal no se pierde: si se llena, Lulo limpia.
  // =====================================================================
  const INFO_BLOQUES = {
    icono: "🧱", nombre: "Bloques",
    como: "Mueve y gira las piezas para llenar filas: cada fila llena se borra. Cada 3 piezas hay una pregunta, y si aciertas ganas la pieza larga 💎.",
    dificil: "Más rápido, la pregunta tiene tiempo y si fallas sube una fila de piedra. Si los bloques llegan arriba, se acaba.",
    teclas: "Con teclado: ← → mover, ↑ girar, ↓ bajar y espacio para dejarla caer.",
  };
  const PIEZAS = {
    I: { m: [[1, 1, 1, 1]], c: "#59c3ff" },
    O: { m: [[1, 1], [1, 1]], c: "#ffcf3f" },
    T: { m: [[0, 1, 0], [1, 1, 1]], c: "#a77bff" },
    S: { m: [[0, 1, 1], [1, 1, 0]], c: "#35b862" },
    Z: { m: [[1, 1, 0], [0, 1, 1]], c: "#ff6b9a" },
    J: { m: [[1, 0, 0], [1, 1, 1]], c: "#4f7cff" },
    L: { m: [[0, 0, 1], [1, 1, 1]], c: "#ff9a4d" },
  };
  const PIEDRA = "#8a8fa8";
  const girar = (m) => m[0].map((_, i) => m.map((f) => f[i]).reverse());

  function bloques(host, datos, opts, rapido) {
    const D = !!opts.dificil;
    const siguiente = cola(datos.preguntas, D);
    const primeraPregunta = siguiente();
    if (!primeraPregunta) throw new Error("Bloques necesita preguntas con pregunta, opciones y correcta.");
    const COLS = 10, FILAS = 18, CADA = 3, META = D ? 12 : 8;
    const M = marco(host, datos.titulo || "🧱 Bloques");
    const CONTROLES = `<button class="lg-ctl" data-c="izq" aria-label="Mover a la izquierda">⬅️</button>
      <button class="lg-ctl" data-c="girar" aria-label="Girar">🔄</button>
      <button class="lg-ctl" data-c="der" aria-label="Mover a la derecha">➡️</button>
      <button class="lg-ctl" data-c="caer" aria-label="Dejar caer">⏬</button>`;
    M.controles(CONTROLES); // antes de medir: cuentan en el alto
    const cv = document.createElement("canvas");
    cv.setAttribute("aria-label", "Tablero de bloques");
    M.zona.prepend(cv);
    const ctx = cv.getContext("2d");

    let W = 340, H = 420, cs = 20, ox = 0, panel = 0;
    const oy = 8;
    function medir() {
      W = M.zona.clientWidth || 340;
      const alto = altoDisponible(M, 230, 560);
      cs = Math.max(12, Math.floor(Math.min((W - 24 - 96) / COLS, (alto - 16) / FILAS)));
      H = cs * FILAS + oy * 2;
      ox = Math.round((W - cs * COLS - 96) / 2); panel = ox + cs * COLS + 12;
      const r = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * r); cv.height = Math.round(H * r); cv.style.height = H + "px";
      ctx.setTransform(r, 0, 0, r, 0, 0);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
    }
    medir();

    const S = {
      fase: "intro", tablero: Array.from({ length: FILAS }, () => Array(COLS).fill(null)),
      pieza: null, proxima: null, bolsa: [], dorada: false, pregunta: null,
      lineas: 0, puntos: 0, aciertos: 0, errores: 0, escapados: 0, desdePregunta: 0,
      caida: 0, intervalo: D ? 0.55 : 0.85, limpiando: null, mantener: null, abajo: false,
      chispas: [], textos: [], reloj: 0, inicio: 0, anotado: false,
      COLS, FILAS,
    };
    window.LG._estado = S; // solo para las pruebas automáticas

    const timers = [];
    let raf = 0, ultimo = 0, parado = false;
    const luego = (fn, ms) => timers.push(setTimeout(() => { if (!parado && cv.isConnected) fn(); }, ms));
    function parar() {
      parado = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout);
      window.removeEventListener("keydown", tecla); window.removeEventListener("keyup", tecla); window.removeEventListener("resize", medir);
    }
    window.addEventListener("resize", medir);

    // --- Reglas del tablero ---
    const deBolsa = () => { if (!S.bolsa.length) S.bolsa = mezclar(Object.keys(PIEZAS)); return S.bolsa.pop(); };
    function cabe(m, x, y) {
      for (let f = 0; f < m.length; f++) {
        for (let c = 0; c < m[f].length; c++) {
          if (!m[f][c]) continue;
          const X = x + c, Y = y + f;
          if (X < 0 || X >= COLS || Y >= FILAS) return false;
          if (Y >= 0 && S.tablero[Y][X]) return false;
        }
      }
      return true;
    }
    S.cabe = cabe;
    function nuevaPieza() {
      let t;
      if (S.dorada) { t = "I"; S.dorada = false; }
      else { t = S.proxima || deBolsa(); S.proxima = deBolsa(); }
      if (!S.proxima) S.proxima = deBolsa();
      const m = PIEZAS[t].m.map((f) => [...f]);
      const p = { t, m, c: PIEZAS[t].c, x: Math.floor((COLS - m[0].length) / 2), y: 0 };
      S.caida = 0;
      if (!cabe(p.m, p.x, p.y)) { S.pieza = null; return lleno(); }
      S.pieza = p;
    }
    const activo = () => S.fase === "juego" && S.pieza;
    function mover(dx) { const p = S.pieza; if (!activo()) return; if (cabe(p.m, p.x + dx, p.y)) { p.x += dx; tono([480], 0.03, "sine", 0, 0.04); } }
    function rotar() {
      const p = S.pieza; if (!activo()) return;
      const m = girar(p.m);
      for (const dx of [0, -1, 1, -2, 2]) if (cabe(m, p.x + dx, p.y)) { p.m = m; p.x += dx; tono([700], 0.04, "triangle", 0, 0.05); return; }
    }
    function soltar() {
      const p = S.pieza; if (!activo()) return;
      let n = 0;
      while (cabe(p.m, p.x, p.y + 1)) { p.y++; n++; }
      S.puntos += n; M.puntos(S.puntos); SON.golpe();
      fijar();
    }
    S._soltar = soltar; // solo para las pruebas automáticas
    function fijar() {
      const p = S.pieza; S.pieza = null;
      p.m.forEach((f, i) => f.forEach((v, j) => { if (v && p.y + i >= 0) S.tablero[p.y + i][p.x + j] = p.c; }));
      const llenas = [];
      S.tablero.forEach((f, i) => { if (f.every(Boolean)) llenas.push(i); });
      if (llenas.length) {
        S.fase = "limpiando"; S.limpiando = { filas: llenas, t: 0.35 };
        llenas.forEach((i) => chispas(ox + (cs * COLS) / 2, oy + i * cs + cs / 2, "#ffcf3f", 14));
        SON.bien();
        return;
      }
      despues();
    }
    function terminarLimpieza() {
      const filas = S.limpiando.filas;
      S.limpiando = null;
      S.tablero = S.tablero.filter((_, i) => !filas.includes(i));
      while (S.tablero.length < FILAS) S.tablero.unshift(Array(COLS).fill(null));
      const n = filas.length;
      S.lineas += n; S.puntos += [0, 100, 300, 500, 800][n] || 800; M.puntos(S.puntos);
      S.intervalo = Math.max(D ? 0.2 : 0.38, S.intervalo * 0.96);
      texto(ox + (cs * COLS) / 2, oy + (FILAS * cs) / 2, n === 1 ? "¡Línea!" : `¡${n} líneas!`, "#ffcf3f", 1.4);
      M.decir(n >= 2 ? `¡${n} líneas de una! 🔥` : elegir(["¡Línea completa! 🎉", "¡Eso! Una fila menos", "¡Muy bien armado!"]));
      S.fase = "juego"; consigna();
      if (S.lineas >= META) { S.fase = "final"; SON.gana(); M.decir("¡Llegaste a la meta! 🎉"); luego(() => terminar(true), 900); return; }
      despues();
    }
    function despues() {
      S.desdePregunta++;
      if (S.desdePregunta >= CADA) { S.desdePregunta = 0; return hacerPregunta(); }
      nuevaPieza();
    }
    let pendiente = primeraPregunta;
    function hacerPregunta() {
      const q = pendiente || siguiente();
      pendiente = null;
      if (!q) return nuevaPieza();
      S.fase = "pregunta"; S.pregunta = q;
      preguntar(M, q, { D, reintentar: false, segundos: 15 }, {
        fallo: () => { S.errores++; return true; },
        fin: (acerto) => {
          if (S.fase !== "pregunta") return;
          if (acerto) {
            S.aciertos++; S.dorada = true; S.intervalo = Math.min(D ? 0.55 : 0.85, S.intervalo * 1.08);
            M.decir("¡Correcto! Te ganaste la pieza larga 💎");
          } else if (D) {
            if (!piedra()) return;
            M.decir("¡Casi! Subió una fila de piedra. ¡Tú puedes! 💪");
          } else M.decir("¡Casi! Ahora ya lo sabes para la próxima 💡");
          S.fase = "juego"; nuevaPieza();
        },
      });
    }
    /** En difícil, una respuesta equivocada sube una fila de piedra con un hueco. Devuelve false si se llenó. */
    function piedra() {
      if (S.tablero[0].some(Boolean)) { lleno(); return false; }
      S.tablero.shift();
      const fila = Array(COLS).fill(PIEDRA);
      fila[(Math.random() * COLS) | 0] = null;
      S.tablero.push(fila);
      return true;
    }
    function lleno() {
      if (D) { S.fase = "final"; M.decir("¡Los bloques llegaron arriba!"); luego(() => terminar(false), 700); return; }
      // En normal no se pierde: Lulo limpia la mitad de abajo y se sigue jugando.
      S.tablero = S.tablero.slice(0, FILAS - 9);
      while (S.tablero.length < FILAS) S.tablero.unshift(Array(COLS).fill(null));
      texto(ox + (cs * COLS) / 2, oy + (FILAS * cs) / 2, "🐬 ¡Lulo limpió!", "#7fdcff", 1.3);
      M.decir("¡Se llenó! Lulo te ayudó a limpiar. ¡Sigue! 🐬");
      S.fase = "juego"; nuevaPieza();
    }
    function consigna() { M.consigna(`🧱 Llevas ${S.lineas} de ${META} líneas`); M.barra(S.lineas / META); }

    // --- Ayudas de dibujo y efectos ---
    function chispas(x, y, color, n) {
      if (quieto()) n = Math.min(n, 4);
      for (let i = 0; i < n; i++) S.chispas.push({ x, y, vx: azar(-170, 170), vy: azar(-190, 60), t: azar(0.35, 0.7), color });
    }
    const texto = (x, y, txt, color, escala = 1) => S.textos.push({ x, y, txt, color, t: 1, escala });

    // --- Controles: botones, gestos en el tablero y teclado ---
    const ctl = M.controles(CONTROLES);
    ctl.querySelectorAll(".lg-ctl").forEach((b) => {
      const c = b.dataset.c;
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault(); b.classList.add("lg-on");
        if (c === "izq" || c === "der") { const dx = c === "izq" ? -1 : 1; mover(dx); S.mantener = { dx, t: 0.22 }; }
        else if (c === "girar") rotar();
        else soltar();
      });
      const fuera = () => { b.classList.remove("lg-on"); if (c === "izq" || c === "der") S.mantener = null; };
      b.addEventListener("pointerup", fuera); b.addEventListener("pointercancel", fuera); b.addEventListener("pointerleave", fuera);
      b.addEventListener("contextmenu", (e) => e.preventDefault());
    });
    let gesto = null;
    cv.addEventListener("pointerdown", (e) => {
      if (!activo()) return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      gesto = { x: e.clientX, y: e.clientY, t: performance.now(), pasos: 0, movio: false };
    });
    cv.addEventListener("pointermove", (e) => {
      if (!gesto) return;
      const dx = e.clientX - gesto.x, quiere = Math.trunc(dx / cs);
      while (gesto.pasos < quiere) { mover(1); gesto.pasos++; gesto.movio = true; }
      while (gesto.pasos > quiere) { mover(-1); gesto.pasos--; gesto.movio = true; }
    });
    cv.addEventListener("pointerup", (e) => {
      if (!gesto) return;
      const dy = e.clientY - gesto.y, dt = performance.now() - gesto.t;
      if (dy > cs * 2.5 && dt < 450) soltar();
      else if (!gesto.movio && Math.abs(dy) < 12) rotar();
      gesto = null;
    });
    cv.addEventListener("pointercancel", () => { gesto = null; });
    function tecla(e) {
      const v = e.type === "keydown", k = e.key;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "x", "X"].includes(k)) return;
      if (S.fase === "juego") e.preventDefault();
      if (k === "ArrowDown") { S.abajo = v; return; }
      if (!v) return;
      if (k === "ArrowLeft") mover(-1);
      else if (k === "ArrowRight") mover(1);
      else if (k === "ArrowUp" || k === "x" || k === "X") rotar();
      else soltar();
    }
    window.addEventListener("keydown", tecla); window.addEventListener("keyup", tecla);

    M.alSalir(() => {
      if (S.fase !== "fin") anotar(opts, "bloques", "logica", D, S, "salio");
      parar(); try { speechSynthesis.cancel(); } catch (e) {}
      if (opts.alSalir) opts.alSalir(); else host.innerHTML = "";
    });

    function terminar(gano) {
      if (S.fase === "fin") return;
      S.fase = "fin"; parar();
      anotar(opts, "bloques", "logica", D, S, gano ? "termino" : "perdio");
      const estrellas = gano ? estrellasDe(S.aciertos, S.aciertos + S.errores) : 0;
      if (gano && opts.alTerminar) { try { opts.alTerminar(estrellas); } catch (e) { console.error("[Learnground]", e); } }
      dibujar();
      const n = S.aciertos + S.errores;
      cierre(M, { gano, estrellas, titulo: "¡Los bloques llegaron arriba!", resumen: `Borraste ${S.lineas} ${S.lineas === 1 ? "línea" : "líneas"} y acertaste ${S.aciertos} de ${n} ${n === 1 ? "pregunta" : "preguntas"}.` }, opts, D,
        (dif) => LG.jugar("bloques", host, datos, { ...opts, dificil: dif }, true));
    }

    // --- Un paso ---
    function paso(dt) {
      S.reloj += dt;
      S.chispas.forEach((c) => { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 260 * dt; c.t -= dt; });
      S.chispas = S.chispas.filter((c) => c.t > 0);
      S.textos.forEach((t) => { t.y -= 30 * dt; t.t -= dt * 0.8; });
      S.textos = S.textos.filter((t) => t.t > 0);
      if (S.fase === "limpiando") { S.limpiando.t -= dt; if (S.limpiando.t <= 0) terminarLimpieza(); return; }
      if (!activo()) return;
      if (S.mantener) { S.mantener.t -= dt; if (S.mantener.t <= 0) { mover(S.mantener.dx); S.mantener.t = 0.09; } }
      S.caida += dt;
      const intervalo = S.abajo ? Math.min(0.05, S.intervalo) : S.intervalo;
      if (S.caida >= intervalo) {
        S.caida = 0;
        if (cabe(S.pieza.m, S.pieza.x, S.pieza.y + 1)) S.pieza.y++;
        else fijar();
      }
    }

    // --- Dibujo ---
    function celda(x, y, tam, color, alfa = 1) {
      ctx.globalAlpha = alfa;
      ctx.fillStyle = color; caja(ctx, x + 1, y + 1, tam - 2, tam - 2, Math.max(3, tam * 0.2)); ctx.fill();
      ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(x + tam * 0.22, y + tam * 0.18, tam * 0.3, tam * 0.14);
      ctx.globalAlpha = 1;
    }
    function dibujar() {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#14123a"); g.addColorStop(1, "#2f2468");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // Tablero
      ctx.fillStyle = "rgba(255,255,255,.07)"; caja(ctx, ox - 3, oy - 3, cs * COLS + 6, cs * FILAS + 6, 10); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 1;
      for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(ox + c * cs, oy); ctx.lineTo(ox + c * cs, oy + FILAS * cs); ctx.stroke(); }
      for (let f = 1; f < FILAS; f++) { ctx.beginPath(); ctx.moveTo(ox, oy + f * cs); ctx.lineTo(ox + COLS * cs, oy + f * cs); ctx.stroke(); }
      const flash = S.limpiando ? S.limpiando.filas : [];
      S.tablero.forEach((fila, f) => fila.forEach((col, c) => {
        if (!col) return;
        celda(ox + c * cs, oy + f * cs, cs, flash.includes(f) && Math.floor(S.reloj * 20) % 2 ? "#ffffff" : col);
      }));
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; caja(ctx, ox - 3, oy - 3, cs * COLS + 6, cs * FILAS + 6, 10); ctx.stroke();
      // Pieza y su sombra (dónde va a caer)
      const p = S.pieza;
      if (p && S.fase === "juego") {
        let gy = p.y;
        while (cabe(p.m, p.x, gy + 1)) gy++;
        p.m.forEach((f, i) => f.forEach((v, j) => { if (v && gy + i >= 0) celda(ox + (p.x + j) * cs, oy + (gy + i) * cs, cs, p.c, 0.25); }));
        p.m.forEach((f, i) => f.forEach((v, j) => { if (v && p.y + i >= 0) celda(ox + (p.x + j) * cs, oy + (p.y + i) * cs, cs, p.c); }));
      }
      // Panel: siguiente, líneas y cuánto falta para la pregunta
      const pw = 84, px = panel + pw / 2;
      ctx.fillStyle = "#ffffff"; ctx.font = `800 13px ${FUENTE}`; ctx.fillText("Siguiente", px, oy + 12);
      ctx.fillStyle = "rgba(255,255,255,.1)"; caja(ctx, panel, oy + 24, pw, 64, 10); ctx.fill();
      const tSig = S.dorada ? "I" : S.proxima;
      if (tSig) {
        const m = PIEZAS[tSig].m, t = Math.min(16, Math.floor((pw - 12) / 4));
        const x0 = px - (m[0].length * t) / 2, y0 = oy + 56 - (m.length * t) / 2;
        m.forEach((f, i) => f.forEach((v, j) => { if (v) celda(x0 + j * t, y0 + i * t, t, PIEZAS[tSig].c); }));
        if (S.dorada) { ctx.font = `18px ${EMOJI}`; ctx.fillText("💎", panel + pw - 8, oy + 30); }
      }
      ctx.fillStyle = "#ffffff"; ctx.font = `800 13px ${FUENTE}`; ctx.fillText("Líneas", px, oy + 108);
      ctx.font = `800 26px ${FUENTE}`; ctx.fillStyle = "#ffcf3f"; ctx.fillText(`${S.lineas}/${META}`, px, oy + 132);
      ctx.fillStyle = "#ffffff"; ctx.font = `800 13px ${FUENTE}`; ctx.fillText("Pregunta en", px, oy + 164);
      for (let i = 0; i < CADA; i++) {
        ctx.fillStyle = i < S.desdePregunta ? "#35b862" : "rgba(255,255,255,.25)";
        ctx.beginPath(); ctx.arc(px - 20 + i * 20, oy + 184, 6, 0, 7); ctx.fill();
      }
      if (H > 260) { ctx.font = `30px ${EMOJI}`; ctx.fillText("🧱", px, oy + 222); }
      // Efectos
      S.chispas.forEach((c) => { ctx.globalAlpha = Math.max(0, Math.min(1, c.t * 2)); ctx.fillStyle = c.color; ctx.fillRect(c.x - 3, c.y - 3, 6, 6); });
      ctx.globalAlpha = 1;
      S.textos.forEach((t) => {
        ctx.globalAlpha = Math.max(0, Math.min(1, t.t * 1.5));
        const [fs, tx] = ajustar(ctx, t.txt, cs * COLS - 8, Math.round(20 * t.escala));
        ctx.font = `800 ${fs}px ${FUENTE}`; ctx.lineWidth = 4; ctx.strokeStyle = "#1f2544";
        ctx.strokeText(tx, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(tx, t.x, t.y);
      });
      ctx.globalAlpha = 1;
    }

    function cuadro(t) {
      if (!cv.isConnected) return parar();
      if (parado) return;
      raf = requestAnimationFrame(cuadro);
      if (document.hidden) { ultimo = t; return; }
      const dt = Math.min(0.05, ultimo ? (t - ultimo) / 1000 : 0);
      ultimo = t;
      paso(dt); dibujar();
    }
    raf = requestAnimationFrame(cuadro);

    consigna();
    M.decir(D ? "¡Modo difícil! ¿Aceptas el reto? 🔥" : `¡Hola, ${nino(opts).nombre}! Soy Lulo 🐬 ¡A armar filas!`);
    presentar(M, INFO_BLOQUES, D, rapido, () => {
      S.fase = "juego"; S.inicio = Date.now();
      nuevaPieza();
      M.decir("Llena filas completas para borrarlas 🧱");
    });
  }

  // =====================================================================
  // 🍄 Plataformas (tipo Mario)
  // datos = { titulo?: "🍄 El camino de las tablas",
  //           preguntas: [..] | () => [{ pregunta, opciones, correcta, explicacion?, pista? }],
  //           enemigos?: ["🐢", "🐌"] }
  // El héroe corre solo y el niño salta: huecos, enemigos (se vencen saltándoles encima),
  // estrellas y escalones. Las puertas con candado se abren respondiendo bien; al final, la bandera.
  // =====================================================================
  const INFO_PLATAFORMAS = {
    icono: "🍄", nombre: "Plataformas",
    como: "Tu héroe corre solo: toca la pantalla para saltar los huecos y los enemigos (¡caerles encima los vence!). Las puertas con candado se abren respondiendo bien.",
    dificil: "Más rápido y con 3 corazones: los enemigos, los huecos y las respuestas equivocadas te quitan uno.",
    teclas: "Con teclado: espacio o ↑ para saltar.",
  };

  function plataformas(host, datos, opts, rapido) {
    const D = !!opts.dificil;
    const siguiente = cola(datos.preguntas, D);
    const primeraPregunta = siguiente();
    if (!primeraPregunta) throw new Error("Plataformas necesita preguntas con pregunta, opciones y correcta.");
    const ENEMIGOS = Array.isArray(datos.enemigos) && datos.enemigos.length ? datos.enemigos : ["🐢", "🐌", "🦀", "👾"];
    const PUERTAS = D ? 8 : 6, VEL = D ? 215 : 165, G = 1700, SALTO = 640;
    const heroe = nino(opts);
    const M = marco(host, datos.titulo || "🍄 Plataformas");
    const CONTROLES = `<button class="lg-ctl lg-ancho" data-c="saltar">⬆️ ¡Saltar!</button>`;
    M.controles(CONTROLES); // antes de medir: cuentan en el alto
    const cv = document.createElement("canvas");
    cv.setAttribute("aria-label", "Camino de plataformas");
    M.zona.prepend(cv);
    const ctx = cv.getContext("2d");

    let W = 340;
    const H = altoDisponible(M, 230, 420);
    const gy = H - 56; // altura del piso
    function medir() {
      W = M.zona.clientWidth || 340;
      const r = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * r); cv.height = Math.round(H * r); cv.style.height = H + "px";
      ctx.setTransform(r, 0, 0, r, 0, 0);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
    }
    medir();

    // --- El camino ---
    function construir() {
      const m = { suelo: [], plataformas: [], estrellas: [], enemigos: [], puertas: [], fin: 0, nubes: [] };
      let x = 0;
      // Tramos seguidos se unen en uno solo (así no se ven rayas en el piso)
      const tierra = (largo) => { const u = m.suelo[m.suelo.length - 1]; if (u && u[1] === x) u[1] = x + largo; else m.suelo.push([x, x + largo]); x += largo; };
      const arco = (cx, n, alto) => { for (let j = 0; j < n; j++) m.estrellas.push({ x: cx + (j - (n - 1) / 2) * 34, y: gy - alto - Math.sin((j / Math.max(1, n - 1)) * Math.PI) * 30, tomada: false }); };
      tierra(460);
      for (let i = 0; i < PUERTAS; i++) {
        const tramos = D ? 3 : 2;
        for (let k = 0; k < tramos; k++) {
          const tipo = i === 0 && k === 0 ? "estrellas" : elegir(["hueco", "enemigo", "estrellas", "escalon", "hueco", "enemigo"]);
          const x0 = x;
          if (tipo === "hueco") {
            const ancho = D ? azar(80, 118) : azar(60, 92);
            x += ancho; arco(x0 + ancho / 2, 3, 60); tierra(250);
          } else if (tipo === "enemigo") {
            tierra(330); m.enemigos.push({ x: x0 + 230, base: x0 + 230, dir: -1, vivo: true, emoji: elegir(ENEMIGOS) });
          } else if (tipo === "estrellas") {
            tierra(270); arco(x0 + 135, 4, 34);
          } else {
            tierra(350); m.plataformas.push({ x: x0 + 110, y: gy - 84, w: 130 }); arco(x0 + 175, 3, 84 + 34);
          }
        }
        const x0 = x;
        tierra(300); m.puertas.push({ x: x0 + 170, abierta: false, sube: 0 });
      }
      const x0 = x;
      tierra(620); m.fin = x0 + 300;
      for (let n = 0; n < Math.ceil(m.fin / 260) + 4; n++) m.nubes.push({ x: n * 260 + azar(0, 120), y: azar(24, gy * 0.4) });
      return m;
    }
    const mundo = construir();
    const haySuelo = (x) => mundo.suelo.some(([a, b]) => x + 10 > a && x - 10 < b);
    const tramoEn = (x) => mundo.suelo.find(([a, b]) => x >= a && x <= b);

    const P = { x: 120, y: gy, vy: 0, enSuelo: true, aire: 0 };
    const S = {
      fase: "intro", P, mundo, gy, aciertos: 0, errores: 0, escapados: 0, puntos: 0,
      vidas: D ? 3 : 0, invulnerable: 0, empuje: 0, bufer: 0, seguro: 120, abiertas: 0, caidas: {},
      pregunta: null, chispas: [], textos: [], reloj: 0, inicio: 0, anotado: false, haySuelo,
    };
    window.LG._estado = S; // solo para las pruebas automáticas

    const timers = [];
    let raf = 0, ultimo = 0, parado = false;
    const luego = (fn, ms) => timers.push(setTimeout(() => { if (!parado && cv.isConnected) fn(); }, ms));
    function parar() {
      parado = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout);
      window.removeEventListener("keydown", tecla); window.removeEventListener("resize", medir);
    }
    window.addEventListener("resize", medir);

    // --- Saltar: tocar la pantalla, el botón o el teclado ---
    function saltar() {
      if (S.fase !== "juego") return;
      if (P.enSuelo || P.aire < 0.09) { P.vy = -SALTO; P.enSuelo = false; P.aire = 1; tono([520, 780], 0.08, "triangle", 0.05, 0.07); }
      else S.bufer = 0.14; // si toca un poquito antes de caer, salta al aterrizar
    }
    S._saltar = saltar; // solo para las pruebas automáticas
    cv.addEventListener("pointerdown", (e) => { if (S.fase !== "juego") return; e.preventDefault(); saltar(); });
    const ctl = M.controles(CONTROLES);
    const bSaltar = ctl.querySelector("[data-c]");
    bSaltar.addEventListener("pointerdown", (e) => { e.preventDefault(); bSaltar.classList.add("lg-on"); saltar(); });
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) => bSaltar.addEventListener(t, () => bSaltar.classList.remove("lg-on")));
    bSaltar.addEventListener("contextmenu", (e) => e.preventDefault());
    function tecla(e) {
      if (![" ", "ArrowUp", "w", "W"].includes(e.key)) return;
      if (S.fase === "juego") { e.preventDefault(); if (!e.repeat) saltar(); }
    }
    window.addEventListener("keydown", tecla);

    M.alSalir(() => {
      if (S.fase !== "fin") anotar(opts, "plataformas", "coordinacion", D, S, "salio");
      parar(); try { speechSynthesis.cancel(); } catch (e) {}
      if (opts.alSalir) opts.alSalir(); else host.innerHTML = "";
    });

    // --- Ayudas ---
    function chispas(x, y, color, n) {
      if (quieto()) n = Math.min(n, 4);
      for (let i = 0; i < n; i++) S.chispas.push({ x, y, vx: azar(-160, 160), vy: azar(-220, 40), t: azar(0.35, 0.7), color });
    }
    const texto = (x, y, txt, color, escala = 1) => S.textos.push({ x, y, txt, color, t: 1, escala });
    function consigna() { M.consigna(`🔒 Puertas abiertas: ${S.abiertas} de ${PUERTAS}`); }
    function perderVida() {
      if (!D) return;
      S.vidas--; M.vidas(S.vidas, 3);
      if (S.vidas <= 0 && S.fase !== "fin" && S.fase !== "final") { S.fase = "final"; luego(() => terminar(false), 800); }
    }
    function golpe(msg) {
      if (S.invulnerable > 0) return;
      S.invulnerable = 1.3; S.empuje = 0.22; SON.mal(); M.decir(msg);
      perderVida();
    }
    function caida() {
      SON.mal();
      perderVida();
      if (S.fase === "final") return;
      // En normal, si se cae dos veces en el mismo hueco, Lulo le pone un puente.
      const antes = tramoEn(S.seguro);
      if (!D && antes) {
        S.caidas[antes[1]] = (S.caidas[antes[1]] || 0) + 1;
        const despues = mundo.suelo.find(([a]) => a > antes[1]);
        if (S.caidas[antes[1]] >= 2 && despues) {
          antes[1] = despues[1]; mundo.suelo.splice(mundo.suelo.indexOf(despues), 1);
          P.x = Math.max(60, S.seguro - 170); P.y = gy; P.vy = 0; P.enSuelo = true; S.invulnerable = 1.3;
          M.decir("🌉 Lulo te puso un puente. ¡En el próximo hueco salta un poquito antes!");
          return;
        }
      }
      // Reaparece bien atrás de la orilla para alcanzar a tomar impulso
      const t = tramoEn(S.seguro);
      P.x = t ? Math.max(t[0] + 20, S.seguro - 170) : Math.max(60, S.seguro - 170);
      P.y = gy; P.vy = 0; P.enSuelo = true;
      S.invulnerable = 1.3;
      M.decir("¡Uy, te caíste! Lulo te rescató 🐬 Salta un poquito antes del hueco.");
    }
    function puertaCerrada(puerta) {
      const q = pendiente || siguiente();
      pendiente = null;
      if (!q) { abrir(puerta); return; }
      S.fase = "pregunta"; S.pregunta = q;
      preguntar(M, q, { D, reintentar: true, titulo: "🔒 ¡Responde para abrir la puerta!", segundos: 20 }, {
        fallo: (primera) => { if (primera) S.errores++; perderVida(); return S.fase !== "final"; },
        fin: (acerto, primera) => {
          if (S.fase !== "pregunta") return;
          if (primera) S.aciertos++;
          M.decir(primera ? elegir(BIEN).replace("{n}", heroe.nombre) + " 🔓" : "¡Lo lograste! Ahora ya lo sabes 💡");
          abrir(puerta);
        },
      });
    }
    let pendiente = primeraPregunta;
    function abrir(puerta) {
      puerta.abierta = true; S.abiertas++; S.puntos += 30; M.puntos(S.puntos);
      SON.gana(); chispas(puerta.x - (P.x - W * 0.28), gy - 70, "#ffcf3f", 18);
      S.fase = "juego"; consigna();
    }

    function terminar(gano) {
      if (S.fase === "fin") return;
      S.fase = "fin"; parar();
      anotar(opts, "plataformas", "coordinacion", D, S, gano ? "termino" : "perdio");
      const estrellas = gano ? estrellasDe(S.aciertos, S.aciertos + S.errores) : 0;
      if (gano && opts.alTerminar) { try { opts.alTerminar(estrellas); } catch (e) { console.error("[Learnground]", e); } }
      dibujar();
      cierre(M, { gano, estrellas, resumen: `Abriste ${S.abiertas} de ${PUERTAS} puertas y ${S.aciertos === 1 ? "acertaste 1 a la primera" : `acertaste ${S.aciertos} a la primera`}.` }, opts, D,
        (dif) => LG.jugar("plataformas", host, datos, { ...opts, dificil: dif }, true));
    }

    // --- Un paso ---
    function paso(dt) {
      S.reloj += dt;
      S.chispas.forEach((c) => { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; c.t -= dt; });
      S.chispas = S.chispas.filter((c) => c.t > 0);
      S.textos.forEach((t) => { t.y -= 34 * dt; t.t -= dt * 0.8; });
      S.textos = S.textos.filter((t) => t.t > 0);
      mundo.puertas.forEach((p) => { if (p.abierta && p.sube < 1) p.sube = Math.min(1, p.sube + dt * 1.6); });
      if (S.fase !== "juego") return;
      if (S.invulnerable > 0) S.invulnerable -= dt;
      if (S.bufer > 0) S.bufer -= dt;

      // Avanzar (se detiene frente a una puerta cerrada)
      let vx = VEL;
      if (S.empuje > 0) { vx = -140; S.empuje -= dt; }
      P.x += vx * dt;
      const puerta = mundo.puertas.find((p) => !p.abierta && P.x > p.x - 60 && P.x < p.x + 10);
      if (puerta && P.x > puerta.x - 26) {
        P.x = puerta.x - 26;
        if (P.enSuelo) { puertaCerrada(puerta); return; }
      }

      // Caer y aterrizar
      const pie0 = P.y;
      P.vy += G * dt; P.y += P.vy * dt;
      const estabaEnSuelo = P.enSuelo;
      P.enSuelo = false;
      for (const pl of mundo.plataformas) {
        if (P.vy >= 0 && pie0 <= pl.y + 1 && P.y >= pl.y && P.x + 12 > pl.x && P.x - 12 < pl.x + pl.w) { P.y = pl.y; P.vy = 0; P.enSuelo = true; }
      }
      if (!P.enSuelo && haySuelo(P.x) && P.vy >= 0 && pie0 <= gy + 2 && P.y >= gy) { P.y = gy; P.vy = 0; P.enSuelo = true; }
      // Si cayó por debajo del piso, la orilla del siguiente tramo es una pared
      if (P.y > gy + 2) { const t = tramoEn(P.x); if (t) P.x = t[0] - 11; }
      if (P.enSuelo) {
        P.aire = 0;
        if (P.y === gy && tramoEn(P.x)) S.seguro = P.x;
        if (!estabaEnSuelo) tono([300], 0.04, "sine", 0, 0.04);
        if (S.bufer > 0) { S.bufer = 0; saltar(); }
      } else P.aire += dt;
      if (P.y > H + 80) { caida(); return; }

      // Estrellas
      for (const e of mundo.estrellas) {
        if (!e.tomada && Math.abs(e.x - P.x) < 24 && Math.abs(e.y - (P.y - 20)) < 28) {
          e.tomada = true; S.puntos += 5; M.puntos(S.puntos); tono([1046, 1318], 0.06, "triangle", 0.05, 0.06);
          chispas(e.x - (P.x - W * 0.28), e.y, "#ffcf3f", 6);
        }
      }
      // Enemigos: van y vienen; caerles encima los vence
      for (const e of mundo.enemigos) {
        if (!e.vivo) continue;
        e.x += e.dir * 45 * dt;
        if (Math.abs(e.x - e.base) > 60) e.dir *= -1;
        if (Math.abs(e.x - P.x) < 27 && P.y > gy - 30 && P.y - 40 < gy) {
          if (P.vy > 0 && pie0 <= gy - 16) {
            e.vivo = false; P.vy = -430; S.puntos += 20; M.puntos(S.puntos); SON.golpe();
            chispas(e.x - (P.x - W * 0.28), gy - 15, "#ffffff", 14); texto(e.x - (P.x - W * 0.28), gy - 50, "¡Pum! +20", "#ffcf3f");
            M.decir(elegir(["¡Pisotón! 🍄", "¡Le caíste encima! 💥", "¡Bien saltado!"]));
          } else golpe("¡Uy, te tocó! Sáltalo y cáele encima 🍄");
        }
      }
      // Meta
      if (P.x >= mundo.fin) {
        S.fase = "final"; SON.gana();
        chispas(W * 0.28, gy - 80, "#ffcf3f", 30); chispas(W * 0.28, gy - 80, "#ff6b9a", 20);
        M.barra(1); M.decir("¡Llegaste a la meta! 🎉");
        luego(() => terminar(true), 1300);
        return;
      }
      M.barra(P.x / mundo.fin);
    }

    // --- Dibujo ---
    function dibujar() {
      const cam = P.x - W * 0.28;
      const cielo = ctx.createLinearGradient(0, 0, 0, H);
      cielo.addColorStop(0, "#7fc8ff"); cielo.addColorStop(1, "#e3f5ff");
      ctx.fillStyle = cielo; ctx.fillRect(0, 0, W, H);
      // Nubes y colinas (se mueven más despacio: dan profundidad)
      ctx.font = `34px ${EMOJI}`;
      mundo.nubes.forEach((n) => { const x = n.x - cam * 0.3; if (x > -60 && x < W + 60) ctx.fillText("☁️", x, n.y); });
      ctx.fillStyle = "#a8e59b";
      for (let i = -1; i < W / 220 + 2; i++) {
        const x = i * 220 - ((cam * 0.5) % 220);
        ctx.beginPath(); ctx.ellipse(x + 110, gy + 10, 130, 70, 0, Math.PI, 0); ctx.fill();
      }
      // Piso
      for (const [a, b] of mundo.suelo) {
        const x0 = a - cam, x1 = b - cam;
        if (x1 < -10 || x0 > W + 10) continue;
        ctx.fillStyle = "#b5763c"; ctx.fillRect(x0, gy, x1 - x0, H - gy);
        ctx.fillStyle = "#5cc85a"; ctx.fillRect(x0, gy, x1 - x0, 12);
        ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x0, H); ctx.lineTo(x0, gy); ctx.lineTo(x1, gy); ctx.lineTo(x1, H); ctx.stroke();
      }
      // Escalones
      for (const pl of mundo.plataformas) {
        const x = pl.x - cam; if (x > W + 10 || x + pl.w < -10) continue;
        ctx.fillStyle = "#d9883b"; caja(ctx, x, pl.y, pl.w, 20, 6); ctx.fill();
        ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = "rgba(31,37,68,.35)"; ctx.lineWidth = 2;
        for (let i = 1; i < pl.w / 26; i++) { ctx.beginPath(); ctx.moveTo(x + i * 26, pl.y + 3); ctx.lineTo(x + i * 26, pl.y + 17); ctx.stroke(); }
      }
      // Estrellas
      ctx.font = `22px ${EMOJI}`;
      mundo.estrellas.forEach((e) => { if (e.tomada) return; const x = e.x - cam; if (x > -20 && x < W + 20) ctx.fillText("⭐", x, e.y + Math.sin(S.reloj * 4 + e.x) * 3); });
      // Puertas
      mundo.puertas.forEach((p) => {
        const x = p.x - cam; if (x < -40 || x > W + 40 || p.sube >= 1) return;
        const y = gy - 130 - p.sube * 150;
        ctx.fillStyle = "#a0522d"; caja(ctx, x - 4, y, 34, 130, 6); ctx.fill();
        ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = "rgba(31,37,68,.4)"; ctx.lineWidth = 2;
        for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x - 4, y + i * 22); ctx.lineTo(x + 30, y + i * 22); ctx.stroke(); }
        ctx.font = `22px ${EMOJI}`; ctx.fillText(p.abierta ? "🔓" : "🔒", x + 13, y + 48);
        ctx.fillStyle = "#ffcf3f"; ctx.font = `800 26px ${FUENTE}`; ctx.fillText("?", x + 13, y + 84);
      });
      // Meta
      const fx = mundo.fin - cam;
      if (fx < W + 120) {
        ctx.font = `70px ${EMOJI}`; ctx.fillText("🏰", fx + 90, gy - 34);
        ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx, gy); ctx.lineTo(fx, gy - 150); ctx.stroke();
        ctx.font = `34px ${EMOJI}`; ctx.fillText("🚩", fx + 14, gy - 140);
      }
      // Enemigos
      ctx.font = `30px ${EMOJI}`;
      mundo.enemigos.forEach((e) => {
        if (!e.vivo) return; const x = e.x - cam; if (x < -30 || x > W + 30) return;
        ctx.save(); ctx.translate(x, gy - 16); if (e.dir > 0) ctx.scale(-1, 1); ctx.fillText(e.emoji, 0, 0); ctx.restore();
      });
      // Héroe
      if (!(S.invulnerable > 0 && Math.floor(S.invulnerable * 10) % 2)) {
        const x = W * 0.28, bob = P.enSuelo && S.fase === "juego" ? Math.abs(Math.sin(S.reloj * 14)) * 3 : 0, cy = P.y - 21 - bob;
        ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(x, Math.min(P.y, gy) + 2, 15, 4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = heroe.color; ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, cy, 19, 0, 7); ctx.fill(); ctx.stroke();
        ctx.font = `24px ${EMOJI}`; ctx.fillText(heroe.emoji, x, cy + 1);
      }
      // Efectos
      S.chispas.forEach((c) => { ctx.globalAlpha = Math.max(0, Math.min(1, c.t * 2)); ctx.fillStyle = c.color; ctx.fillRect(c.x - 3, c.y - 3, 6, 6); });
      ctx.globalAlpha = 1;
      S.textos.forEach((t) => {
        ctx.globalAlpha = Math.max(0, Math.min(1, t.t * 1.5));
        const [fs, tx] = ajustar(ctx, t.txt, W - 24, Math.round(18 * t.escala));
        ctx.font = `800 ${fs}px ${FUENTE}`; ctx.lineWidth = 4; ctx.strokeStyle = "#1f2544";
        ctx.strokeText(tx, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(tx, t.x, t.y);
      });
      ctx.globalAlpha = 1;
    }

    function cuadro(t) {
      if (!cv.isConnected) return parar();
      if (parado) return;
      raf = requestAnimationFrame(cuadro);
      if (document.hidden) { ultimo = t; return; }
      const dt = Math.min(0.04, ultimo ? (t - ultimo) / 1000 : 0);
      ultimo = t;
      paso(dt); dibujar();
    }
    raf = requestAnimationFrame(cuadro);

    consigna();
    if (D) M.vidas(3, 3);
    M.decir(D ? "¡Modo difícil! ¿Aceptas el reto? 🔥" : `¡Hola, ${heroe.nombre}! Soy Lulo 🐬 ¡A correr!`);
    presentar(M, INFO_PLATAFORMAS, D, rapido, () => {
      S.fase = "juego"; S.inicio = Date.now();
      M.decir("¡Toca la pantalla para saltar! ⬆️");
    });
  }

  // ---------- Base de los juegos con lienzo (reloj, efectos y salida) ----------
  /**
   * Arma lo que comparten culebrita y rompe-ladrillos: lienzo, reloj de cuadros, chispas,
   * textos flotantes, salir con ←, fin con estrellas y registro.
   */
  function baseLienzo(host, M, tipo, hab, D, S, opts, datos, alto) {
    const cv = document.createElement("canvas");
    M.zona.prepend(cv);
    const ctx = cv.getContext("2d");
    const B = { cv, ctx, W: 340, H: alto, parado: false, timers: [], quitar: [] };
    B.medir = () => {
      B.W = M.zona.clientWidth || 340;
      const r = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(B.W * r); cv.height = Math.round(B.H * r); cv.style.height = B.H + "px";
      ctx.setTransform(r, 0, 0, r, 0, 0);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
    };
    B.medir();
    B.escuchar = (obj, ev, fn) => { obj.addEventListener(ev, fn); B.quitar.push(() => obj.removeEventListener(ev, fn)); };
    B.luego = (fn, ms) => B.timers.push(setTimeout(() => { if (!B.parado && cv.isConnected) fn(); }, ms));
    B.parar = () => { B.parado = true; cancelAnimationFrame(B.raf); B.timers.forEach(clearTimeout); B.quitar.forEach((f) => f()); };
    B.chispas = (x, y, color, n) => {
      if (quieto()) n = Math.min(n, 4);
      for (let i = 0; i < n; i++) S.chispas.push({ x, y, vx: azar(-170, 170), vy: azar(-190, 80), t: azar(0.35, 0.7), color });
    };
    B.texto = (x, y, txt, color, escala = 1) => S.textos.push({ x, y, txt, color, t: 1, escala });
    B.efectos = (dt) => {
      S.chispas.forEach((c) => { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 280 * dt; c.t -= dt; });
      S.chispas = S.chispas.filter((c) => c.t > 0);
      S.textos.forEach((t) => { t.y -= 34 * dt; t.t -= dt * 0.8; });
      S.textos = S.textos.filter((t) => t.t > 0);
    };
    B.dibujarEfectos = () => {
      S.chispas.forEach((c) => { ctx.globalAlpha = Math.max(0, Math.min(1, c.t * 2)); ctx.fillStyle = c.color; ctx.fillRect(c.x - 3, c.y - 3, 6, 6); });
      ctx.globalAlpha = 1;
      S.textos.forEach((t) => {
        ctx.globalAlpha = Math.max(0, Math.min(1, t.t * 1.5));
        const [fs, tx] = ajustar(ctx, t.txt, B.W - 24, Math.round(18 * t.escala));
        ctx.font = `800 ${fs}px ${FUENTE}`; ctx.lineWidth = 4; ctx.strokeStyle = "#1f2544";
        ctx.strokeText(tx, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(tx, t.x, t.y);
      });
      ctx.globalAlpha = 1;
    };
    B.arrancar = (paso, dibujar) => {
      let ultimo = 0;
      const cuadro = (t) => {
        if (!cv.isConnected) return B.parar();
        if (B.parado) return;
        B.raf = requestAnimationFrame(cuadro);
        if (document.hidden) { ultimo = t; return; }
        const dt = Math.min(0.05, ultimo ? (t - ultimo) / 1000 : 0);
        ultimo = t;
        paso(dt); dibujar();
      };
      B.raf = requestAnimationFrame(cuadro);
    };
    B.escuchar(window, "resize", () => { if (cv.isConnected) B.medir(); });
    M.alSalir(() => {
      if (S.fase !== "fin") anotar(opts, tipo, hab, D, S, "salio");
      B.parar(); try { speechSynthesis.cancel(); } catch (e) {}
      if (opts.alSalir) opts.alSalir(); else host.innerHTML = "";
    });
    B.terminar = (gano, resumen, titulo, dibujar) => {
      if (S.fase === "fin") return;
      S.fase = "fin"; B.parar();
      anotar(opts, tipo, hab, D, S, gano ? "termino" : "perdio");
      const estrellas = gano ? estrellasDe(S.aciertos, S.aciertos + S.errores + S.escapados) : 0;
      if (gano && opts.alTerminar) { try { opts.alTerminar(estrellas); } catch (e) { console.error("[Learnground]", e); } }
      if (dibujar) dibujar();
      cierre(M, { gano, estrellas, resumen, titulo }, opts, D, (dif) => LG.jugar(tipo, host, datos, { ...opts, dificil: dif }, true));
    };
    B.perderVida = () => {
      if (!D) return;
      S.vidas--; M.vidas(S.vidas, 3);
      if (S.vidas <= 0 && S.fase !== "fin" && S.fase !== "final") { S.fase = "final"; B.luego(() => B.terminar(false, S.resumenPerdio ? S.resumenPerdio() : ""), 800); }
    };
    return B;
  }

  /** Rondas con misión (las usa la nave y la culebrita): { consigna, bien, mal, explica? }. */
  const rondasValidas = (datos) => (datos.rondas || []).filter((r) => r && r.consigna && r.bien != null && r.mal != null);

  // =====================================================================
  // 🐍 Culebrita
  // datos = { titulo?: "🐍 La culebrita de las tablas",
  //           rondas: [{ consigna, bien: [..] | () => "12", mal: [..] | () => "7", explica? }] }
  // Se come solo lo que pide la misión: los aciertos la hacen crecer.
  // Normal: atraviesa las paredes y no hay vidas. Difícil: paredes, más rápida y 3 corazones.
  // =====================================================================
  const INFO_CULEBRITA = {
    icono: "🐍", nombre: "Culebrita",
    como: "Desliza el dedo para girar la culebrita. Cómete SOLO lo que dice arriba: cada acierto la hace crecer.",
    dificil: "Más rápida, con paredes y 3 corazones: comerte el que no es o chocar te quita uno.",
    teclas: "Con teclado: las flechas.",
  };

  function culebrita(host, datos, opts, rapido) {
    const D = !!opts.dificil;
    const rondas = rondasValidas(datos);
    if (!rondas.length) throw new Error("La culebrita necesita al menos una ronda con consigna, bien y mal.");
    const META = D ? 6 : 5;
    const heroe = nino(opts);
    const M = marco(host, datos.titulo || "🐍 Culebrita");
    const CONTROLES = `<button class="lg-ctl" data-d="-1,0" aria-label="Izquierda">⬅️</button><button class="lg-ctl" data-d="0,-1" aria-label="Arriba">⬆️</button>
      <button class="lg-ctl" data-d="0,1" aria-label="Abajo">⬇️</button><button class="lg-ctl" data-d="1,0" aria-label="Derecha">➡️</button>`;
    M.controles(CONTROLES); // antes de medir: cuentan en el alto
    const alto = altoDisponible(M, 210, 470);
    const S = {
      fase: "intro", ronda: 0, progreso: 0, aciertos: 0, errores: 0, escapados: 0, puntos: 0, vidas: D ? 3 : 0,
      cuerpo: [], dir: { x: 1, y: 0 }, cola: [], comida: [], reloj: 0, paso: 0, chispas: [], textos: [], inicio: 0, anotado: false,
      resumenPerdio: () => `Te comiste ${S.aciertos} ${S.aciertos === 1 ? "correcto" : "correctos"}.`,
    };
    window.LG._estado = S; // solo para las pruebas automáticas
    const B = baseLienzo(host, M, "culebrita", "atencion", D, S, opts, datos, alto);
    B.cv.setAttribute("aria-label", "Tablero de la culebrita");
    let tam = 34, COLS = 10, FILAS = 9, ox = 0, oy = 0;
    function cuadricula() {
      tam = Math.max(26, Math.floor(B.W / (B.W < 460 ? 9.5 : 14)));
      COLS = Math.floor(B.W / tam); FILAS = Math.floor(B.H / tam);
      ox = Math.floor((B.W - COLS * tam) / 2); oy = Math.floor((B.H - FILAS * tam) / 2);
      S.COLS = COLS; S.FILAS = FILAS;
    }
    cuadricula();
    const intervalo = () => (D ? 0.15 : 0.23) * Math.max(0.75, 1 - S.ronda * 0.06);

    function reiniciarCuerpo() {
      const y = Math.floor(FILAS / 2), x = Math.floor(COLS / 3);
      S.cuerpo = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
      S.dir = { x: 1, y: 0 }; S.cola = [];
    }
    const ocupada = (x, y) => S.cuerpo.some((c) => c.x === x && c.y === y) || S.comida.some((c) => c.x === x && c.y === y);
    function ponerComida() {
      const r = rondas[S.ronda];
      while (S.comida.length < 3) {
        // Siempre hay al menos una correcta y una que no: así el niño tiene que pensar
        const bueno = !S.comida.some((c) => c.bueno) ? true : !S.comida.some((c) => !c.bueno) ? false : Math.random() < 0.45;
        let txt = "", g = 0;
        do { txt = String(sacar(bueno ? r.bien : r.mal) ?? ""); } while ((!txt || S.comida.some((c) => c.txt === txt)) && g++ < 10);
        if (!txt) return;
        const cab = S.cuerpo[0];
        let x, y, h = 0;
        do { x = (Math.random() * COLS) | 0; y = (Math.random() * FILAS) | 0; }
        while ((ocupada(x, y) || Math.abs(x - cab.x) + Math.abs(y - cab.y) < 3) && h++ < 200);
        S.comida.push({ x, y, txt, bueno });
      }
    }
    function girar(dx, dy) {
      if (S.fase !== "juego") return;
      const ult = S.cola.length ? S.cola[S.cola.length - 1] : S.dir;
      if ((dx && ult.x === -dx) || (dy && ult.y === -dy) || (ult.x === dx && ult.y === dy)) return;
      if (S.cola.length < 2) S.cola.push({ x: dx, y: dy });
    }
    S._girar = girar; // solo para las pruebas automáticas
    function avanzar() {
      if (S.cola.length) S.dir = S.cola.shift();
      const cab = S.cuerpo[0];
      let x = cab.x + S.dir.x, y = cab.y + S.dir.y;
      if (x < 0 || y < 0 || x >= COLS || y >= FILAS) {
        if (D) return choque("¡Uy, la pared! Gira antes de llegar 🧱");
        x = (x + COLS) % COLS; y = (y + FILAS) % FILAS;
      }
      const choca = S.cuerpo.findIndex((c, i) => i < S.cuerpo.length - 1 && c.x === x && c.y === y);
      if (choca >= 0) {
        if (D) return choque("¡Te mordiste la cola! 🐍");
        S.cuerpo = S.cuerpo.slice(0, Math.max(3, choca));
        M.decir("¡Uy, te mordiste la cola! Se hizo más cortita, ¡sigue! 🐍");
        SON.mal();
      }
      S.cuerpo.unshift({ x, y });
      const i = S.comida.findIndex((c) => c.x === x && c.y === y);
      if (i < 0) { S.cuerpo.pop(); return; }
      const c = S.comida.splice(i, 1)[0], px = ox + x * tam + tam / 2, py = oy + y * tam + tam / 2;
      if (c.bueno) {
        S.aciertos++; S.progreso++; S.puntos += 10; M.puntos(S.puntos); SON.bien();
        B.chispas(px, py, "#35b862", 14); B.texto(px, py - 16, "+10", "#7fffa0");
        M.decir(elegir(BIEN).replace("{n}", heroe.nombre));
        barra();
        if (S.progreso >= META) return rondaCompleta();
      } else {
        S.errores++; S.cuerpo.pop(); if (S.cuerpo.length > 3) S.cuerpo.pop();
        SON.mal(); B.chispas(px, py, "#ff6b9a", 10); B.texto(px, py - 16, "¡Ese no!", "#ffb3c8");
        const r = rondas[S.ronda];
        M.decir(`¡Casi! «${c.txt}» no va en esta ronda.` + (r.explica && !D ? " " + r.explica : ""));
        B.perderVida();
      }
      ponerComida();
    }
    function choque(msg) {
      SON.mal(); M.decir(msg);
      B.perderVida();
      if (S.fase === "final") return;
      reiniciarCuerpo(); S.comida = []; ponerComida(); S.paso = -0.6;
    }
    function barra() { M.barra((S.ronda + S.progreso / META) / rondas.length); }
    function rondaCompleta() {
      S.fase = "pausa"; SON.gana();
      B.texto(B.W / 2, B.H / 2, `¡Ronda ${S.ronda + 1} completa! 🎉`, "#ffcf3f", 1.4);
      const ultima = S.ronda >= rondas.length - 1;
      M.decir(ultima ? "¡Lo lograste! 🎉" : "¡Ronda completa! ¡Qué culebrita tan grande! 🐍");
      B.luego(() => {
        if (ultima) return B.terminar(true, `Te comiste ${S.aciertos} correctos y tu culebrita llegó a medir ${S.cuerpo.length}.`, "", dibujar);
        S.ronda++; S.progreso = 0; S.comida = []; reiniciarCuerpo(); ponerComida();
        M.consigna(rondas[S.ronda].consigna); barra(); S.fase = "juego";
        M.decir("¡Nueva misión! Lee bien lo que dice arriba 👆");
      }, 1700);
    }

    // --- Controles: deslizar, botones y teclado ---
    let toque = null;
    B.escuchar(B.cv, "pointerdown", (e) => { if (S.fase !== "juego") return; e.preventDefault(); toque = { x: e.clientX, y: e.clientY }; try { B.cv.setPointerCapture(e.pointerId); } catch (_) {} });
    B.escuchar(B.cv, "pointermove", (e) => {
      if (!toque) return;
      const dx = e.clientX - toque.x, dy = e.clientY - toque.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      if (Math.abs(dx) > Math.abs(dy)) girar(Math.sign(dx), 0); else girar(0, Math.sign(dy));
      toque = { x: e.clientX, y: e.clientY };
    });
    B.escuchar(B.cv, "pointerup", () => { toque = null; });
    B.escuchar(B.cv, "pointercancel", () => { toque = null; });
    const ctl = M.controles(CONTROLES);
    ctl.querySelectorAll("[data-d]").forEach((b) => {
      const [dx, dy] = b.dataset.d.split(",").map(Number);
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.classList.add("lg-on"); girar(dx, dy); });
      ["pointerup", "pointercancel", "pointerleave"].forEach((t) => b.addEventListener(t, () => b.classList.remove("lg-on")));
    });
    B.escuchar(window, "keydown", (e) => {
      const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] }[e.key];
      if (!m || S.fase !== "juego") return;
      e.preventDefault(); girar(m[0], m[1]);
    });

    function paso(dt) {
      S.reloj += dt; B.efectos(dt);
      if (S.fase !== "juego") return;
      S.paso += dt;
      if (S.paso >= intervalo()) { S.paso = 0; avanzar(); }
    }
    function dibujar() {
      const ctx = B.ctx;
      ctx.fillStyle = "#123b2a"; ctx.fillRect(0, 0, B.W, B.H);
      for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (f + c) % 2 ? "#1b5a3c" : "#1f6644";
        ctx.fillRect(ox + c * tam, oy + f * tam, tam, tam);
      }
      if (D) { ctx.strokeStyle = "#ffcf3f"; ctx.lineWidth = 3; ctx.strokeRect(ox + 1.5, oy + 1.5, COLS * tam - 3, FILAS * tam - 3); }
      // Comida
      S.comida.forEach((c) => {
        const x = ox + c.x * tam + tam / 2, y = oy + c.y * tam + tam / 2;
        const w = Math.min(tam * 1.9, B.W - 8), [fs, tx] = ajustar(ctx, c.txt, w - 10, Math.round(tam * 0.5));
        ctx.font = `800 ${fs}px ${FUENTE}`;
        const ancho = Math.max(tam - 4, Math.min(w, ctx.measureText(tx).width + 14));
        ctx.fillStyle = "#fff6c9"; ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 3;
        caja(ctx, x - ancho / 2, y - tam * 0.38, ancho, tam * 0.76, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#1f2544"; ctx.fillText(tx, x, y + 1);
      });
      // Culebrita
      S.cuerpo.slice().reverse().forEach((c, i, arr) => {
        const cabeza = i === arr.length - 1, x = ox + c.x * tam, y = oy + c.y * tam;
        ctx.fillStyle = cabeza ? "#ffffff" : heroe.color; ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 2.5;
        caja(ctx, x + 2, y + 2, tam - 4, tam - 4, tam * 0.3); ctx.fill(); ctx.stroke();
        if (cabeza) { ctx.font = `${Math.round(tam * 0.62)}px ${EMOJI}`; ctx.fillText(heroe.emoji, x + tam / 2, y + tam / 2 + 1); }
      });
      B.dibujarEfectos();
    }

    reiniciarCuerpo(); ponerComida();
    M.consigna(rondas[0].consigna);
    if (D) M.vidas(3, 3);
    M.decir(D ? "¡Modo difícil! ¿Aceptas el reto? 🔥" : `¡Hola, ${heroe.nombre}! Soy Lulo 🐬 ¡A comer solo lo correcto!`);
    B.arrancar(paso, dibujar);
    presentar(M, INFO_CULEBRITA, D, rapido, () => {
      S.fase = "juego"; S.inicio = Date.now(); barra();
      M.decir("¡Cómete solo lo que dice arriba! 👆");
    });
  }

  // =====================================================================
  // 💥 Rompe-ladrillos
  // datos = { titulo?: "💥 Rompe-ladrillos de las tablas",
  //           preguntas: [..] | () => [{ pregunta, opciones, correcta, explicacion?, pista? }] }
  // Los ladrillos ❓ traen una pregunta: acertar da un poder (paleta grande, pelota lenta o bomba).
  // Se gana al romper todos los ❓. Normal: si la pelota se cae, vuelve a la paleta.
  // =====================================================================
  const INFO_LADRILLOS = {
    icono: "💥", nombre: "Rompe-ladrillos",
    como: "Mueve la paleta con el dedo para que la pelota no se caiga. Rompe todos los ladrillos ❓: cada uno trae una pregunta y, si aciertas, ganas un poder.",
    dificil: "La pelota va más rápido y tienes 3 corazones: pierdes uno si la pelota se cae o si fallas una pregunta.",
    teclas: "Con teclado: ← → para mover la paleta.",
  };
  const PODERES = [
    { id: "grande", txt: "🟦 ¡Paleta gigante!" },
    { id: "lenta", txt: "🐢 ¡Pelota lenta!" },
    { id: "bomba", txt: "💣 ¡Pelota bomba! El próximo ladrillo explota" },
  ];

  function ladrillos(host, datos, opts, rapido) {
    const D = !!opts.dificil;
    const siguiente = cola(datos.preguntas, D);
    let pendiente = siguiente();
    if (!pendiente) throw new Error("Rompe-ladrillos necesita preguntas con pregunta, opciones y correcta.");
    const heroe = nino(opts);
    const M = marco(host, datos.titulo || "💥 Rompe-ladrillos");
    const alto = altoDisponible(M, 280, 520);
    const S = {
      fase: "intro", aciertos: 0, errores: 0, escapados: 0, puntos: 0, vidas: D ? 3 : 0,
      ladrillos: [], paleta: { x: 170, w: 90 }, bola: { x: 0, y: 0, vx: 0, vy: 0, pegada: true, espera: 0.8 },
      poder: { grande: 0, lenta: 0, bomba: false }, sinRomper: 0, preguntasTotal: 0, rotas: 0,
      chispas: [], textos: [], reloj: 0, inicio: 0, anotado: false, pregunta: null,
      resumenPerdio: () => `Respondiste bien ${S.aciertos} ${S.aciertos === 1 ? "pregunta" : "preguntas"}.`,
    };
    window.LG._estado = S; // solo para las pruebas automáticas
    const B = baseLienzo(host, M, "ladrillos", "coordinacion", D, S, opts, datos, alto);
    B.cv.setAttribute("aria-label", "Rompe-ladrillos");
    const COLORES = ["#ff6b9a", "#ff9a4d", "#ffcf3f", "#35b862", "#59c3ff", "#a77bff"];
    const anchoPaleta = () => B.W * (D ? 0.2 : 0.27) * (S.poder.grande > 0 ? 1.6 : 1);
    const velBola = () => (D ? 360 : 290) * (1 + Math.min(0.25, S.rotas * 0.006)) * (S.poder.lenta > 0 ? 0.6 : 1);
    const PY = () => B.H - 34;

    function armar() {
      const cols = B.W < 460 ? 7 : 9, filas = D ? 6 : 5, gap = 4, top = 40;
      const w = (B.W - 16 - gap * (cols - 1)) / cols, h = 22;
      const total = cols * filas, cuantas = D ? 8 : 6;
      // Los ❓ van más abajo (son más fáciles de alcanzar)
      const candidatos = mezclar([...Array(total).keys()].filter((i) => Math.floor(i / cols) >= filas - 3)).slice(0, cuantas);
      S.ladrillos = [];
      for (let i = 0; i < total; i++) {
        const f = Math.floor(i / cols), c = i % cols;
        S.ladrillos.push({ x: 8 + c * (w + gap), y: top + f * (h + gap), w, h, vivo: true, pregunta: candidatos.includes(i), golpes: D && f === 0 ? 2 : 1, color: COLORES[f % COLORES.length] });
      }
      S.preguntasTotal = cuantas;
    }
    const faltan = () => S.ladrillos.filter((l) => l.vivo && l.pregunta).length;
    function consigna() { M.consigna(`❓ Ladrillos pregunta: ${S.preguntasTotal - faltan()} de ${S.preguntasTotal}`); M.barra((S.preguntasTotal - faltan()) / S.preguntasTotal); }
    function pegar() { S.bola.pegada = true; S.bola.espera = 0.9; }
    function lanzar() {
      const a = azar(-0.5, 0.5), v = velBola();
      S.bola.vx = Math.sin(a) * v; S.bola.vy = -Math.cos(a) * v; S.bola.pegada = false;
    }
    function romper(l, bx, by) {
      l.golpes--;
      if (l.golpes > 0) { B.chispas(bx, by, "#ffffff", 5); tono([400], 0.05, "square", 0, 0.05); return; }
      l.vivo = false; S.rotas++; S.sinRomper = 0; S.puntos += 5; M.puntos(S.puntos);
      B.chispas(l.x + l.w / 2, l.y + l.h / 2, l.color, 10); tono([660 + Math.random() * 200], 0.05, "triangle", 0, 0.06);
      if (l.pregunta) preguntaLadrillo(l);
    }
    function explotar(l) {
      S.poder.bomba = false;
      B.texto(l.x + l.w / 2, l.y, "💥 ¡BUM!", "#ffcf3f", 1.3); SON.golpe();
      S.ladrillos.forEach((o) => {
        // Los ❓ no se rompen con la bomba: su pregunta no se puede saltar
        if (o.vivo && o !== l && !o.pregunta && Math.abs(o.x - l.x) <= l.w * 1.2 && Math.abs(o.y - l.y) <= l.h * 1.4) { o.golpes = 1; romper(o, o.x + o.w / 2, o.y + o.h / 2); }
      });
    }
    function preguntaLadrillo(l) {
      if (S.fase !== "juego") return;
      const q = pendiente || siguiente();
      pendiente = null;
      if (!q) return revisar();
      S.fase = "pregunta"; S.pregunta = q;
      preguntar(M, q, { D, reintentar: false, titulo: "❓ ¡Ladrillo pregunta!", segundos: 15 }, {
        fallo: () => { S.errores++; B.perderVida(); return S.fase !== "final"; },
        fin: (acerto) => {
          if (S.fase !== "pregunta") return;
          if (acerto) {
            S.aciertos++; S.puntos += 25; M.puntos(S.puntos);
            const p = elegir(PODERES);
            if (p.id === "bomba") S.poder.bomba = true; else S.poder[p.id] = 10;
            B.texto(B.W / 2, B.H * 0.55, p.txt, "#ffcf3f", 1.2); M.decir(`¡Correcto! ${p.txt}`);
          } else M.decir("¡Casi! Ahora ya lo sabes 💡 ¡Sigue rompiendo!");
          S.fase = "juego"; consigna(); revisar();
        },
      });
    }
    function revisar() {
      consigna();
      if (!faltan() && S.fase === "juego") {
        S.fase = "final"; SON.gana(); M.decir("¡Rompiste todos los ladrillos con pregunta! 🎉");
        S.ladrillos.forEach((l) => { if (l.vivo) B.chispas(l.x + l.w / 2, l.y + l.h / 2, l.color, 4); });
        B.luego(() => B.terminar(true, `Rompiste ${S.rotas} ladrillos y acertaste ${S.aciertos} de ${S.preguntasTotal} preguntas.`, "", dibujar), 1100);
      }
    }

    // --- Controles: el dedo lleva la paleta; teclado ---
    const llevar = (e) => { const r = B.cv.getBoundingClientRect(); S.paleta.x = e.clientX - r.left; };
    let tocando = false;
    B.escuchar(B.cv, "pointerdown", (e) => { if (S.fase !== "juego") return; e.preventDefault(); tocando = true; try { B.cv.setPointerCapture(e.pointerId); } catch (_) {} llevar(e); });
    B.escuchar(B.cv, "pointermove", (e) => { if (tocando || e.pointerType === "mouse") llevar(e); });
    B.escuchar(B.cv, "pointerup", () => { tocando = false; });
    B.escuchar(B.cv, "pointercancel", () => { tocando = false; });
    const teclas = {};
    B.escuchar(window, "keydown", (e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { teclas[e.key] = true; if (S.fase === "juego") e.preventDefault(); } });
    B.escuchar(window, "keyup", (e) => { teclas[e.key] = false; });

    function paso(dt) {
      S.reloj += dt; B.efectos(dt);
      if (S.fase !== "juego") return;
      if (S.poder.grande > 0) S.poder.grande -= dt;
      if (S.poder.lenta > 0) S.poder.lenta -= dt;
      if (teclas.ArrowLeft) S.paleta.x -= 420 * dt;
      if (teclas.ArrowRight) S.paleta.x += 420 * dt;
      const pw = anchoPaleta();
      S.paleta.x = Math.max(pw / 2, Math.min(B.W - pw / 2, S.paleta.x));
      const b = S.bola, r = 8;
      if (b.pegada) {
        b.x = S.paleta.x; b.y = PY() - 12 - r;
        b.espera -= dt; if (b.espera <= 0) lanzar();
        return;
      }
      // Mantiene la rapidez aunque cambie el poder de pelota lenta
      const v = Math.hypot(b.vx, b.vy) || 1, quiere = velBola();
      b.vx *= quiere / v; b.vy *= quiere / v;
      const pasos = Math.ceil((quiere * dt) / 6);
      for (let k = 0; k < pasos && S.fase === "juego"; k++) mover(dt / pasos, r, pw);
      S.sinRomper += dt;
    }
    function mover(dt, r, pw) {
      const b = S.bola;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx); }
      if (b.x > B.W - r) { b.x = B.W - r; b.vx = -Math.abs(b.vx); }
      if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy); }
      // Paleta: el ángulo depende de dónde pega
      if (b.vy > 0 && b.y + r >= PY() - 12 && b.y + r <= PY() + 4 && Math.abs(b.x - S.paleta.x) <= pw / 2 + r) {
        let t = (b.x - S.paleta.x) / (pw / 2);
        // Ayudita: si lleva rato sin romper nada, apunta hacia un ❓
        if (S.sinRomper > 9) {
          const obj = S.ladrillos.find((l) => l.vivo && l.pregunta);
          if (obj) t = Math.max(-1, Math.min(1, (obj.x + obj.w / 2 - b.x) / (B.W * 0.6)));
          S.sinRomper = 0;
        }
        const a = t * 1.05, v = velBola();
        b.vx = Math.sin(a) * v; b.vy = -Math.abs(Math.cos(a) * v); b.y = PY() - 12 - r;
        tono([330], 0.04, "sine", 0, 0.05);
      }
      // Ladrillos
      for (const l of S.ladrillos) {
        if (!l.vivo) continue;
        if (b.x + r < l.x || b.x - r > l.x + l.w || b.y + r < l.y || b.y - r > l.y + l.h) continue;
        const dx = Math.min(b.x + r - l.x, l.x + l.w - (b.x - r)), dy = Math.min(b.y + r - l.y, l.y + l.h - (b.y - r));
        if (dx < dy) b.vx = -b.vx; else b.vy = -b.vy;
        if (S.poder.bomba && !l.pregunta) { l.golpes = 1; romper(l, b.x, b.y); explotar(l); }
        else romper(l, b.x, b.y);
        break;
      }
      // Se cayó
      if (b.y - r > B.H) {
        SON.mal();
        M.decir(D ? "¡Se cayó la pelota! Cuidado 💔" : "¡Se cayó! Lulo te la devuelve 🐬 Mueve la paleta debajo de la pelota.");
        B.perderVida();
        if (S.fase === "juego") pegar();
      }
    }
    function dibujar() {
      const ctx = B.ctx;
      const g = ctx.createLinearGradient(0, 0, 0, B.H);
      g.addColorStop(0, "#14123a"); g.addColorStop(1, "#2f2468");
      ctx.fillStyle = g; ctx.fillRect(0, 0, B.W, B.H);
      for (const l of S.ladrillos) {
        if (!l.vivo) continue;
        ctx.fillStyle = l.golpes > 1 ? PIEDRA : l.color; ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 2.5;
        caja(ctx, l.x, l.y, l.w, l.h, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(l.x + 4, l.y + 3, l.w * 0.4, 4);
        if (l.pregunta) {
          ctx.fillStyle = "#ffffff"; caja(ctx, l.x + l.w / 2 - 11, l.y + 2, 22, l.h - 4, 6); ctx.fill();
          ctx.fillStyle = "#1f2544"; ctx.font = `800 15px ${FUENTE}`; ctx.fillText("?", l.x + l.w / 2, l.y + l.h / 2 + 1);
        }
      }
      // Paleta con el héroe
      const pw = anchoPaleta(), x = S.paleta.x, y = PY();
      ctx.fillStyle = heroe.color; ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 3;
      caja(ctx, x - pw / 2, y - 12, pw, 16, 8); ctx.fill(); ctx.stroke();
      ctx.font = `20px ${EMOJI}`; ctx.fillText(heroe.emoji, x, y + 14);
      // Pelota
      const b = S.bola;
      ctx.fillStyle = S.poder.bomba ? "#ff5b5b" : "#ffffff"; ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, 7); ctx.fill();
      ctx.strokeStyle = "#1f2544"; ctx.lineWidth = 2.5; ctx.stroke();
      // Poderes activos
      const activos = [S.poder.grande > 0 ? "🟦" : "", S.poder.lenta > 0 ? "🐢" : "", S.poder.bomba ? "💣" : ""].join("");
      if (activos) { ctx.font = `18px ${EMOJI}`; ctx.fillText(activos, B.W - 10 - activos.length * 5, 18); }
      B.dibujarEfectos();
    }

    armar(); consigna();
    if (D) M.vidas(3, 3);
    M.decir(D ? "¡Modo difícil! ¿Aceptas el reto? 🔥" : `¡Hola, ${heroe.nombre}! Soy Lulo 🐬 ¡A romper ladrillos!`);
    B.arrancar(paso, dibujar);
    presentar(M, INFO_LADRILLOS, D, rapido, () => {
      S.fase = "juego"; S.inicio = Date.now(); S.paleta.x = B.W / 2; pegar();
      M.decir("¡Mueve la paleta con el dedo! 👆");
    });
  }

  // =====================================================================
  // ⚔️ La batalla (RPG por turnos)
  // datos = { titulo?: "⚔️ La batalla de las tablas",
  //           preguntas: [..] | () => [...],          // para atacar
  //           preguntasMagia?: [..] | () => [...],    // para la magia (más difíciles); si no hay, usa las mismas
  //           enemigos?: [{ nombre: "Borrón", emoji: "👻" }, { nombre: "Enredón", emoji: "🐙" }],  // máximo 2
  //           jefe?: { nombre: "Olvidón", emoji: "👾" } }
  // Atacar y lanzar magia son preguntas. Cada enemigo tiene una debilidad (🔥💧⚡) que Lulo dice
  // una sola vez al empezar: hay que recordarla. Defenderse sirve cuando carga un ataque fuerte.
  // Normal: si el héroe se queda sin vida, Lulo lo cura y sigue. Difícil: se acaba.
  // =====================================================================
  const INFO_RPG = {
    icono: "⚔️", nombre: "La batalla",
    como: "Pelea por turnos: para atacar o lanzar magia, responde bien. Lulo te dirá la debilidad de cada enemigo: ¡recuérdala! Defiéndete cuando cargue un ataque fuerte.",
    dificil: "Los enemigos tienen más vida y pegan más duro. Si tu héroe se queda sin vida, se acaba.",
  };
  const ELEMENTOS = [{ id: "fuego", e: "🔥", n: "fuego" }, { id: "agua", e: "💧", n: "agua" }, { id: "rayo", e: "⚡", n: "rayo" }];

  function rpg(host, datos, opts, rapido) {
    const D = !!opts.dificil;
    const sigAtaque = cola(datos.preguntas, D);
    let pendiente = sigAtaque();
    if (!pendiente) throw new Error("La batalla necesita preguntas con pregunta, opciones y correcta.");
    const sigMagia = datos.preguntasMagia ? cola(datos.preguntasMagia, D) : sigAtaque;
    const heroe = nino(opts);
    const base = (Array.isArray(datos.enemigos) && datos.enemigos.length ? datos.enemigos : [{ nombre: "Borrón", emoji: "👻" }, { nombre: "Enredón", emoji: "🐙" }]).slice(0, 2);
    const jefe = datos.jefe && datos.jefe.nombre ? datos.jefe : { nombre: "Olvidón", emoji: "👾" };
    // Vida pensada para unas 10 a 12 preguntas por partida
    const VIDAS = D ? [12, 14] : [10, 12], VJEFE = D ? 22 : 18;
    const enemigos = [
      ...base.map((e, i) => ({ nombre: String(e.nombre || "Enemigo"), emoji: e.emoji || "👾", max: VIDAS[i] || VIDAS[1], jefe: false })),
      { nombre: String(jefe.nombre), emoji: jefe.emoji || "👾", max: VJEFE, jefe: true },
    ].map((e) => ({ ...e, vida: e.max, debil: elegir(ELEMENTOS).id }));
    const M = marco(host, datos.titulo || "⚔️ La batalla");
    // Los 4 botones en una fila (ícono arriba, palabra abajo) y antes de medir: cuentan en el alto
    const ctl = M.controles(`<button class="lg-ctl lg-cmd" data-c="atacar"><span aria-hidden="true">⚔️</span>Atacar</button><button class="lg-ctl lg-cmd" data-c="magia"><span aria-hidden="true">✨</span>Magia</button>
      <button class="lg-ctl lg-cmd" data-c="pocion"><span aria-hidden="true">🧪</span>Poción</button><button class="lg-ctl lg-cmd" data-c="defender"><span aria-hidden="true">🛡️</span>Defender</button>`);
    // Mínimo 320: tiene que caber la tarjeta de pregunta encima de la batalla
    const alto = altoDisponible(M, 320, 420);
    M.zona.insertAdjacentHTML("afterbegin", `<div class="lg-rpg" style="height:${alto}px">
      <div class="lg-ene"><div class="lg-ficha"><b class="lg-nom"></b><div class="lg-hp"><i></i></div><small class="lg-int"></small></div>
        <div class="lg-cara lg-ene-cara" aria-hidden="true"></div></div>
      <div class="lg-her"><div class="lg-her-cara" style="background:${esc(heroe.color)}" aria-hidden="true">${esc(heroe.emoji)}</div>
        <div class="lg-ficha"><b>${esc(heroe.nombre)}</b><div class="lg-hp v"><i></i></div><small class="lg-mp"></small></div></div></div>`);
    const $ = (s) => M.zona.querySelector(s);
    const escena = $(".lg-rpg"), caraEne = $(".lg-ene-cara"), caraHer = $(".lg-her-cara");

    const S = {
      fase: "intro", heroe: { vida: 20, max: 20, mp: 3, pociones: D ? 2 : 3 }, enemigos, idx: 0,
      cargando: false, defendiendo: false, turnosEne: 0, aciertos: 0, errores: 0, escapados: 0, puntos: 0,
      inicio: 0, anotado: false, pregunta: null, vencidos: 0,
    };
    window.LG._estado = S; // solo para las pruebas automáticas
    const ene = () => S.enemigos[S.idx];
    const ATAQUE = () => (ene().jefe ? (D ? 4 : 3) : (D ? 3 : 2)), FUERTE = () => (ene().jefe ? (D ? 8 : 6) : (D ? 7 : 5));

    const timers = [];
    let parado = false;
    const luego = (fn, ms) => timers.push(setTimeout(() => { if (!parado && escena.isConnected) fn(); }, ms));
    const parar = () => { parado = true; timers.forEach(clearTimeout); };
    const animar = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
    function numero(el, txt, color) {
      const r = el.getBoundingClientRect(), z = escena.getBoundingClientRect(), n = document.createElement("span");
      n.className = "lg-num"; n.textContent = txt; n.style.color = color;
      n.style.left = (r.left - z.left + r.width / 2 - 20) + "px"; n.style.top = (r.top - z.top) + "px";
      escena.appendChild(n); setTimeout(() => n.remove(), 950);
    }

    function pintar() {
      const e = ene(), h = S.heroe;
      $(".lg-nom").textContent = (e.jefe ? "👑 " : "") + e.nombre;
      $(".lg-hp i").style.width = Math.max(0, (e.vida / e.max) * 100) + "%";
      $(".lg-int").textContent = S.cargando ? "⚡ ¡Cargando un ataque fuerte!" : `❤️ ${Math.max(0, e.vida)} / ${e.max}`;
      $(".lg-hp.v i").style.width = Math.max(0, (h.vida / h.max) * 100) + "%";
      $(".lg-mp").textContent = `❤️ ${Math.max(0, h.vida)}/${h.max} · ✨${"✦".repeat(h.mp) || "0"} · 🧪×${h.pociones}`;
      ctl.querySelectorAll("[data-c]").forEach((b) => { b.disabled = S.fase !== "turno"; });
      M.barra((S.idx + 1 - Math.max(0, e.vida) / e.max) / S.enemigos.length);
      M.puntos(S.puntos);
    }
    function entrar() {
      const e = ene();
      caraEne.className = "lg-cara lg-ene-cara"; caraEne.textContent = e.emoji;
      animar(caraEne, "lg-entra");
      const el = ELEMENTOS.find((x) => x.id === e.debil);
      M.consigna(`${e.emoji} ${e.jefe ? "¡El jefe " : "¡"}${e.nombre} apareció! (${S.idx + 1} de ${S.enemigos.length})`);
      M.decir(`🐬 A ${e.nombre} le duele el ${el.n} ${el.e}. ¡Recuérdalo!`);
      S.cargando = false; S.defendiendo = false; S.turnosEne = 0; S.fase = "turno";
      pintar();
    }

    // --- Lo que puede hacer el héroe ---
    function atacar() {
      if (S.fase !== "turno") return;
      const q = pendiente || sigAtaque(); pendiente = null;
      if (!q) return golpear(2, "");
      S.fase = "pregunta"; S.pregunta = q; pintar();
      const t0 = Date.now();
      preguntar(M, q, { D, reintentar: false, titulo: "⚔️ ¡Responde para atacar!", segundos: 15 }, {
        fallo: () => { S.errores++; return true; },
        fin: (ok) => {
          if (S.fase !== "pregunta") return;
          if (!ok) { M.decir("¡Casi! El golpe no entró. ¡El próximo sí! 💪"); return turnoEnemigo(); }
          S.aciertos++;
          const critico = Date.now() - t0 < 7000;
          golpear(critico ? 3 : 2, critico ? "¡Golpe crítico por responder rápido! ⚡" : "");
        },
      });
    }
    function magia() {
      if (S.fase !== "turno") return;
      if (S.heroe.mp <= 0) { M.decir("No te queda magia ✨. ¡Ataca o usa una poción!"); return; }
      S.fase = "eligiendo"; pintar();
      M.decir("¿Te acuerdas de lo que dijo Lulo? 🤔");
      M.mostrar(`<div class="lg-tarjeta"><p class="lg-preg-t">✨ ¿Qué magia vas a lanzar?</p><h3>¿Cuál es la debilidad de ${esc(ene().nombre)}?</h3>
        <div class="lg-ops">${ELEMENTOS.map((x) => `<button class="lg-op" data-el="${x.id}">${x.e} Magia de ${x.n}</button>`).join("")}</div>
        <button class="lg-link" data-volver>← Volver</button></div>`);
      M.capa.querySelector("[data-volver]").onclick = () => { M.ocultar(); S.fase = "turno"; pintar(); };
      M.capa.querySelectorAll("[data-el]").forEach((b) => b.onclick = () => {
        const el = ELEMENTOS.find((x) => x.id === b.dataset.el);
        M.ocultar();
        const q = sigMagia();
        S.heroe.mp--;
        if (!q) { S.fase = "turno"; return golpear(el.id === ene().debil ? 6 : 3, ""); }
        S.fase = "pregunta"; S.pregunta = q; pintar();
        preguntar(M, q, { D, reintentar: false, titulo: `${el.e} ¡Magia de ${el.n}! Responde para lanzarla:`, segundos: 18 }, {
          fallo: () => { S.errores++; return true; },
          fin: (ok) => {
            if (S.fase !== "pregunta") return;
            if (!ok) { M.decir("¡Casi! La magia se apagó. ¡Inténtalo otra vez! ✨"); return turnoEnemigo(); }
            S.aciertos++;
            const debil = el.id === ene().debil;
            golpear(debil ? 6 : 3, debil ? `¡Era su debilidad! ${el.e} Daño doble` : (D ? "" : "No era su debilidad… ¿recuerdas lo que dijo Lulo? 🐬"));
          },
        });
      });
    }
    function pocion() {
      if (S.fase !== "turno") return;
      const h = S.heroe;
      if (h.pociones <= 0) { M.decir("¡Ya no te quedan pociones! 🧪"); return; }
      if (h.vida >= h.max) { M.decir("¡Tienes toda la vida! Guarda la poción para después 🧪"); return; }
      h.pociones--; const cura = Math.min(8, h.max - h.vida); h.vida += cura;
      numero(caraHer, "+" + cura, "#7fffa0"); tono([523, 784], 0.12, "triangle", 0.08);
      M.decir("🧪 ¡Te curaste!");
      S.fase = "anim"; pintar(); turnoEnemigo();
    }
    function defender() {
      if (S.fase !== "turno") return;
      S.defendiendo = true; S.fase = "anim"; animar(caraHer, "lg-escudo");
      M.decir("🛡️ ¡Te preparaste para defenderte!");
      pintar(); turnoEnemigo();
    }
    ctl.querySelector('[data-c="atacar"]').onclick = atacar;
    ctl.querySelector('[data-c="magia"]').onclick = magia;
    ctl.querySelector('[data-c="pocion"]').onclick = pocion;
    ctl.querySelector('[data-c="defender"]').onclick = defender;

    function golpear(dmg, extra) {
      S.fase = "anim"; pintar();
      animar(caraHer, "lg-ataca");
      luego(() => {
        const e = ene();
        e.vida -= dmg; S.puntos += dmg * 10;
        animar(caraEne, "lg-golpe"); numero(caraEne, "-" + dmg, "#ffcf3f"); SON.golpe();
        M.decir(`${elegir(GOLPE)} ${extra}`.trim());
        pintar();
        luego(() => (e.vida <= 0 ? vencido() : turnoEnemigo()), 750);
      }, 280);
    }
    function turnoEnemigo() {
      S.fase = "anim"; pintar();
      luego(() => {
        const e = ene();
        S.turnosEne++;
        let dmg = 0;
        if (S.cargando) {
          S.cargando = false;
          dmg = S.defendiendo ? 1 : FUERTE();
          M.decir(S.defendiendo ? "🛡️ ¡Bloqueaste su ataque fuerte! ¡Bien pensado!" : `💥 ¡${e.nombre} usó su ataque fuerte! La próxima vez, defiéndete 🛡️`);
        } else if (S.turnosEne % 3 === 0) {
          S.cargando = true; animar(caraEne, "lg-carga");
          M.decir(`⚡ ¡${e.nombre} está cargando un ataque fuerte! Usa 🛡️ Defender.`);
        } else {
          dmg = S.defendiendo ? 0 : ATAQUE();
          if (S.defendiendo) M.decir("🛡️ ¡Te defendiste! No te hizo nada.");
        }
        S.defendiendo = false;
        if (dmg > 0) {
          animar(caraEne, "lg-ataca-ene");
          luego(() => { S.heroe.vida -= dmg; animar(caraHer, "lg-golpe"); numero(caraHer, "-" + dmg, "#ff9dbd"); SON.mal(); pintar(); }, 220);
        }
        luego(() => {
          if (S.heroe.vida <= 0) return cae();
          S.fase = "turno"; pintar();
        }, dmg > 0 ? 700 : 350);
      }, 650);
    }
    function cae() {
      if (D) { S.fase = "final"; pintar(); M.decir("¡Tu héroe necesita descansar!"); return luego(() => terminar(false), 900); }
      S.heroe.vida = S.heroe.max; numero(caraHer, "+" + S.heroe.max, "#7fffa0");
      M.decir("💪 ¡Tu héroe descansó y volvió más fuerte! Lulo te curó 🐬");
      S.fase = "turno"; pintar();
    }
    function vencido() {
      const e = ene();
      S.vencidos++; S.puntos += 50; animar(caraEne, "lg-muere"); SON.gana();
      M.decir(`¡Venciste a ${e.nombre}! 🎉`);
      S.fase = "anim"; pintar();
      if (S.idx >= S.enemigos.length - 1) return luego(() => terminar(true), 1300);
      luego(() => {
        S.idx++;
        S.heroe.vida = Math.min(S.heroe.max, S.heroe.vida + 5); S.heroe.mp = Math.min(3, S.heroe.mp + 1);
        entrar();
      }, 1500);
    }
    function terminar(gano) {
      if (S.fase === "fin") return;
      S.fase = "fin"; parar(); pintar();
      anotar(opts, "rpg", "logica", D, S, gano ? "termino" : "perdio");
      const n = S.aciertos + S.errores, estrellas = gano ? estrellasDe(S.aciertos, n) : 0;
      if (gano && opts.alTerminar) { try { opts.alTerminar(estrellas); } catch (e) { console.error("[Learnground]", e); } }
      cierre(M, {
        gano, estrellas, titulo: "¡Tu héroe necesita descansar!",
        resumen: `Venciste a ${S.vencidos} de ${S.enemigos.length} enemigos y acertaste ${S.aciertos} de ${n} ${n === 1 ? "pregunta" : "preguntas"}.`,
      }, opts, D, (dif) => LG.jugar("rpg", host, datos, { ...opts, dificil: dif }, true));
    }
    M.alSalir(() => {
      if (S.fase !== "fin") anotar(opts, "rpg", "logica", D, S, "salio");
      parar(); try { speechSynthesis.cancel(); } catch (e) {}
      if (opts.alSalir) opts.alSalir(); else host.innerHTML = "";
    });

    caraEne.textContent = enemigos[0].emoji;
    pintar();
    M.consigna(`⚔️ ${enemigos.length} enemigos te esperan`);
    M.decir(D ? "¡Modo difícil! ¿Aceptas el reto? 🔥" : `¡Hola, ${heroe.nombre}! Soy Lulo 🐬 ¡A la batalla!`);
    presentar(M, INFO_RPG, D, rapido, () => { S.inicio = Date.now(); entrar(); });
  }

  // ---------- Entrada única ----------
  const JUEGOS = { nave, bloques, plataformas, culebrita, ladrillos, rpg };
  function jugar(tipo, host, datos, opts = {}, rapido = false) {
    estilos();
    const juego = JUEGOS[tipo];
    try {
      if (!juego) throw new Error(`No existe el juego «${tipo}».`);
      return juego(host, datos || {}, opts || {}, rapido);
    } catch (e) {
      console.error("[Learnground]", e);
      host.innerHTML = `<div class="lg-juego"><div class="lg-capa" style="position:static"><div class="lg-tarjeta"><div class="lg-grande">🛠️</div>
        <h3>Este juego no pudo arrancar</h3><p>Elige otro mientras lo arreglamos. ¡Perdón!</p><button class="lg-btn" data-fuera>Elegir otro juego</button></div></div></div>`;
      host.querySelector("[data-fuera]").onclick = () => (opts && opts.alSalir ? opts.alSalir() : (host.innerHTML = ""));
    }
  }

  window.LG = { version: 1, juegos: Object.keys(JUEGOS), jugar, _estado: null };
})();
