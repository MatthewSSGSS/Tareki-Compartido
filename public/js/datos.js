// =============================================================================
// datos.js — Única puerta a los datos. Las pantallas solo hablan con este archivo.
//
// Con Supabase configurado (config.js → NUBE) usa datos-nube.js; si no, o si la
// app se abre con ?demo, usa datos-demo.js (todo en este navegador).
// Ambos archivos tienen exactamente las mismas funciones.
// =============================================================================

import { MODO_DEMO } from './config.js';
import * as demo from './datos-demo.js';
import * as nube from './datos-nube.js';

const d = MODO_DEMO ? demo : nube;

export const {
  usuario, ingresar, salir, recuperarClave, estaRecuperando, cambiarClave,
  revisarCodigo, registrarFamilia, crearInvitacion, invitaciones, anularInvitacion,
  ninos, nino, guardarNino,
  lecciones, todasLasLecciones, leccion, htmlLeccion, subirLeccion, reemplazarArchivo, cambiarLeccion, borrarLeccion,
  estado, estados, guardarDatos, guardarMeta, marcarAbierta,
  sumarActividad, actividad,
  familias, reiniciarDemo,
  registrarPush, quitarPush, probarAvisos, avisarLeccion,
  marcarIngreso, olvidarPerfil, ajustesCobro, guardarAjustesCobro, familiasResumen, historialAcceso, registrarPago, cambiarAcceso,
  mensajes, crearMensaje, enviarMensajeYa, borrarMensaje, avisarNinoNuevo, quitarFamilia, cambiarCelular, borrarHistorial,
  chat, chatResumen, enviarChat, marcarChatLeido, chatSinLeer, dispositivosDe,
  chatEquipo, enviarChatEquipo, marcarEquipoVisto, equipoSinLeer, equipoConAvisos,
  pedidos, pedidosNuevos, crearPedido, cambiarEstadoPedido, borrarPedido, urlsFotos,
} = d;
