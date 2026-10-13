// @ts-nocheck — Este archivo corre en Supabase (Deno). VS Code no conoce Deno y lo marcaría en rojo.
// =============================================================================
// Función "registro" — crea una cuenta SOLO con un código de invitación válido.
//
// El registro público de Supabase está apagado; esta función es la única puerta.
// 1. Reserva el código (si dos personas lo usan a la vez, solo una lo logra).
// 2. Crea el usuario con correo y contraseña.
// 3. Crea su perfil con el rol del código: familia, equipo o dueño.
// Si algo falla en el camino, el código vuelve a quedar libre.
//
// En Supabase: Edge Functions → nombre "registro" → pegar este código → Deploy.
// Apagar "Verify JWT" (la usan personas que todavía no tienen cuenta).
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: Record<string, unknown>) =>
  new Response(JSON.stringify(cuerpo), { headers: { ...CORS, "Content-Type": "application/json" } });
const error = (mensaje: string) => responder({ error: mensaje });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return error("Método no permitido.");

  let entrada: { codigo?: string; nombre?: string; correo?: string; clave?: string; celular?: string };
  try { entrada = await req.json(); } catch { return error("Solicitud inválida."); }

  const codigo = String(entrada.codigo || "").trim().toUpperCase();
  const nombre = String(entrada.nombre || "").trim().slice(0, 60);
  const correo = String(entrada.correo || "").trim().toLowerCase();
  const clave = String(entrada.clave || "");
  // Celular para WhatsApp (familias). Si es colombiano sin indicativo, se le pone 57.
  let celular = String(entrada.celular || "").replace(/\D/g, "").slice(0, 15);
  if (celular.length === 10 && celular.startsWith("3")) celular = "57" + celular;
  if (!codigo) return error("Escribe el código de invitación.");
  if (!nombre) return error("Escribe tu nombre.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return error("Ese correo no se ve bien.");
  if (clave.length < 8) return error("La contraseña debe tener al menos 8 caracteres.");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Reservar el código de una vez (solo si está libre y vigente)
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: inv, error: e1 } = await admin.from("invitaciones")
    .update({ usada: new Date().toISOString() })
    .eq("codigo", codigo).is("usada_por", null).is("usada", null).gte("expira", hoy)
    .select().maybeSingle();
  if (e1) return error("No pudimos revisar el código. Intenta de nuevo.");
  if (!inv) {
    const { data: existe } = await admin.from("invitaciones").select("usada, expira").eq("codigo", codigo).maybeSingle();
    if (!existe) return error("Ese código no existe. Revisa que esté bien escrito.");
    if (existe.usada) return error("Ese código ya se usó. Pídele uno nuevo al equipo de Learnground.");
    return error("Ese código ya venció. Pídele uno nuevo al equipo de Learnground.");
  }
  const liberar = () => admin.from("invitaciones").update({ usada: null }).eq("codigo", codigo).is("usada_por", null);

  // 2. Crear el usuario (el código ya prueba quién es: no hace falta confirmar el correo)
  const { data: creado, error: e2 } = await admin.auth.admin.createUser({
    email: correo, password: clave, email_confirm: true, user_metadata: { nombre },
  });
  if (e2 || !creado?.user) {
    await liberar();
    const ya = /already|registered|exists/i.test(e2?.message || "");
    return error(ya ? "Ya hay una cuenta con ese correo. Inicia sesión." : "No pudimos crear la cuenta. Intenta de nuevo.");
  }
  const id = creado.user.id;

  // 3. Perfil con el rol del código. Las familias arrancan con los días de acceso del código.
  const rol = inv.rol === "familia" ? "familia" : "equipo";
  const hoyCo = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date()); // AAAA-MM-DD
  const hasta = new Date(`${hoyCo}T12:00:00Z`);
  hasta.setUTCDate(hasta.getUTCDate() + (inv.dias_acceso || 30));
  const accesoHasta = rol === "familia" ? hasta.toISOString().slice(0, 10) : null;
  const { error: e3 } = await admin.from("perfiles").insert({ id, rol, dueno: inv.rol === "dueno", nombre, correo, acceso_hasta: accesoHasta, celular: rol === "familia" ? celular : "" });
  if (e3) {
    await admin.auth.admin.deleteUser(id);
    await liberar();
    return error("No pudimos crear la cuenta. Intenta de nuevo.");
  }
  await admin.from("invitaciones").update({ usada_por: id }).eq("codigo", codigo);
  if (rol === "familia") {
    await admin.from("historial_acceso").insert({ familia_id: id, accion: "registro", hasta: accesoHasta, nota: `Código ${codigo} (${inv.dias_acceso || 30} días)` });
  }
  // Avisar al equipo: familia nueva o compañero nuevo (si falla, la cuenta igual queda creada)
  const cron = Deno.env.get("CRON_SECRET");
  if (cron) {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/avisos`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-cron-secret": cron },
      body: JSON.stringify(rol === "familia" ? { tipo: "familia-nueva", familia_id: id } : { tipo: "miembro-nuevo", usuario_id: id }),
    }).catch(() => {});
  }

  return responder({ ok: true, rol });
});
