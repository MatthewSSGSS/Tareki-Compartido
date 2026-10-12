// @ts-nocheck — Este archivo corre en Supabase (Deno). VS Code no conoce Deno y lo marcaría en rojo.
// =============================================================================
// Función "avisos" — envía las notificaciones push de Tareki.
//
// Tres formas de llamarla:
//   • { tipo: "prueba" }               (usuario con sesión) → aviso de prueba a sus dispositivos.
//   • { tipo: "leccion", leccion_id }  (cuenta de equipo)   → "¡Tienes una lección nueva!" a la familia.
//   • { tipo: "diario" } + x-cron-secret (tarea de las 6 p. m.) → racha en peligro / lecciones sin abrir.
//
// El texto va CIFRADO dentro del push (RFC 8291, aes128gcm), como lo exigen Apple,
// Google, Mozilla y Microsoft. Así funciona en Android, iPhone/iPad (app instalada),
// Mac y Windows sin que el servicio de push pueda leer el mensaje.
//
// Secretos (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:correo), CRON_SECRET
// Importante: desactivar "Verify JWT" en esta función (la tarea programada no trae sesión).
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const VAPID_PUBLICA = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVADA = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUJETO = (Deno.env.get("VAPID_SUBJECT") ?? "").trim();
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

// --- base64url ----------------------------------------------------------------------------
function aB64u(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function deB64u(texto: string): Uint8Array {
  const s = texto.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
const unir = (...partes: Uint8Array[]) => {
  const out = new Uint8Array(partes.reduce((s, p) => s + p.length, 0));
  let i = 0;
  for (const p of partes) { out.set(p, i); i += p.length; }
  return out;
};
const texto = (s: string) => new TextEncoder().encode(s);

// --- Firma VAPID (JWT ES256): prueba ante el servicio de push que el aviso es nuestro ----------
let claveFirma: CryptoKey | null = null;
async function jwtVapid(audiencia: string): Promise<string> {
  if (!claveFirma) {
    const pub = deB64u(VAPID_PUBLICA); // 0x04 | x (32) | y (32)
    claveFirma = await crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", d: VAPID_PRIVADA, x: aB64u(pub.slice(1, 33)), y: aB64u(pub.slice(33, 65)), ext: true },
      { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"],
    );
  }
  const cab = aB64u(texto(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const dat = aB64u(texto(JSON.stringify({ aud: audiencia, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: VAPID_SUJETO })));
  const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, claveFirma, texto(`${cab}.${dat}`));
  return `${cab}.${dat}.${aB64u(new Uint8Array(firma))}`;
}

// --- Cifrado del mensaje (RFC 8291 + RFC 8188, aes128gcm) ---------------------------------------
async function hkdf(sal: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: sal, info }, k, bytes * 8));
}

async function cifrar(mensaje: Uint8Array, p256dh: string, authSecreto: string): Promise<Uint8Array> {
  const uaPublica = deB64u(p256dh);              // llave del dispositivo (65 bytes)
  const auth = deB64u(authSecreto);              // secreto del dispositivo (16 bytes)
  const efimera = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublica = new Uint8Array(await crypto.subtle.exportKey("raw", efimera.publicKey));
  const uaLlave = await crypto.subtle.importKey("raw", uaPublica, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const compartido = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaLlave }, efimera.privateKey, 256));

  const ikm = await hkdf(auth, compartido, unir(texto("WebPush: info\0"), uaPublica, asPublica), 32);
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(sal, ikm, texto("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(sal, ikm, texto("Content-Encoding: nonce\0"), 12);

  const llave = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, llave, unir(mensaje, new Uint8Array([2]))));

  const rs = new Uint8Array([0, 0, 16, 0]); // tamaño de registro 4096
  return unir(sal, rs, new Uint8Array([asPublica.length]), asPublica, cifrado);
}

type Sub = { endpoint: string; p256dh: string; auth: string };
type Aviso = { titulo: string; cuerpo: string; url: string; tag: string };

async function enviarPush(s: Sub, aviso: Aviso): Promise<{ status: number; razon: string }> {
  const cuerpo = await cifrar(texto(JSON.stringify(aviso)), s.p256dh, s.auth);
  const res = await fetch(s.endpoint, {
    method: "POST",
    headers: {
      TTL: "86400", Urgency: "high", "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream",
      Authorization: `vapid t=${await jwtVapid(new URL(s.endpoint).origin)}, k=${VAPID_PUBLICA}`,
    },
    body: cuerpo,
  });
  const razon = res.ok ? "" : (await res.text().catch(() => "")).slice(0, 200);
  if (res.ok) await res.body?.cancel();
  return { status: res.status, razon };
}

// deno-lint-ignore no-explicit-any
async function enviarAUsuario(admin: any, userId: string, aviso: Aviso) {
  const { data: subs } = await admin.from("suscripciones").select("endpoint, p256dh, auth").eq("user_id", userId);
  let enviados = 0;
  const errores: { servicio: string; status: number; razon: string }[] = [];
  for (const s of subs ?? []) {
    const servicio = new URL(s.endpoint).host;
    try {
      const { status, razon } = await enviarPush(s, aviso);
      if (status === 404 || status === 410) await admin.from("suscripciones").delete().eq("endpoint", s.endpoint); // dispositivo dado de baja
      else if (status >= 200 && status < 300) enviados++;
      else { errores.push({ servicio, status, razon }); console.error("push", status, servicio, razon); }
    } catch (e) {
      errores.push({ servicio, status: 0, razon: String(e).slice(0, 200) }); console.error("push error", e);
    }
  }
  return { enviados, total: subs?.length ?? 0, errores };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!VAPID_PUBLICA || !VAPID_PRIVADA || !VAPID_SUJETO) return responder({ error: "Faltan los secretos VAPID en Supabase." }, 500);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const entrada = await req.json().catch(() => ({}));

  // Tarea programada de las 6 p. m.
  if (entrada?.tipo === "diario") {
    if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) return responder({ error: "no autorizado" }, 401);
    const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date()); // AAAA-MM-DD
    const { data: filas, error } = await admin.rpc("avisos_diarios", { p_dia: dia });
    if (error) return responder({ error: error.message }, 500);
    let enviados = 0;
    for (const f of filas ?? []) {
      const { error: repetido } = await admin.from("avisos_enviados").insert({ user_id: f.user_id, clave: f.clave });
      if (repetido) continue; // ya se envió hoy
      const r = await enviarAUsuario(admin, f.user_id, { titulo: f.titulo, cuerpo: f.cuerpo, url: f.url, tag: f.clave.split(":")[0] });
      enviados += r.enviados;
    }
    return responder({ ok: true, avisos: filas?.length ?? 0, enviados });
  }

  // Lo demás necesita una sesión
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: sesion } = await admin.auth.getUser(token);
  const usuario = sesion?.user;
  if (!usuario) return responder({ error: "no autorizado" }, 401);

  if (entrada?.tipo === "prueba") {
    return responder(await enviarAUsuario(admin, usuario.id, {
      titulo: "¡Los avisos de Tareki funcionan! ✅", cuerpo: "Así te avisaremos de lecciones nuevas y de la racha 🔥", url: "#/", tag: "prueba",
    }));
  }

  if (entrada?.tipo === "leccion" && entrada.leccion_id) {
    const { data: perfil } = await admin.from("perfiles").select("rol").eq("id", usuario.id).maybeSingle();
    if (perfil?.rol !== "equipo") return responder({ error: "no autorizado" }, 403);
    const { data: l } = await admin.from("lecciones").select("id, titulo, nino:ninos(nombre, familia_id)").eq("id", entrada.leccion_id).maybeSingle();
    if (!l?.nino) return responder({ error: "lección no encontrada" }, 404);
    const { error: repetido } = await admin.from("avisos_enviados").insert({ user_id: l.nino.familia_id, clave: `leccion:${l.id}` });
    if (repetido) return responder({ ok: true, repetido: true });
    return responder(await enviarAUsuario(admin, l.nino.familia_id, {
      titulo: `🎁 ¡${l.nino.nombre}, tienes una lección nueva!`, cuerpo: `«${l.titulo}» ya está lista. ¡A jugar! 🎮`, url: `#/leccion/${l.id}`, tag: `leccion-${l.id}`,
    }));
  }

  return responder({ error: "solicitud no válida" }, 400);
});
