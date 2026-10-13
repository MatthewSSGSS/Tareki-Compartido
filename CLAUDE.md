# CLAUDE.md

**Learnground** (antes Tareki; el repo y el proyecto de Supabase conservan el nombre viejo): app web para que cada niño (4.º grado) vea sus lecciones de Lección Divertida con su cuenta, guarde su progreso, mantenga una racha y reciba notificaciones; los papás ven el rendimiento con consejos; el equipo sube lecciones y crea códigos de invitación. Dueño: Mateo (MatthewSSGSS). Se publica en Cloudflare Pages desde este repo.

## Restricciones clave
- **El repo es público.** Nunca subir lecciones reales ni nada con nombres de niños: las lecciones van al almacén privado (Supabase Storage) desde el panel del equipo. `privado/` está en `.gitignore` para pruebas locales.
- **Sin build ni npm.** Vanilla JS con módulos ES en `public/`. `build.js` solo copia `public/` a `dist/` (Cloudflare: comando `node build.js`, salida `dist`).
- **Gratis.** Cloudflare Pages + Supabase (plan gratis).
- Textos, comentarios y nombres de funciones/variables **en español** (es-CO, tuteo). Hablar de los niños con su nombre o en neutro ("su hijo o hija").
- Debe verse bien en celular (390 px, sin desborde) y aprovechar el computador (≥ 900 px: menú lateral y tableros en columnas).

## Arquitectura (`public/js/`)
- `datos.js`: **única puerta a los datos**. Hoy en `MODO_DEMO` (localStorage, semilla en `demo.js`) e imita los permisos que pondrá Supabase con RLS. Al conectar Supabase se reescribe este archivo sin tocar las vistas.
- `puente.js`: abre la lección HTML en un `<iframe sandbox="allow-scripts">` (sin allow-same-origin). Le inyecta un `localStorage` falso lleno con lo guardado; cada cambio llega por `postMessage` y se guarda en la cuenta. Al final lee `KEY`, `FTOP`, `GAMES`, `TIPS` y si existen `bossGame`/`examFinal`/`fichaMission` para el reporte. **Las lecciones no se modifican.**
- `analisis.js`: reconoce el progreso por su forma (`{clave:{campoS, ficha100, exam100, bossS, *_h}}` y el historial `[{d,n,s,t,h}]`), calcula progreso, temas débiles, consejos para papás y medallas.
- `racha.js`: un día cuenta con un logro (cambio en claves de progreso/historial) o 5 minutos con la lección visible.
- Vistas en `js/vistas/*.js`: `render(root, ctx)` (puede ser async y devolver una función de limpieza). Rutas en `main.js`. Siempre escapar con `esc()`.
- Estilo en `css/tareki.css` (tokens del mismo diseño de las lecciones).

## Supabase (proyecto "Tareki")
- `datos.js` elige `datos-nube.js` si `config.js → NUBE` tiene url y clave publicable; si no (o con `?demo` en la URL), `datos-demo.js`. Ambos exportan las mismas funciones: cualquier función nueva va en los dos.
- `supabase/esquema.sql`: tablas, RLS, funciones (`guardar_estado`, `sumar_actividad`, `revisar_codigo`…) y el almacén privado `lecciones` (`<nino_id>/<leccion_id>.html`, se sube como text/plain). `privado/esquema-listo.sql` es la copia con el código del dueño.
- `supabase/functions/registro`: única forma de crear cuentas (registro público apagado, "Verify JWT" apagado). Reserva el código, crea el usuario y el perfil con el rol del código (`familia`, `equipo`, `dueno`). Solo el dueño crea códigos de equipo.
- Reemplazar el archivo de una lección sube `version` y conserva `estados` (el progreso).

## Mensualidad y acceso de familias
- `supabase/accesos.sql` (orden: esquema → accesos → avisos): `perfiles.acceso_hasta` (último día incluido, hora Colombia), `suspendido`, `ultimo_ingreso`; `historial_acceso`; `ajustes_cobro` (llave Bre-B, precio, WhatsApp; solo el dueño los cambia); funciones `registrar_pago`, `cambiar_acceso`, `marcar_ingreso`, `familias_resumen`.
- El bloqueo lo hace la base: `es_mi_nino()` exige `acceso_ok()`. Nunca se borran datos al vencer.
- Cobro 100 % manual (el usuario no quiere cobros automáticos): la familia ve "Cómo pagar" (`js/acceso.js`) y el equipo registra el pago en `#/equipo/familia/<id>` (`js/vistas/familias.js`). Familia bloqueada → `#/acceso`.
- Los códigos de familia traen `dias_acceso` (la función `registro` pone `acceso_hasta`). Avisos push 3 días antes, 1 día antes y el último día.
- Fechas: los momentos se guardan en UTC; para mostrarlos usar `diaDe()`/`fechaBonita()` (día local), nunca `slice(0, 10)`.

## Mensajes del equipo y quitar familias
- `supabase/mensajes.sql` (después de avisos.sql): tabla `mensajes` (destino todas/familias/equipo, `programado`, `enviado`), tarea `tareki-mensajes` cada 10 min, `quitar_familia()` (solo dueño; la app borra antes los archivos del almacén). `privado/mensajes-listo.sql` trae el CRON_SECRET y la regla de códigos del dueño.
- La función `avisos` también maneja `mensaje`, `programados`, `familia-nueva` (la llama `registro` con x-cron-secret) y `nino-nuevo` (la llama la familia al crear un perfil): estos dos avisan a todo el equipo.
- Familias: buzón en Papás y tarjeta 💌 en el inicio del niño (`js/buzon.js`); lo leído se guarda en el dispositivo.
- Animaciones: `animarPantalla()` en `ui.js` (tarjetas en cascada, barras, números que cuentan) al cambiar de pantalla; todo se apaga con "reducir movimiento".

## Notificaciones (deben servir en todo dispositivo)
- Web Push con el texto cifrado (RFC 8291 aes128gcm) en `supabase/functions/avisos` ("Verify JWT" apagado; secretos VAPID_* y CRON_SECRET en Supabase, copia en `privado/secretos-avisos.txt`). La llave pública VAPID está en `config.js`.
- `supabase/avisos.sql`: tabla `suscripciones`, `registrar_push`/`quitar_push`, `avisos_diarios(dia)` y la tarea de las 6 p. m. Colombia (23:00 UTC). `privado/avisos-listo.sql` trae el CRON_SECRET puesto.
- Avisos: lección nueva (el equipo llama `avisarLeccion` al asignar), racha en peligro o lecciones sin abrir (diario), prueba.
- `public/js/avisos.js` decide qué mostrar por dispositivo: iPhone/iPad necesita iOS 16.4+ y la app instalada en inicio; navegadores dentro de WhatsApp/Instagram no sirven. `public/sw.js` muestra el aviso y abre la URL; si cambia, subir su VERSION.

## Probar
`python -m http.server 8800 --directory public` y abrir http://localhost:8800. En modo demo: botones "Una familia" / "El equipo"; código de registro `TAREKI-DEMO`. Hay recorrido headless con Playwright (miniconda) en Edge y WebKit a 390×844 y 1366×900.
