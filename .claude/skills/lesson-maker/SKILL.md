---
name: "lesson-maker"
description: "Crea una lección interactiva de Lección Divertida (página HTML con explicación, juegos, jefe final, simulacro y tips para el papá) a partir de la foto de una tarea o una lista de temas del colegio."
---

# Lección Divertida: lección interactiva desde una tarea

El usuario manda la foto de una tarea, de una página del libro o de la lista de temas de un quiz o taller (a veces con "dame uno con estos temas" o "lo mismo pero con este"). Tú entregas **una sola página HTML**, publicada como artifact y enviada también como archivo, para que un papá o una mamá que no es profesor le enseñe a su hijo(a) de primaria **jugando**. Todo va en español de Colombia, cálido y sencillo.

## 1. Lee la foto y fija el nivel

- Saca de la foto: materia, grado o curso ("4A" = 4.º; "Ciclo 2" = 3.º y 4.º), temas exactos y fechas.
- **Ajusta el lenguaje y la dificultad al grado real.** Esta es la lección más importante que aprendimos: a una niña de 3.º no se le dice "despejar x", "incógnita" ni "operación inversa". Se dice "¿qué número va en el cuadrito? ☐ + 5 = 12", "hacer lo contrario", "contar con los dedos". Usa números pequeños y palabras de niño. Si dudas del grado, pregunta una sola cosa o asume el más bajo.
- Evita números negativos y temas que no estén en la lista.

## 2. No inventes datos

- Obras literarias: busca en la web título exacto, autor(a), país, editorial y títulos de los capítulos o cuentos. Si el taller escribe mal el título, di cuál es el real.
- **Nunca inventes la trama.** Si no pudiste verificarla, la pestaña Libro es una guía de lectura con diario; los juegos y el examen solo preguntan lo verificado (autor, títulos, cuántos cuentos, partes del cuento). Díselo al usuario y ofrece agregar preguntas si te manda fotos o resúmenes.
- Contenido de ciencias, matemáticas y lengua: correcto y según lo que se enseña en Colombia a esa edad.
- Cita las fuentes web en la respuesta.

## 3. Si viene el perfil del niño, hazla a su medida

A veces el mensaje trae un bloque que empieza con `PERFIL DE … PARA SU PRÓXIMA LECCIÓN (Learnground)`. Lo arma la app con lo que el niño(a) ya jugó. Úsalo así (el contenido de la tarea siempre manda; el perfil solo decide **cómo** se enseña):

- **Juegos de sus últimas lecciones:** repite como máximo 2 de esos, y solo si están en sus favoritos. El resto, cámbialos por mecánicas que no ha visto (catálogo del punto 5).
- **Favoritos:** incluye 1 o 2, con contenido nuevo. Son su gancho para empezar.
- **Los evita:** no los pongas. Si el tema lo pide, usa otra mecánica para lo mismo.
- **Le cuestan:** si los incluyes, que en normal traigan más pistas y menos rondas.
- **Temas débiles:** si son de la misma materia que la tarea, agrega un grupo de juegos **🔁 Repaso** con un juego de esos temas y mete 1 o 2 preguntas de ellos en la ficha. Si son de otra materia, no los mezcles: menciónalos en los Tips para el papá.
- **Gustos, animal y color favorito:** úsalos en la historia, los ejemplos y los problemas ("Juan Pablo mete 3 goles…"), en el villano del jefe final y en el acompañante de la aventura. Sin exagerar: que no distraiga del tema.
- **Ritmo:** si estudia menos de 10 minutos, juegos más cortos (menos rondas con `lv`) y un plan de Tips en bloques de 10 a 15 minutos. Si no ha estudiado en días, el primer juego del menú debe ser uno de sus favoritos.
- **Responde muy rápido (adivinando):** menos juegos de velocidad y más de pensar: encontrar el error, ordenar, explicar "¿por qué?" eligiendo la razón.
- En la respuesta final agrega una línea **"Hecha para {nombre}"** con 2 o 3 cosas que cambiaste por su perfil.

Sin perfil, igual rota los juegos: no repitas el mismo menú de la lección anterior.

## 4. Parte de la plantilla (no empieces de cero)

Ya existe un motor probado. Lee con la acción `read` de la herramienta Artifact la lección más reciente del usuario y úsala como plantilla. Si no la encuentras, lista sus artifacts y busca una de Lección Divertida (por ejemplo "Sustantivos, palabras y cuentos" o "Romanos, ecuaciones y ángulos"). Guarda el HTML y trabaja sobre una copia.

La página es un solo archivo, con un `<style>` y un `<script>`. Dentro del script, los bloques van en este orden y se reconocen por sus comentarios:

1. Utilidades de la página: `$`, `esc`, `store`/`read`/`readJSON` (siempre con try/catch), `fold`, `PHOTO`, `KEY`, nombre del niño(a), `kp()`, `record()`.
2. `speak()` (voz del teléfono, es-CO) y sonidos: `beep`, `SFX`, `confetti`, `pick`.
3. **Motor** (no se toca): dificultad (`DIFF`, `HARD()`, `lv(normal, dificil)`, `setDiff`, `fieldOf`), `INFO`, `DECO`, `startGame` (pantalla de inicio más cuenta 3-2-1), `arena` (HUD con corazones, racha 🔥, puntaje, tiempo, Lulo el delfín rosado 🐬), `finish`, `gameOver`, `plus`, `ring`.
   - **Lulo es un delfín rosado 🐬**, la mascota de Learnground (no un búho). Si la plantilla todavía dice "búho" o usa 🦉 (en el HUD, el saludo del nombre, el simulacro…), cámbialo por "delfín" y 🐬 en todas partes. La clase CSS `owl` puede quedarse igual.
   - Lo único más que se le agrega al motor es el **registro de partidas** (ver abajo). Si la plantilla ya lo trae, déjalo igual.
4. **Contenido del tema** (`// Contenido: …`): **esto es lo que se reescribe** en cada lección.
5. Juegos reutilizables: `dragTo`, `loseCheck`, globos, topos, rayo veloz, une las parejas, memoria y sopa de letras.
6. `// Juegos nuevos de …`: juegos propios del tema.
7. `// Desafío 1: Jefe final` y `// Desafío 2: Examen final`.
8. `// Instrucciones de cada juego y menú` (`INFO`, `GROUPS`, `gamesMenu`).
9. `// Pestañas de la lección` (`TIPS`, `panes`) y, al final, las pestañas, el nombre y el arranque.

### Lo que debe exponer el bloque de contenido

Los juegos reutilizables llaman estas funciones. Mantén los mismos nombres y formas:

- `mcPool(n)`: preguntas de selección múltiple `{pregunta, opciones[], correcta, explicacion, img?}`. En modo normal son 3 opciones y en difícil 4. Mejor generadores que listas fijas, para que cada partida sea distinta. `img` es un SVG opcional (lo usan globos, topos, jefe y examen).
- `tfPool(n)`: afirmaciones `{s, v, x}`, y `tfQ(t)` para convertirlas en pregunta.
- `fillPool(n)`: ejercicios para completar `{enunciado, respuesta:"a|alternativa", why}`. Evita respuestas que solo difieran en tildes o en la ñ (mono/moño), porque la revisión las ignora.
- `linkPairs(n)`: pares `{l, r}` para unir. `memPairs(n)`: pares `{palabra, significado}` para la memoria.
- `TIPOS` y `relRows()`: las 4 filas de "Relaciona" del examen, sin respuestas ambiguas.
- `SOUP_WORDS`: pares `[conTilde, sinTilde]` de máximo 10 letras.
- `rainRounds()`: 4 rondas `{label, hint, good(), bad()}`.
- Textos del jefe final (nombre, `TAUNTS`, `HITS`, medalla) y encabezado del examen (materia, título, grado).

### Registro de partidas (para el equipo; el niño no lo ve)

Learnground guarda cómo le fue al niño en cada partida para analizar sus habilidades y armarle rutinas a los papás. Copia esto tal cual, justo después de `gameOver`:

```js
// ---------- Registro de partidas (para el equipo de Learnground; el niño no lo ve) ----------
const REG = "ld-" + KEY + "-registro";
let jugando = null; // juego abierto: { id, hab }
function anotar(A, fin, ok, total){
  if(!jugando || !A || A.anotado || !A.inicio) return;
  A.anotado = true;
  const r = readJSON(REG, []);
  r.push({ j: jugando.id, h: jugando.hab || "", m: HARD() ? "d" : "n",
    ok: ok ?? A.aciertos, n: total ?? (A.aciertos + A.errores), err: A.errores,
    seg: Math.round((Date.now() - A.inicio) / 1000), fin, d: new Date().toLocaleDateString("en-CA") });
  store(REG, r.slice(-300));
}
```

Y conéctalo en 5 puntos del motor:

1. **`arena`**: guarda el objeto que retorna en `const A = { … }` y haz `return A;`. Agrégale `inicio: 0, aciertos: 0, errores: 0, anotado: false`. Al principio de `say(msg, mood)` cuenta: `if(mood === "ok") this.aciertos++; else if(mood === "bad") this.errores++;` (`praise` y `oops` pasan por `say`, así que no cuentes también ahí). El botón ← (`data-back`) llama `anotar(A, "salio")` antes de `stop()`.
2. **`startGame`**: justo antes de `go()` (cuando ya dijo "¡Ya!"), `A.inicio = Date.now(); A.aciertos = A.errores = 0; A.anotado = false;`.
3. **`finish`**: primera línea, `anotar(A, "termino", right, total);`.
4. **`gameOver`**: primera línea, `anotar(A, "perdio");`.
5. **`gamesMenu`**: `jugando = g;` antes de `g.run(…)`, y `jugando = { id: "boss", hab: "" };` antes de `bossGame(…)`.

Por eso, en los juegos propios, cada acierto avisa con `A.praise()` o `A.say(…, "ok")` y cada error con `A.oops()` o `A.say(…, "bad")`; no uses esos dos ánimos para otras cosas. Nada de esto se muestra en pantalla.

## 5. Lo que debe tener la página

**Encabezado:** materia, título corto, grado, duración y "Para {nombre}". Al abrir por primera vez, pide el nombre del niño(a) y úsalo en todo con `{nombre}`.

**5 pestañas fijas arriba** (con íconos, que quepan en 390 px):

1. **📝 Aprender:** la foto de la tarea (se toca para verla grande), botones para saltar a cada tema y una sección por tema: **📌 Lo importante** (una frase), explicación en bloques cortos con 🔊, ejemplos, **💡 Truco**, recuadros de "Puedes decir: «…»" para el papá y **una ayuda interactiva por tema** (convertidor, barra que abre un ángulo, tabla que habla al tocarla…). Termina con "🎮 ¡Ahora a jugar!". Reglas de texto y trucos más abajo.
2. **Pestaña del tema:** 🔊 Palabras (vocabulario que se escucha al tocarlo) o 📖 Libro (ficha del libro, sus capítulos, partes del cuento y diario de lectura guardado en el celular) cuando hay una obra.
3. **🎮 Juegos:** selector **😊 Normal (por defecto) / 🔥 Difícil**, 🏆 Desafíos finales (Jefe final y Simulacro) y juegos agrupados por tema.
4. **✏️ Ficha:** 10 ejercicios que se revisan solos, con botones para ver respuestas y pedir otra ficha nueva.
5. **💡 Tips:** plan de unos 40 minutos por bloques, consejos, errores comunes, preguntas para hacerle y una actividad para la casa.

**Juegos:** 10 o más. Reutiliza los genéricos y **crea 3 o 4 propios del tema**, que se jueguen con el dedo (arrastrar, deslizar, construir, equilibrar, tocar dentro de una oración). Ejemplos que funcionaron: balanza para el número que falta, transportador para medir, construir ángulos arrastrando, traductor romano, caza sustantivos, detective de modificadores, arma el planeta, lluvia de cosas.

**Variedad (los niños se aburren si todo es lo mismo):**

- **Máximo la mitad** de los juegos pueden ser de "pregunta y elige la respuesta" (globos, topos, rayo veloz y cualquier variante con otro dibujo). Cambiar el dibujo no cuenta como juego nuevo: lo que cuenta es lo que hace el dedo.
- **Incluye al menos 2 del catálogo de abajo** en cada lección, alternándolos entre lecciones.
- **Nombres estables:** el mismo juego se llama igual en todas las lecciones (por ejemplo, siempre "🕵️ Lulo se equivocó"), porque la app reconoce los juegos por su nombre para saber cuáles le gustan.

**Catálogo de juegos de otras mecánicas** (regístralos en `GAMES`, `GROUPS` e `INFO` como los demás, con su campo de estrellas terminado en `S`):

1. **🕵️ Lulo se equivocó** (`fixS`): Lulo muestra 6 a 8 ejercicios resueltos, oraciones o datos; algunos tienen un error. El niño toca la parte equivocada (la palabra, el número, el paso) y elige la corrección. Normal: dice cuántos errores hay y da pista. Difícil: no dice cuántos, hay casos correctos de trampa y hay tiempo. Sale de los mismos generadores: una opción incorrecta de `mcPool` o una afirmación falsa de `tfPool` hecha texto.
2. **🔐 Escape room** (`escapeS`): una puerta con 3 candados (4 en difícil). Cada candado es un reto distinto (ordenar, completar, unir, una cuenta) y cada uno, al resolverse, entrega un dígito del código final. Pistas en normal; en difícil, tiempo total y la pista cuesta un corazón. Historia corta con los gustos del niño si hay perfil.
3. **🗺️ La aventura** (`aventuraS`): 5 a 7 escenas de una historia; en cada una hay que responder para avanzar. Si se equivoca, toma un desvío con la explicación y vuelve a intentar. Hay 3 finales según cuántas acertó a la primera. El protagonista es el niño, con su nombre.
4. **👨‍👩‍👧 Reto en familia** (`familiaS`): dos jugadores en el mismo celular, por turnos ("Pásale el celular a papá o mamá"). El adulto recibe preguntas de difícil y el niño de normal; marcador y celebración al final. Las estrellas son por las respuestas del niño. Mete a los papás en el juego.
5. **🏃 Corre y salta** (`saltaS`): un personaje corre solo y llegan 3 puertas o carriles con respuestas; el niño toca el carril correcto para saltar. Normal más lento; difícil más rápido y con obstáculos. Solo CSS y `requestAnimationFrame`, sin librerías.
6. **🧪 El laboratorio** (`labS`): construir la respuesta arrastrando piezas (la fracción en la pizza, las palabras de la oración, los pasos del proceso, las partes del circuito) y tocar "¡Probar!". Si está mal, muestra qué pieza sobra o falta.

**🧠 Cada juego entrena una habilidad (sin que el niño lo sepa):** cada juego de `GROUPS` lleva el campo `hab` con una de estas 7 (escritas así, sin tildes):

| `hab` | Qué entrena | Juegos típicos |
|---|---|---|
| `memoria` | recordar y relacionar | Memoria, Une las parejas, Arma el planeta (ubicar partes) |
| `atencion` | fijarse en detalles, ignorar lo que sobra | Sopa de letras, Lluvia de cosas, Toca la parte, 🕵️ Lulo se equivocó |
| `logica` | clasificar, ordenar, deducir | ¿A dónde va?, ordenar pasos o secuencias, 🔐 Escape room, balanza, 🧪 El laboratorio |
| `rapidez` | responder bien y rápido | Revienta el globo, Atrapa el topo, Rayo veloz |
| `lenguaje` | leer, comprender, formar palabras | Arma la palabra, 🗺️ La aventura, completar oraciones |
| `coordinacion` | mano y ojo, precisión y tiempo | 🏃 Corre y salta, arrastrar con precisión (transportador, construir ángulos) |
| `creatividad` | inventar o construir algo propio | dibujar, inventar una oración o un problema, armar con varias respuestas válidas |

- Escoge la habilidad que **más** usa el juego (lo que hace el dedo y la cabeza, no el tema). 👨‍👩‍👧 Reto en familia lleva la del tipo de reto que trae.
- En cada lección, **al menos 4 habilidades distintas** y máximo 3 juegos de la misma.
- La habilidad **nunca se muestra**: ni en la tarjeta, ni en `INFO`, ni en la descripción. El niño solo juega; la app la lee de `GAMES` para el equipo y los papás.

**💡 Trucos para aprender:** cada tema lleva 1 o 2 tarjetas "💡 Truco" en Aprender: un atajo o una regla para recordar ("×10: a un número entero ponle un 0 al final: 25 × 10 = 250", "antes de p y b siempre va m", la tabla del 9 con los dedos, una frase para recordar los planetas en orden).
- Solo trucos que **siempre** se cumplan en el nivel del niño. Si tienen excepciones, dilas ("con números con coma, la coma se corre un puesto").
- En modo normal, la pista de un juego puede ser el truco ("💡 Acuérdate del truco: …").
- En 💡 Tips, una lista "Trucos para repasar en la casa".

**✂️ Menos texto, sin perder los conceptos:** los niños se aburren con muros de texto, pero las definiciones se quedan completas. Lo que se corta es la palabrería, no el concepto.
- Cada tema empieza con **📌 Lo importante**: una frase de máximo 20 palabras.
- La explicación va en **máximo 3 bloques** de unas 35 palabras (3 líneas en celular), cada uno con la palabra clave en negrita y un botón 🔊 que lo lee con `speak()`. Si hay 3 o más cosas, mejor lista que párrafo.
- Lo demás se enseña con ejemplos, dibujos, tarjetas "¿Sabías que…?" y la ayuda interactiva. Lo extra va en `<details>` "📖 Quiero saber más".
- En los juegos: instrucciones (`how`) de máximo 2 frases cortas y preguntas de máximo 25 palabras. Lecturas largas solo si la tarea es de comprensión lectora.

**🌈 Siempre en positivo:** el niño tiene que salir con ganas de volver.
- Nunca le digas "Incorrecto", "Mal", "Error", "Perdiste", "Fallaste" ni "Game over". Sí: "¡Casi!", "¡Uy, por poquito!", "Mira esta pista 💡", "¡Cada intento te hace más fuerte! 💪".
- Cuando se equivoca, `OOPS` anima y **siempre viene con la pista o la explicación**, no solo "intenta otra vez".
- `PRAISE` celebra también el esfuerzo: "¡Se nota que practicaste!", "¡Pensaste muy bien, {n}!".
- Con 1 estrella: "¡Buen comienzo! Cada partida te sale mejor". Si el jefe gana: "¡{villano} se salvó por poquito! Vuelve más fuerte 💪".
- En la ficha y el simulacro, lo que quedó mal se marca con 🔸 "Revisa esta" y su explicación (no con ❌). La escala de notas se queda igual, pero debajo de la nota va una frase de ánimo según el nivel; en Bajo: "¡Vas en camino! Repasa las que se te escaparon y vuelve a intentarlo 💪".
- En los Tips para el papá, igual: nada de "débil" ni "le va mal"; sí "su próximo reto", "está fortaleciendo".

**🔁 Las que fallaste vuelven:** guarda en el navegador las preguntas que el niño falla (clave `ld-<tema>-fallas`, máximo 20, con try/catch). `mcPool` y `tfPool` mezclan primero hasta 2 de esas en cada partida, y una pregunta sale de la lista cuando la acierta 2 veces. Así lo que le costó reaparece hasta que lo domina.

Cada juego tiene:

- Pantalla de inicio, cuenta regresiva, sonidos, confeti, racha y de 1 a 3 estrellas.
- En **difícil**: tiempo, 3 corazones, trampas (bombas), sin pistas, números más grandes, y al perder, la opción de pasar a normal.
- En **normal**: pistas, más tiempo y nada de vidas.

**Desafíos:**

- **Jefe final:** un villano con nombre del tema (Contaminón, Borrón, Enredón…), barra de vida, 3 corazones, golpe crítico x2, fase "furioso" y, en difícil, se cura y tapa las respuestas.
- **Simulacro:** hoja de examen con selección múltiple, verdadero o falso, completar y relacionar. Nota de 1.0 a 5.0 con escala Superior/Alto/Básico/Bajo, corrección de cada pregunta e impresión. En normal son unas 17 preguntas sin tiempo; en difícil, 22 con 15 minutos.

**Guardado:** progreso, nombre y diario en el navegador, con claves únicas por lección (`ld-<tema>-progress`) y siempre con try/catch.

## 6. Verifica antes de entregar

1. Revisa la sintaxis: extrae el `<script>` y crea `new Function(...)` con Node.
2. Ejecuta los generadores miles de veces con Node: la respuesta correcta está entre las opciones, no hay opciones repetidas y las cuentas dan (romanos, ecuaciones, clasificaciones).
3. Prueba con Playwright en 390×844: todas las pestañas, **cada juego en normal y en difícil**, jefe final y simulacro, sin `pageerror`. Comprueba que `document.documentElement.scrollWidth` sea 390. Si algo se sale, usa `grid-template-columns: minmax(0,1fr)`.
4. Mira las capturas y corrige textos cortados, superposiciones y títulos del HUD partidos.
5. Cuenta los juegos: máximo la mitad de "pregunta y elige", al menos 2 del catálogo y, si hubo perfil, que no se repitan más de 2 de sus últimas lecciones. Prueba "Las que fallaste vuelven": falla una pregunta, empieza otra partida y comprueba que reaparece.
6. Habilidades: cada juego de `GAMES` tiene `hab` de la tabla, hay al menos 4 distintas y ninguna aparece en pantalla.
7. Registro: con Playwright termina un juego y sal de otro a la mitad con ←. `localStorage["ld-" + KEY + "-registro"]` debe tener dos entradas con `j`, `h`, `ok`, `n`, `err`, `seg` y `fin` ("termino" y "salio").
8. Texto y tono: ningún bloque de Aprender pasa de unas 40 palabras, cada tema tiene 📌 Lo importante y al menos un 💡 Truco, y busca en todo el HTML que no queden "Incorrecto", "Perdiste", "Fallaste" ni "Game over".

## 7. Entrega

- Publica un **artifact nuevo** por cada tarea (un tema = una página) y envía también el archivo `.html`.
- Si el usuario pide cambios, republica la misma ruta para conservar el enlace.
- Responde en español, corto y claro: una línea de qué se hizo; qué trae cada pestaña; la lista de juegos con una frase cada uno y su habilidad entre paréntesis (eso es para el equipo; en la página no aparece); los desafíos; y avisos honestos (qué no se pudo verificar, qué conviene hacer con materiales reales, como un transportador). Termina con una sugerencia útil y las fuentes si hubo búsqueda.
- No pongas WhatsApp ni pidas cosas por fuera de la página. El usuario no lo quiere.