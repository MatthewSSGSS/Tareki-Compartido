# Handoff: rediseño visual de Learnground

Rama: `impeccable` (en el worktree `Learnground-impeccable`). Fecha: 17 de octubre de 2026.

## Qué se hizo hasta ahora

1. **Skill impeccable instalada en el repo** (`.claude/skills/impeccable/` y sus agentes en `.claude/agents/`).
2. **`PRODUCT.md`**: la verdad del producto. Usuarios de 1.º a 11.º grado; el niño y los papás pesan lo mismo; lo que nos diferencia son las lecciones a la medida, el juego y la motivación, y los papás informados.
3. **`DESIGN.md`** (y `.impeccable/design.json`): el sistema visual actual, con dos decisiones del dueño:
   - **Se retiran** los bordes de tinta de 3 px y las sombras sólidas desplazadas (4 px 4 px 0). Son lo que más "se ve hecho por IA". Siguen en el código, pero nada nuevo los usa.
   - **Idea central:** "caja de juguetes" para primaria (1.º a 5.º) y "cuaderno de juegos" para bachillerato (6.º a 11.º). Por ahora solo se diseña la de primaria; bachillerato va en otra etapa.
   - **A evitar:** que se vea como app de banco o de empresa.
4. **Crítica de diseño:** 26/40, guardada en `.impeccable/critique/2026-10-16T23-52-20Z__public-index-html.md`. Ahí están los hallazgos con archivo y línea.

## Lo que se decidió hacer

El dueño eligió empezar por **la jerarquía y el estilo nuevo**, con alcance en **los 3 problemas P1**:

- **P1. Sin jerarquía.** Todo es la misma tarjeta blanca con borde y sombra. En el celular, "¡Seguir jugando!" es el quinto bloque del inicio del niño.
- **P1. La zona del niño y la de los papás están mezcladas.** El aviso "vence / paga la mensualidad" aparece en el inicio del niño y en "¿Quién va a estudiar hoy?", y un niño entra a Papás con un solo toque.
- **P1. Papás está ordenado al revés.** "Qué hacer esta semana" (lo más valioso) queda debajo de "Tu cuenta", WhatsApp y Apariencia.

## Plan de acciones (en orden)

1. **`/impeccable shape` para definir el estilo nuevo.** Cómo se ve la caja de juguetes sin bordes ni sombras:
   - Qué da la profundidad: campos de color, tamaño, textura de sticker o ilustración.
   - Tres niveles de peso: protagonista, panel suave sin borde, y texto o chips.
   - El protagonista de cada pantalla: la próxima lección en el inicio del niño y "Qué hacer esta semana" en Papás.
   - Al terminar, actualizar `DESIGN.md` con el estilo elegido.
2. **`/impeccable distill` en el inicio del niño** (`public/js/vistas/inicio.js`):
   - Quitar bordes y sombras en todas las pantallas a la vez, en `public/css/tareki.css`. Ojo: hay un bloque "Pulido v2" desde la línea ~443 que sobrescribe reglas anteriores.
   - Meter la racha dentro del saludo.
   - Dejar "¡Seguir jugando!" arriba como protagonista.
   - Pasar las cifras y las medallas a un nivel más liviano.
3. **`/impeccable clarify` para separar niño y papás.** Sacar el aviso de cobro del inicio del niño y de los perfiles (`public/js/vistas/inicio.js`, `perfiles.js`, `public/js/acceso.js`). El cobro queda en Papás y en push o WhatsApp al adulto; al niño, como mucho, Lulo le dice "Pídele a un adulto que entre a Papás".
4. **`/impeccable harden` para el filtro de adulto.** Un paso liviano antes de entrar a Papás, por ejemplo mantener presionado o "¿cuánto es 7+5?".
5. **`/impeccable layout` en Papás** (`public/js/vistas/papas.js`):
   - Nuevo orden: KPI → Qué hacer esta semana → por tema y notas → pedir lección y chat → avisos → "Tu cuenta y ajustes" plegado al final.
   - Si el pago está por vencer, una franja delgada arriba.
   - Aquí también se arregla el desborde de "Tus pedidos" en el celular (`tareki.css` ~363-369: la columna `.lado-der` aprieta el texto a ~39 px).
6. **`/impeccable polish`** en celular (390 px) y computador (≥ 900 px).
7. **`/impeccable critique`** otra vez, para comparar con el 26/40.

## Fuera de este alcance (para después)

- **P2. Contraste:** el texto blanco sobre rosado (2.7:1), verde (2.6:1) y el naranja de la racha (~2:1) no pasa el mínimo. En modo oscuro, la tarjeta destacada queda a 1.5:1 (`tareki.css:272`, `--blue-s` no cambia con el tema).
- **P2. La regla de la racha se explica de tres formas distintas.** La real es "5 minutos o un juego terminado". Además Lulo arranca con miedo ("en peligro 😱").
- La cara de "cuaderno de juegos" para bachillerato.
- Observaciones menores (están en la crítica). Por ejemplo, `@keyframes latido` está duplicado (`tareki.css:267` y `:766`) y los datos de la demo son inconsistentes.

## Cómo probar

- Desde la raíz del worktree: `python -m http.server 8800 --directory public`, y abrir `http://localhost:8800/?demo&dev`.
- Botones "Una familia" y "El equipo" en la caja de demostración. Código de registro: `LEARN-DEMO`.
- Revisar a 375×812 y 1366×900, en tema claro y oscuro.
- **Trampa conocida:** si la pestaña del navegador está oculta, las animaciones de entrada (`.entra`, `animarPantalla()` en `ui.js`) se quedan en opacidad 0. Las tarjetas se ven vacías y el detector dice "limpio" cuando no lo está. En la consola: `document.getAnimations().forEach(a => a.finish())`.

## Reglas que no se pueden romper (de CLAUDE.md)

- El repo es público: nada de lecciones reales ni nombres de niños.
- Sin build ni npm: JS vanilla con módulos ES en `public/`.
- Las lecciones (HTML dentro del iframe) **no se modifican**. Los hallazgos del detector en `public/demo/fracciones.html` se ignoran.
- Textos, comentarios y nombres en español (es-CO, tuteo).
- Toda animación se apaga con "reducir movimiento".
- Cualquier función nueva de datos va en `datos-demo.js` y en `datos-nube.js`.

## Falsos positivos del detector (`impeccable detect --json public`)

- **Valores fuera de DESIGN.md (112):** casi todos son tamaños de emoji, el verde de WhatsApp o colores de materias. Faltan en la documentación, no son defectos.
- **`side-tab`:** solo es real la franja de los consejos (`tareki.css:480`). El menú y el visor son divisores normales.
- **Otros:** la imagen "rota" de pedidos (el `src` se pone por JS) y las rayas de "Versión de prueba" (son a propósito).
