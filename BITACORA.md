# Bitácora del equipo

Aquí cada persona (o su Claude) deja **qué está haciendo** y **qué terminó**, para que nadie pise el trabajo de otro.
Las reglas están en `CLAUDE.md` → "Trabajo en equipo". El plan general está en `PROPUESTAS.md`.

---

## 🚧 En curso

Antes de empezar algo, anótalo aquí (quién, qué y qué archivos va a tocar) y sube ese cambio. Al terminar, bórralo de aquí y escribe la entrada abajo.

| Quién | Qué | Archivos | Desde |
|---|---|---|---|
| — | (nadie por ahora) | — | — |

---

## ⏳ Pendiente de alguien (no de código)

- [ ] **Subir la skill a claude.ai**: `privado/skill/lesson-maker.zip`. Es local, no está en el repo; si no lo tienes, arma el zip con `.claude/skills/lesson-maker/SKILL.md` dentro de una carpeta `lesson-maker/`. Reemplaza la anterior.
- [ ] **Correr `supabase/gustos.sql`** en Supabase (gustos del niño). Mateo confirmó `avisos-positivos.sql`; falta confirmar este.
- [ ] Probar en un **iPhone real** si los títulos de los juegos se ven en negrita (en el simulador salían delgados).
- [ ] Hacer la **primera lección real con la skill nueva** y revisar que traiga "🌟 Aventuras".

---

## ✅ Terminado (lo más nuevo arriba)

### 2026-10-17 · Mateo + Claude · Versión de prueba completa (`1ac4405`)
- **Qué:**
  - Nueva lección de muestra `public/demo/muestra.html`, que reemplaza a `fracciones.html`.
  - Datos de prueba más vivos.
  - Bienvenida "🧭 Qué probar".
  - **Arreglo:** `analisis.js` confundía el registro de partidas con el historial de fichas.
- **Archivos:** `public/demo/muestra.html`, `public/js/{demo,datos-demo,recorrido,main,piezas,analisis}.js`, `public/css/tareki.css`.
- **Ojo:**
  - Si cambias los datos de `demo.js`, sube `version` ahí **y** en `datos-demo.js` (hoy van en 13).
  - La muestra no puede llevar datos de niños reales.

### 2026-10-17 · Mateo + Claude · Inscripción, juegos en celular y Salir (`acf8d8e`)
- **Qué:**
  - Pantalla de entrada: "👋 ¿Primera vez?" con los 3 pasos va arriba del formulario para entrar.
  - La ventana de inscripción va paso a paso.
  - Los juegos grandes miden la pantalla real para caber sin desplazarse.
  - Botón "🚪 Salir" en el celular (equipo y Papás).
  - "Probar juegos" tiene "← Volver al panel".
- **Archivos:** `public/js/inscripcion.js`, `public/js/vistas/{ingreso,equipo,papas}.js`, `public/juegos/{motor-v1.js,prueba.html}`, `public/css/tareki.css`.

### 2026-10-17 · Mateo + Claude · La skill usa los juegos grandes (`2c201b4`)
- **Qué:**
  - La skill `lesson-maker` pone 2 o 3 juegos del motor en "🌟 Aventuras", con `juegoGrande(tipo, datos)`.
  - Botón "🎮 Probar juegos" en el panel del equipo.
- **Archivos:** `.claude/skills/lesson-maker/SKILL.md`, `public/js/vistas/equipo.js`.
- **Pendiente:** subir la skill a claude.ai (ver arriba).

### 2026-10-17 · Mateo + Claude · Paso 3: arreglos rápidos (`bfe9eaf`)
- **Qué:**
  - Frases en positivo para papás.
  - Guía "📖 Cómo usar Learnground" (`public/js/guia.js`).
  - Gustos del niño los llena la familia.
  - **Arreglo:** el selector de hijos en Papás no cambiaba de niño.
- **SQL:**
  - `supabase/avisos-positivos.sql` (✅ corrido).
  - `supabase/gustos.sql` (⏳ confirmar). Sin él, la app funciona igual pero sin el campo de gustos.
- **Ojo:** `privado/avisos-listo.sql` está **desactualizado**. No lo corras: borraría los avisos de "tu acceso vence".

### 2026-10-17 · Mateo + Claude · Motor de juegos grandes v1 (`24a2ccd`)
- **Qué:** `public/juegos/motor-v1.js` con 6 juegos: nave, bloques, plataformas, culebrita, rompe-ladrillos y la batalla (RPG). `puente.js` lo inyecta en cada lección. La página de prueba es `/juegos/prueba.html`.
- **Ojo:** no cambies el comportamiento de `motor-v1.js` de forma que dañe lecciones ya hechas; los cambios grandes van en un `motor-v2.js`. Todo cambio se prueba en 360 y 390 px y en computador.

### 2026-10-17 · Mateo + Claude · Paso 1: skill más inteligente (`6efe9e7`)
- **Qué:**
  - Habilidad escondida (`hab`) y registro de partidas (`ld-<KEY>-registro`) en cada juego.
  - Trucos, menos texto y tono positivo en las lecciones.
- **Archivos:** `.claude/skills/lesson-maker/SKILL.md`, `public/js/puente.js`.

### 2026-10-15 · UnDauphin · Skill en el repo (`3926c85`)
- **Qué:** la skill pasó a `.claude/skills/lesson-maker` (antes `leccion-divertida`).
