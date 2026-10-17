---
name: Learnground
description: Lecciones a la medida para aprender jugando, con racha, medallas y papás informados.
colors:
  ink: "#1f2544"
  muted: "#4a5075"
  bg: "#eaf6ff"
  card: "#ffffff"
  soft: "#f3f8ff"
  pink: "#ff6b9a"
  sun: "#ffcf3f"
  green: "#35b862"
  blue: "#59c3ff"
  purple: "#a77bff"
  orange: "#ff9a4d"
  bad: "#d6414f"
  pink-s: "#ffd1e0"
  sun-s: "#fff1a8"
  green-s: "#c9f7d6"
  blue-s: "#d6f0ff"
  purple-s: "#e3d4ff"
  orange-s: "#ffe0b8"
  night-bg: "#121a33"
  night-card: "#1f2a4d"
  night-soft: "#26335c"
  night-ink: "#f2f4ff"
  night-muted: "#b9c0e6"
typography:
  display:
    fontFamily: "Baloo 2, Trebuchet MS, system-ui, sans-serif"
    fontSize: "2.3em"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Baloo 2, Trebuchet MS, system-ui, sans-serif"
    fontSize: "1.45em"
    fontWeight: 800
    lineHeight: 1.1
  title:
    fontFamily: "Baloo 2, Trebuchet MS, system-ui, sans-serif"
    fontSize: "1.22em"
    fontWeight: 800
    lineHeight: 1.1
  body:
    fontFamily: "Nunito, Trebuchet MS, system-ui, -apple-system, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.45
  label:
    fontFamily: "Nunito, Trebuchet MS, system-ui, -apple-system, sans-serif"
    fontSize: "0.84em"
    fontWeight: 800
    lineHeight: 1.3
  number:
    fontFamily: "Baloo 2, Trebuchet MS, system-ui, sans-serif"
    fontSize: "1.85em"
    fontWeight: 800
    lineHeight: 1.05
rounded:
  tile: "14px"
  field: "16px"
  box: "18px"
  card: "22px"
  sheet: "26px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "26px"
components:
  button-primary:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.card}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "10px 22px"
  button-white:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 22px"
  button-sun:
    backgroundColor: "{colors.sun}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 22px"
  button-small:
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "18px"
  input:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 14px"
  chip:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "1px 10px"
  nav-item-active:
    backgroundColor: "{colors.sun-s}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 14px"
  sheet:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.sheet}"
    padding: "0 18px 16px"
---

# Design System: Learnground

## Overview

**Creative North Star: "La caja de juguetes y el cuaderno de juegos"**

Learnground tiene un mismo mundo con dos caras según la edad. Para primaria (1.º a 5.º) es **la caja de juguetes**: piezas gordas y redondeadas, colores de crayola, una mascota que brinca y premios que se sienten como un sticker nuevo. Para bachillerato (6.º a 11.º) es **el cuaderno de juegos**: el mismo color y la misma tipografía, pero con más orden y menos ruido, como un cuaderno del colegio que alguien convirtió en juego. Las dos caras comparten paleta, tipografías, formas redondeadas y a Lulo; cambian la densidad, el tamaño y la cantidad de adorno. Hoy la app tiene una sola cara (la de juguetes) y la de cuaderno es la dirección para cuando se separe por grado.

El tono es cálido, cercano y alegre, nunca serio ni de oficina. El fondo es un azul cielo muy claro con puntitos suaves, como el papel de las lecciones. Cada bloque tiene un color con significado (sol para lo activo y lo premiado, rosado para la acción principal y lo nuevo, verde para el progreso, rojo coral para lo urgente) y la letra es redonda y gruesa (Baloo 2 para títulos y números, Nunito en peso 700 para el texto). Las animaciones son de rebote y entrada en cascada, y todas se apagan con "reducir movimiento".

**Decisión vigente:** los bordes oscuros gruesos (3 px en tinta) y las sombras sólidas desplazadas (4 px 4 px 0) de hoy son el rasgo que más "se ve hecho por IA" y **se retiran**. Siguen en el código hasta el rediseño, pero nada nuevo los usa. Rechazo confirmado: nada que parezca app de banco o de empresa (gris, sobrio, corporativo).

**Key Characteristics:**
- Fondo cielo claro (#eaf6ff) con puntitos de 22 px; tarjetas blancas encima.
- Paleta de crayola con un color por significado y fondos suaves de cada color para tarjetas tematizadas.
- Baloo 2 en 800 para títulos y cifras; Nunito en 700 para todo el texto.
- Formas muy redondeadas: tarjetas de 22 px, botones y chips en píldora.
- Emoji como iconografía y Lulo (delfín rosado) como voz de la app.
- Modo oscuro azul noche y un control de brillo propio en modo claro.
- Movimiento de rebote, siempre apagable.

## Colors

Paleta de crayola sobre cielo claro: colores saturados para acción y significado, sus versiones pastel para fondos de tarjeta y una tinta azul marino en lugar del negro.

### Primary
- **Rosado Lulo** (pink): el color de la marca y de la mascota. Botón principal, la mitad "ground" del logo, sello "¡Nueva!" y lecciones nuevas. Su fondo suave (pink-s) viste tarjetas de mensajes.

### Secondary
- **Amarillo Sol** (sun): lo activo y lo premiado. Pestaña o filtro seleccionado, opción elegida, anillo de foco, código de invitación, medallas ganadas (sun-s). Siempre con texto en tinta.
- **Verde Cuaderno** (green): progreso y lo que salió bien. Barras de avance, botón "¡Seguir jugando!", consejos positivos, estado "guardado".

### Tertiary
- **Azul Piscina** (blue): lección destacada (blue-s), avisos programados, columnas de gráficos. Con texto azul muy oscuro (#10233a).
- **Morado Uva** (purple) y **Naranja Mandarina** (orange): colores de perfil y de materia; sus fondos suaves dan variedad a tarjetas y chips.
- **Coral Alerta** (bad): errores, consejos de alerta, acciones peligrosas y racha en riesgo.
- **Colores de perfil:** cada niño elige uno de seis (azul, rosado, verde, amarillo, morado, naranja) y ese color pinta su saludo en el inicio.

### Neutral
- **Tinta Marina** (ink): todo el texto y, hoy, los bordes. Es azul marino, no negro.
- **Pizarra Suave** (muted): texto secundario, etiquetas y fechas (7.1:1 sobre el fondo).
- **Cielo Claro** (bg): fondo de la app, con puntitos de tinta al 9 %.
- **Papel** (card): tarjetas y hojas.
- **Nube** (soft): campos de texto, filas dentro de tarjetas, zonas de arrastre, fondo del menú en hover.
- **Modo noche** (night-*): fondo #121a33, tarjetas #1f2a4d, texto casi blanco. El modo claro además tiene un control de brillo que mezcla fondos y tarjetas hacia #2b3150 hasta un 40 %.

### Named Rules
**La Regla del Significado.** Cada color dice algo: sol = elegido o premiado, rosado = acción principal o nuevo, verde = progreso, coral = urgente. No uses un color solo para adornar si ya tiene un significado en esa pantalla.

**La Regla de la Tinta.** El texto oscuro es siempre la tinta marina (#1f2544), nunca negro puro, y va sobre sol, verdes suaves y fondos pastel.

## Typography

**Display Font:** Baloo 2 (con Trebuchet MS, system-ui)
**Body Font:** Nunito (con Trebuchet MS, system-ui, -apple-system)

**Character:** Baloo 2 es redonda, gordita y juguetona, perfecta para títulos y números que se leen de lejos. Nunito en peso 700 hace que todo el texto se vea firme y amable, fácil de leer para niños pequeños.

### Hierarchy
- **Display** (800, 1.8em en celular → 2.2–2.3em desde 900 px, 1.1): título de cada pantalla ("¡Hola, Sofía!", "¿Quién va a estudiar hoy?").
- **Headline** (800, 1.3–1.45em, 1.1): títulos de sección y de ventana.
- **Title** (800, 1.05–1.22em): nombre de la lección, títulos de tarjeta, botones.
- **Number** (Baloo 2 800, 1.6–3.2em, ~1): cifras de racha, KPI de papás y notas.
- **Body** (Nunito 700, 17 px, 1.45): todo el texto corrido.
- **Label** (Nunito 800, 0.78–0.86em): chips, metadatos, etiquetas de menú y de cifras.

### Named Rules
**La Regla del Peso Firme.** Nada de texto delgado: el cuerpo va en 700 y los títulos en 800. Los niños de primaria leen mejor letras gruesas.

**La Regla de los Números Redondos.** Toda cifra que se celebra o se compara (racha, estrellas, KPI, nota) va en Baloo 2, más grande que su etiqueta.

## Layout

- **Celular (por defecto):** una columna de máximo 680 px, 16 px de margen lateral, y menú fijo abajo de 74 px con emoji y etiqueta. Respeta las zonas seguras del iPhone. Nada se desborda a 390 px.
- **Computador (≥ 900 px):** menú lateral de 252 px a la izquierda (logo, perfil activo, opciones, pie con Apariencia y Salir) y contenido de hasta 1180 px con 28–34 px de margen. El inicio del niño usa un tablero de dos columnas (1.65fr y una lateral de mínimo 300 px que se queda fija al bajar). Papás usa KPI en 4 columnas y tarjetas en 2.
- **Ventanas:** en celular son hojas que suben desde abajo (máx. 92 % de la altura, con agarradera); desde 700 px son una caja centrada de 520 px (820 px la ancha).
- **Visor de lección:** pantalla completa con barra arriba; desde 1100 px la lección se centra en 760 px con un panel lateral de 340 px.
- **Ritmo:** espacios de 6, 10, 14, 18 y 26 px; 14 px entre tarjetas de una pila, 26–28 px antes de cada título de sección.

## Elevation & Depth

Hoy la profundidad es "recortada": bordes de tinta de 3 px y sombras sólidas desplazadas sin difuminar (4 px 4 px 0 en tarjetas y botones, 8 px 8 px 0 en ventanas). Al pasar el mouse, la tarjeta sube 1 px y su sombra crece; al tocar, se hunde hacia la sombra. **Este sistema se retira** porque se ve genérico; la profundidad del rediseño se decide en el siguiente paso de diseño. Lo que sigue vigente: la separación por color (tarjeta blanca o pastel sobre fondo cielo) y la regla de que lo que va dentro de una tarjeta es más liviano que la tarjeta.

### Shadow Vocabulary (de salida)
- **Sólida** (`box-shadow: 4px 4px 0 var(--line)`): tarjetas y botones. No usar en nada nuevo.
- **Sólida chica** (`box-shadow: 2px 2px 0 var(--line)`): filas de mensajes y piezas internas. No usar en nada nuevo.
- **Ventana** (`box-shadow: 8px 8px 0 var(--line)`): hojas en computador. No usar en nada nuevo.
- **Anillo de foco** (`box-shadow: 0 0 0 4px var(--sun)` / `outline: 4px solid var(--sun)`): foco de campos y del teclado. **Se queda.**

### Named Rules
**La Regla de lo de Adentro.** Lo que vive dentro de una tarjeta va más liviano que ella: fondo nube, sin sombra, borde fino o ninguno. La jerarquía se lee por capas.

## Shapes

Todo es redondeado y blando, como un juguete de plástico: tarjetas de 22 px, ventanas de 26 px, cajas internas de 18 px, campos de 16 px, iconos de lección de 14–22 px, y botones, chips, pestañas y filtros en píldora completa. Los avatares son círculos con un emoji grande. Las tarjetas "vacías" o "por agregar" usan borde punteado. El globo de diálogo de Lulo tiene una esquina casi recta (4 px) abajo a la izquierda que apunta a la mascota.

## Components

### Buttons
Gordos, en píldora y fáciles de tocar con el dedo.
- **Shape:** píldora completa (999 px); el botón cuadrado de icono usa 14 px y mide 42 px.
- **Primary:** rosado Lulo con letra Baloo 2 800 a 1.1em, 10 px × 22 px.
- **Variantes:** blanco (secundario), sol, verde (seguir o confirmar), azul, WhatsApp (#25d366 con texto verde oscuro), peligro (coral). Hay tamaño chico (6 × 14 px) y versión a todo el ancho.
- **Hover / Focus / Active:** al pasar el mouse sube 1 px y satura un poco; al tocar se hunde 3 px; foco con anillo sol de 4 px. Deshabilitado al 55 % de opacidad.

### Chips
- **Style:** píldoras pequeñas en Nunito 800 a 0.84em; fondo nube por defecto y variantes sol, verde suave, rosado, morado suave y rojo suave.
- **State:** los grupos de selección (grados, materias, filtros) marcan lo elegido con fondo de tinta y texto claro, o con sol.

### Cards / Containers
- **Corner Style:** 22 px.
- **Background:** blanco, o el fondo suave del color del tema (destacada en azul suave, medalla ganada en sol suave, mensaje en rosado suave). Los bloques fuertes (saludo y racha) usan color pleno o degradado (naranja a coral en la racha, gris azulado cuando se enfría).
- **Internal Padding:** 18 px (14–16 px en KPI y cifras).
- **Variantes:** vacía o por agregar con borde punteado y sin sombra; "plano" sin sombra.

### Inputs / Fields
- **Style:** fondo nube, 16 px de radio, 11 × 14 px, letra de 16 px (para que el iPhone no haga zoom).
- **Focus:** el fondo pasa a blanco con un anillo sol de 4 px.
- **Error:** mensaje en coral con peso 800 debajo del campo. El campo de código de invitación va en mayúsculas, centrado y espaciado, en Baloo 2.

### Navigation
- **Celular:** barra fija abajo con 3–4 opciones; emoji grande arriba y etiqueta en Baloo 2 800 a 0.78em. La activa lleva fondo sol suave y su emoji crece y se inclina.
- **Computador:** menú lateral con el logo de Lulo, la tarjeta del perfil activo, opciones en fila (emoji y texto a 1.05em) y el pie con Apariencia y Salir. Hover en fondo nube.

### Lulo (signature)
La mascota habla con la app: delfín rosado junto a un globo de diálogo blanco con texto en 800. Aparece en el saludo, en los estados vacíos y al cargar. Da un saltito cada 2.8 s, que se apaga con "reducir movimiento".

### Racha (signature)
Bloque de fuego con degradado naranja a coral, número enorme en Baloo 2 y la semana en 7 círculos (los días cumplidos en blanco y el de hoy subrayado). Cuando la racha se enfría pasa a gris azulado y el fuego se queda quieto.

### Tarjeta de lección
Icono de materia en un cuadro de color de 66 px, título, materia y avance, barra de progreso y pie con estrellas. Las nuevas llevan borde rosado y un sello "¡Nueva!" inclinado que late; las terminadas, un ✅ sobre el icono.

## Do's and Don'ts

### Do:
- **Do** usar la paleta por significado: sol para lo elegido o premiado, rosado para la acción principal, verde para el progreso y coral para lo urgente.
- **Do** mantener Baloo 2 800 en títulos y cifras y Nunito 700 en el texto, sin pesos delgados.
- **Do** redondear todo: 22 px en tarjetas, píldora en botones y chips.
- **Do** poner el texto oscuro en tinta marina (#1f2544) sobre sol y fondos pastel.
- **Do** dejar que Lulo y los emoji den la personalidad, con mensajes cortos y en tuteo.
- **Do** apagar toda animación con `prefers-reduced-motion` y conservar el anillo de foco sol de 4 px.
- **Do** diseñar primero a 390 px y aprovechar el computador desde 900 px (menú lateral y columnas).

### Don't:
- **Don't** agregar bordes de tinta de 3 px ni sombras sólidas desplazadas (4 px 4 px 0) a nada nuevo: se retiran del sistema.
- **Don't** hacer que se vea como una app de banco o de empresa: nada de grises sobrios, letras delgadas ni tablas frías.
- **Don't** poner texto blanco sobre el rosado (2.7:1) o el verde (2.6:1) en texto normal: no llega al contraste mínimo. Usa tinta encima o una versión más oscura del color.
- **Don't** usar negro puro para el texto o los bordes.
- **Don't** meter sombra ni borde grueso dentro de una tarjeta que ya tiene uno.
