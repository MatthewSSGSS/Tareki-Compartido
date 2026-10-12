# CLAUDE.md

**Tareki**: app web para que cada niño (4.º grado) vea sus lecciones de Lección Divertida con su cuenta, guarde su progreso, mantenga una racha y reciba notificaciones; los papás ven el rendimiento con consejos; el equipo sube lecciones y crea códigos de invitación. Dueño: Mateo (MatthewSSGSS). Se publica en Cloudflare Pages desde este repo.

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

## Probar
`python -m http.server 8800 --directory public` y abrir http://localhost:8800. En modo demo: botones "Una familia" / "El equipo"; código de registro `TAREKI-DEMO`. Hay recorrido headless con Playwright (miniconda) en Edge y WebKit a 390×844 y 1366×900.
