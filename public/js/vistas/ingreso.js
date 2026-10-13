// =============================================================================
// ingreso.js — Entrar con correo y contraseña, o crear la cuenta de una familia
// con un código de invitación (#/registro/<código> lo trae ya escrito).
// =============================================================================

import * as datos from '../datos.js';
import { MODO_DEMO, NUBE } from '../config.js';
import { esc } from '../util.js';
import { aviso, confeti, abrirHoja, cerrarHoja } from '../ui.js';

const FLOTAN = ['📚', '⭐', '🎈', '✏️', '🔢', '🌎', '🧠', '🎨', '🚀', '🔬'];

export async function render(root, ctx) {
  const codigoUrl = ctx.params[0] || '';
  let modo = codigoUrl ? 'codigo' : 'entrar';
  // En la app real, ?demo abre la "versión de prueba": solo se elige cómo verla (sin el formulario de entrar)
  // (con ?demo&dev se ve la demostración completa, también la del equipo, para probar la app)
  const URL_PARAMS = new URLSearchParams(location.search);
  const PRUEBA = MODO_DEMO && !!NUBE.url && !codigoUrl && !URL_PARAMS.has('dev');
  // Desde "Probar" de la app real se entra directo como familia (sin pasar por esta pantalla)
  if (PRUEBA && URL_PARAMS.has('familia')) {
    history.replaceState(null, '', `${location.pathname}?demo${location.hash}`);
    await datos.ingresar('familia@tareki.demo', 'tareki');
    ctx.navegar('#/');
    return;
  }

  root.innerHTML = `
    <div class="flotan" aria-hidden="true">${FLOTAN.map((e, i) => `<span style="left:${(i * 37) % 92}%;top:${(i * 53) % 88}%;animation-delay:-${i * 0.9}s">${e}</span>`).join('')}</div>
    <div class="ingreso"><div class="ingreso-caja">
      <div class="marca"><img class="marca-logo" src="img/lulo-128.png" alt="" aria-hidden="true"><span class="marca-nombre">Learn<b>ground</b></span></div>
      <p class="lema">Lecciones divertidas para aprender jugando</p>
      ${PRUEBA ? '' : `<div class="pestanas" role="tablist">
        <button role="tab" data-modo="entrar">Entrar</button>
        <button role="tab" data-modo="codigo">Tengo un código</button>
      </div>`}
      <div class="card" id="caja" ${PRUEBA ? 'hidden' : ''}></div>
      ${PRUEBA ? `<div class="card prueba-elegir">
        <h2>🎮 Versión de prueba</h2>
        <p>Mira cómo funciona Learnground con datos inventados y una lección de muestra. No necesitas cuenta y nada de lo que hagas aquí es real.</p>
        <div class="prueba-opciones">
          <button class="prueba-op" data-demo="familia"><span class="em">👨‍👩‍👧</span><b>Entrar a la prueba</b><small>Lo que ven los niños y los papás: lecciones, juegos, racha, logros y el progreso con consejos.</small></button>
        </div>
        <a class="link peq" href="./">← Volver para entrar con mi cuenta</a>
      </div>` : MODO_DEMO ? `<div class="demo-caja">
        <b>🧪 Modo demostración</b>
        <span>Todo se guarda solo en este navegador. Prueba la app como:</span>
        <div class="fila"><button class="btn btn-peq btn-sol" data-demo="familia">👨‍👩‍👧 Una familia</button><button class="btn btn-peq btn-azul" data-demo="equipo">🧑‍🏫 El equipo</button></div>
        <span class="suave peq">Para probar el registro usa el código <b>LEARN-DEMO</b>.</span>
      </div>` : `<a class="prueba-caja" href="?demo&familia#/entrar">
        <span class="em" aria-hidden="true">🎮</span>
        <span><b>¿Quieres ver cómo funciona?</b><small>Entra a la versión de prueba: una lección de muestra y datos inventados. Sin cuenta.</small></span>
        <span class="btn btn-peq btn-sol">Probar</span>
      </a>`}
    </div></div>`;

  const caja = root.querySelector('#caja');

  function pintar() {
    root.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-selected', b.dataset.modo === modo));
    if (modo === 'entrar') pintarEntrar(); else pintarCodigo(codigoUrl);
  }

  function pintarEntrar() {
    caja.innerHTML = `<form class="pila" id="fEntrar" novalidate>
      <h2>¡Hola de nuevo! 👋</h2>
      <div class="campo"><label for="eCorreo">Correo</label><input id="eCorreo" type="email" autocomplete="email" inputmode="email" required></div>
      <div class="campo"><label for="eClave">Contraseña</label><input id="eClave" type="password" autocomplete="current-password" required></div>
      <p class="error" id="eErr" role="alert"></p>
      <button class="btn bloque" type="submit">Entrar</button>
      <button class="link" type="button" data-olvido>Olvidé mi contraseña</button>
    </form>`;
    const f = caja.querySelector('#fEntrar');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = caja.querySelector('#eErr');
      err.textContent = '';
      try {
        await datos.ingresar(f.eCorreo.value, f.eClave.value);
        ctx.navegar('#/');
      } catch (x) { err.textContent = x.message; }
    });
    caja.querySelector('[data-olvido]').addEventListener('click', () => abrirHoja({
      titulo: 'Recuperar contraseña',
      cuerpo: `<p class="suave">Te enviamos un correo con un link para crear una contraseña nueva.</p>
        <div class="campo"><label for="oCorreo">Tu correo</label><input id="oCorreo" type="email" inputmode="email" autocomplete="email" value="${esc(f.eCorreo.value)}" autofocus></div>
        <p class="error" id="oErr" role="alert"></p>`,
      pie: '<button class="btn" data-enviar>Enviar correo</button>',
      montar: (el) => el.querySelector('[data-enviar]').addEventListener('click', async () => {
        if (MODO_DEMO) { cerrarHoja(); aviso('En la demostración no se envían correos.', { emoji: '🧪' }); return; }
        try {
          await datos.recuperarClave(el.querySelector('#oCorreo').value);
          cerrarHoja();
          aviso('Listo. Revisa tu correo (y la carpeta de spam).', { emoji: '📧', ms: 6000 });
        } catch (x) { el.querySelector('#oErr').textContent = x.message; }
      }),
    }));
  }

  function pintarCodigo(inicial) {
    caja.innerHTML = `<form class="pila" id="fCodigo" novalidate>
      <h2>Crea la cuenta de tu familia</h2>
      <p class="suave">El equipo de Learnground te dio un código. Escríbelo aquí.</p>
      <div class="campo"><label for="cCodigo">Código de invitación</label><input id="cCodigo" class="codigo-input" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="LEARN-XXXXXX" value="${esc(inicial)}"></div>
      <p class="error" id="cErr" role="alert"></p>
      <button class="btn bloque" type="submit">Continuar</button>
    </form>`;
    const f = caja.querySelector('#fCodigo');
    const validar = async () => {
      try {
        const inv = await datos.revisarCodigo(f.cCodigo.value);
        pintarDatos(inv);
      } catch (x) { caja.querySelector('#cErr').textContent = x.message; }
    };
    f.addEventListener('submit', (e) => { e.preventDefault(); validar(); });
    // Si llegó por el link de invitación, revisar el código de una vez
    if (inicial) validar();
  }

  function pintarDatos(inv) {
    caja.innerHTML = `<form class="pila" id="fCuenta" novalidate>
      <div class="ok-caja">✅ Código válido${inv.nota ? ` para <b>${esc(inv.nota)}</b>` : ''}.</div>
      <h2>${inv.rol === 'familia' ? 'Tus datos (papá o mamá)' : 'Tus datos'}</h2>
      <div class="campo"><label for="rNombre">Tu nombre</label><input id="rNombre" autocomplete="name" required></div>
      <div class="campo"><label for="rCorreo">Correo</label><input id="rCorreo" type="email" autocomplete="email" inputmode="email" required><small>Aquí te llegan los avisos y la recuperación de contraseña.</small></div>
      ${inv.rol === 'familia' ? `<div class="campo"><label for="rCel">Celular (WhatsApp)</label><input id="rCel" type="tel" inputmode="tel" autocomplete="tel" placeholder="300 123 4567" required><small>Para avisarte de pagos y novedades por WhatsApp.</small></div>` : ''}
      <div class="campo"><label for="rClave">Contraseña</label><input id="rClave" type="password" autocomplete="new-password" minlength="8" required><small>Mínimo 8 caracteres. No la compartas con otras familias.</small></div>
      <p class="error" id="rErr" role="alert"></p>
      <button class="btn bloque btn-verde" type="submit">Crear cuenta</button>
    </form>`;
    const f = caja.querySelector('#fCuenta');
    f.rNombre.focus();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const cel = f.rCel ? f.rCel.value.replace(/\D/g, '') : '';
        if (f.rCel && cel.length < 10) { caja.querySelector('#rErr').textContent = 'Escribe tu celular de WhatsApp (10 dígitos).'; return; }
        await datos.registrarFamilia({ codigo: inv.codigo, nombre: f.rNombre.value, correo: f.rCorreo.value, clave: f.rClave.value, celular: cel });
        confeti();
        if (inv.rol === 'familia') {
          aviso('¡Cuenta creada! Ahora creen juntos el perfil de su hijo o hija.', { emoji: '🎉', ms: 5000 });
          ctx.navegar('#/perfiles');
        } else {
          aviso('¡Ya eres parte del equipo de Learnground!', { emoji: '🎉', ms: 5000 });
          ctx.navegar('#/equipo');
        }
      } catch (x) { caja.querySelector('#rErr').textContent = x.message; }
    });
  }

  root.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { modo = b.dataset.modo; pintar(); }));
  root.querySelectorAll('[data-demo]').forEach((b) => b.addEventListener('click', async () => {
    const quien = b.dataset.demo;
    await datos.ingresar(`${quien}@tareki.demo`, 'tareki');
    ctx.navegar('#/');
  }));
  pintar();
}
