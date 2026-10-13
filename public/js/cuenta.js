// =============================================================================
// cuenta.js — Cambiar el nombre propio (lo usa el equipo: menú y Resumen).
// El nombre completo es el que ven los demás en el chat del equipo.
// =============================================================================

import * as datos from './datos.js';
import { esc } from './util.js';
import { abrirHoja, cerrarHoja, aviso } from './ui.js';

export function abrirMiNombre(usuario, alGuardar) {
  abrirHoja({
    titulo: '✏️ Tu nombre',
    cuerpo: `<div class="campo"><label for="miNombre">Nombre completo</label><input id="miNombre" maxlength="60" autocomplete="name" value="${esc(usuario.nombre || '')}" autofocus>
      <small>Así te ven tus compañeros en el chat del equipo${usuario.rol === 'equipo' ? ' (las familias ven solo tu primer nombre)' : ''}.</small></div>
      <p class="error" id="mnErr" role="alert"></p>`,
    pie: '<button class="btn btn-verde" data-guardar>Guardar</button>',
    montar: (el) => {
      const guardar = async () => {
        try {
          await datos.cambiarMiNombre(el.querySelector('#miNombre').value);
          cerrarHoja();
          aviso('Nombre actualizado.', { emoji: '✏️' });
          alGuardar?.();
        } catch (x) { el.querySelector('#mnErr').textContent = x.message; }
      };
      el.querySelector('[data-guardar]').addEventListener('click', guardar);
      el.querySelector('#miNombre').addEventListener('keydown', (e) => { if (e.key === 'Enter') guardar(); });
    },
  });
}
