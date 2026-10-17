# Propuestas para Learnground

Ideas para mejorar la app y las lecciones. Muchas vienen de una mamá que usa Learnground; otras salieron de conversarlas.
Están en el orden en que las vamos a hacer (7 pasos). Los juegos grandes subieron al paso 2 porque son la prioridad. No abrimos dos pasos grandes a la vez. Cuando una se termine, marquen la casilla `[x]` y anoten la fecha.

**Dónde vive cada cosa**
- 🧩 **Skill**: las lecciones HTML las hace la skill `lesson-maker` (antes `leccion-divertida`; está en `.claude/skills/lesson-maker`). Cambiar la skill mejora las lecciones *nuevas*.
- 📱 **App**: lo que construimos en este repo (fijo para todos los niños).
- 🗄️ **SQL**: necesita correr un archivo nuevo en Supabase antes de publicar.

---

## Reglas para todo lo que hagamos

1. **Siempre optimistas con los niños.** Nunca "Incorrecto", "Mal" ni "Game over". Sí: "¡Casi! Mira esta pista 💡", "¡Tu esfuerzo se nota!", "Tu héroe descansó y volvió más fuerte 💪". Se celebra el esfuerzo, no solo el acierto.
2. **Con los papás, en positivo.** Nada de "débil", "falla", "mal", "bajó" ni "le cuesta". Sí: "se destaca en…", "está fortaleciendo…", "su próximo reto es…", y siempre con una rutina para ayudar.
3. **Cada juego entrena una habilidad, sin que el niño lo sepa.** 🧠 Memoria · 🎯 Atención · 🧩 Lógica · ⚡ Rapidez · 🗣️ Lenguaje · ✋ Coordinación · 🎨 Creatividad. El niño solo juega; nosotros sabemos qué entrena. (Hablamos de *habilidades*, no de "lóbulos del cerebro": es lo que se puede medir y defender ante un papá.)
4. **Los datos detallados son solo para el equipo.** Los niños no ven sus errores contados; los papás ven la versión amable.
5. **Privacidad.** Nada de nombres de niños en este repo. La cámara y el micrófono, si se usan, nunca envían video ni audio a nuestros servidores.

---

## Paso 1: skill más inteligente · 🧩 ✅
Cada lección hecha desde ahora ya guarda los datos por habilidad, y los informes del paso 5 los necesitan.

- [x] **Habilidad escondida y registro de partidas** (ideas 3 y 4): cada juego lleva `hab`. Cada partida queda en `ld-<KEY>-registro` con aciertos, errores, tiempo, modo y cómo terminó (`termino`, `perdio` o `salio`). Viaja solo a la cuenta del niño, sin SQL. La app ya lee la `hab` de cada juego. *(17-oct-2026)*
- [x] **Trucos para aprender** (idea 16): 1 o 2 tarjetas "💡 Truco" por tema, como pista en normal y en los Tips.
- [x] **Menos texto, mejor repartido** (idea 6): "📌 Lo importante", bloques de máximo 3 líneas con 🔊 y lo extra en "📖 Quiero saber más".
- [x] **Tono optimista en las lecciones**: reglas para `OOPS`, `PRAISE`, finales, jefe, ficha, simulacro y reporte para papás.
- [x] **Skill subida a claude.ai y lección de prueba** (multiplicación): trae habilidades, registro, trucos y tono positivo.

## Paso 2: motor de juegos, tandas 1 y 2 · 📱 🧩 ✅
Los juegos grandes (tipo consola) se programan **una sola vez en la app** y la lección solo manda el contenido. Así no se cortan las lecciones, los juegos salen siempre bien y sirven para cualquier materia.

- [x] **Motor** (`public/juegos/motor-v1.js`): `LG.jugar(tipo, host, datos, opciones)`, controles táctiles y teclado, sonidos, estrellas, mensajes positivos y el mismo registro por habilidad. `puente.js` lo mete en cada lección con el nombre, el animal y el color del niño (`window.LG_NINO`). *(17-oct-2026)*
- [x] **🚀 La nave** (shoot 'em up, idea 1): rondas tipo "Dispara a los resultados de la tabla del 3", disparo triple con rachas y jefe final que se mueve y lanza fuego (se le gana disparando a la respuesta correcta). Normal sin vidas; difícil con 3 corazones. Probada con un bot en 360, 390 y 1366 px: gana, pierde, sale, juega otra vez y anota todo. Página de prueba: `/juegos/prueba.html`. *(17-oct-2026)*
- [x] **🧱 Bloques** (tipo Tetris): girar, mover, dejar caer, sombra de dónde cae y la siguiente pieza. Cada 3 piezas hay una pregunta: si acierta, gana la pieza larga 💎; en difícil, si falla sube una fila de piedra. Meta: 8 líneas (12 en difícil). En normal no se pierde: si se llena, Lulo limpia. *(17-oct-2026)*
- [x] **🍄 Plataformas** (tipo Mario): el héroe corre solo y el niño salta huecos y enemigos (caerles encima los vence), recoge estrellas y sube escalones. Las puertas con candado se abren respondiendo (se puede reintentar). Al final, la bandera 🚩. En normal, si se cae dos veces en el mismo hueco, Lulo le pone un puente. *(17-oct-2026)*
- [x] **Tanda 2** *(17-oct-2026)*:
  - 🐍 **Culebrita:** se come solo lo que pide la misión. En normal atraviesa paredes; en difícil hay paredes y 3 corazones. Siempre hay al menos una opción correcta y una incorrecta.
  - 💥 **Rompe-ladrillos:** paleta con el animal del niño. Los ladrillos ❓ traen preguntas y acertar da un poder (paleta gigante, pelota lenta, pelota bomba). Si lleva rato sin romper nada, la paleta le ayuda a apuntar.
  - ⚔️ **La batalla (RPG por turnos):** 2 enemigos y un jefe.
    - Atacar y lanzar magia son preguntas.
    - Cada enemigo tiene una debilidad que Lulo dice una sola vez (memoria).
    - Defenderse sirve cuando el enemigo carga un ataque fuerte (estrategia).
    - Hay pociones. En normal, si el héroe cae, Lulo lo cura.
- [x] **La skill aprende a usar el motor** *(17-oct-2026)*: cada lección nueva trae 2 o 3 juegos grandes en "🌟 Aventuras", escogidos según el perfil (favoritos sí, los que evita no), con las preguntas de la lección. Fuera de la app la tarjeta dice "Este juego se juega en Learnground". Probado con una lección real dentro de la app: se juega, guarda estrellas y registro. El equipo tiene el botón "🎮 Probar juegos" en su panel.

## Paso 3: arreglos rápidos en la app · 📱 ✅
- [x] **Frases en positivo para papás**: los consejos de Papás ("Su próximo reto", "Esta ficha trajo retos nuevos", "Una idea: leer con calma", "Meta de la semana"…) y el aviso diario de racha al celular ("hoy puedes llegar a N días", `supabase/avisos-positivos.sql`). *(17-oct-2026)*
- [x] **Guía "Cómo usar Learnground" para papás** (idea 13): tarjeta en Papás con 12 temas (cómo trabajamos, lecciones, juegos, racha, logros, Papás, chat y pedidos, avisos, varios hijos, mensualidad, apariencia, privacidad). *(17-oct-2026)*
- [x] **Los papás llenan los gustos del niño** · 🗄️: campo "¿Qué le gusta?" en el perfil y tarjeta 💛 en Papás; llega solo al "📋 Perfil para la próxima lección" del equipo. Necesita `supabase/gustos.sql`. *(17-oct-2026)*
- [x] **Arreglo:** en Papás, el selector de hijos no cambiaba de niño si se entraba sin escoger perfil. *(17-oct-2026)*

## Paso 4: avatar, recompensas y logros · 📱 🗄️
Hasta entonces, el héroe de los juegos grandes es el animal y el color que el niño escogió en su perfil.
- [ ] **Creador de avatar** (idea 10): el niño arma su personaje (animal, color, sombrero, arma, capa…). **Es el héroe de los juegos grandes.**
- [ ] **Recompensas**: al terminar lecciones y lograr metas desbloquea accesorios, y se le ven puestos.
- [ ] **Logros más atractivos** (idea 12): medallas con niveles (bronce, plata, oro), ligadas a las recompensas. Que no sea solo la racha.

## Paso 5: análisis e informes · 📱
Para entonces habrá semanas de datos del registro.
- [ ] **Análisis por habilidad para el equipo** (idea 4): errores por juego y por habilidad, tiempos, partidas abandonadas y evolución. Solo lo ve el equipo.
- [ ] **Sección "🌟 Cómo va [niño]" para papás** (idea 5): incluye
  - ✨ en qué se destaca;
  - 🌱 su próximo reto, con una **rutina de 10 minutos** para la casa;
  - 💬 una frase para animarlo.

  Si aún no hay datos: "Todavía estamos conociendo a…".
- [ ] **Biblioteca de rutinas por habilidad**: la redacta Claude y **el equipo la revisa y aprueba** (son las que leen los papás).
- [ ] **Informe semanal** (idea 5): aviso los domingos, "📬 El informe semanal está listo".
- [ ] **Modo padre e hijo** (idea 11): retos con mamá o papá (la skill ya tiene "👨‍👩‍👧 Reto en familia") que den **recompensas mejores** en la app.
## Paso 6: más allá de las lecciones + tanda 3 · 📱
- [ ] **Pausas activas** (idea 2): estiramientos con videos de YouTube elegidos por el equipo (modo sin cookies) y/o rutinas animadas propias, con temporizador.
- [ ] **Modo arte** (idea 8): lienzo para dibujar con colores y sellos; el dibujo se guarda o se le manda al equipo.
- [ ] **Juegos, tanda 3:** 👻 laberinto (tipo Pac-Man), 🏰 defensa de torres, 🍉 corta frutas.
- [ ] **Más imágenes y animaciones** (ideas 7 y 14): se van sumando en cada cosa nueva (respetando "reducir movimiento").

## Paso 7: lo más difícil + tanda 4 · 📱
- [ ] **Comandos de voz** (idea 7): pronunciar en inglés y leer sílabas en transición y primero.
  - Funciona en Chrome y en iPhone, no en todos los navegadores.
  - El audio pasa por Google o Apple.
  - Va en la app, no en la lección, porque las lecciones corren aisladas.
- [ ] **Juegos con cámara, tipo Kinect** (idea 9): detectar las manos con MediaPipe para mover piezas.
  - Es gratis y corre en el celular; el video no sale del dispositivo.
  - Hay que probarlo en celulares sencillos.
- [ ] **Juegos, tanda 4:** 🎵 ritmo, 🏎️ carreras, 🤖 programa al robot (idea 15: flechas, bucles y condiciones).

**Meta de juegos grandes:** 12 en el primer año, en tandas de 3, cada uno con su habilidad. Por lección: 2 o 3 juegos grandes y unos 6 sencillos de la skill. Después de cada tanda se mira en el registro cuáles juegan más los niños.

---

## Recomendaciones
- **Después del paso 4, mostrarle la app a la mamá que dio las ideas.** Su opinión puede cambiar el orden de lo que sigue.
- **Terminar un paso**, que las familias lo usen y luego seguir.

## Más ideas para considerar

- **Mascota que crece**: el animal del niño "come" con cada lección y se pone contento cuando vuelve.
- **Repaso relámpago diario**: 5 preguntas de lo que más se le ha dificultado, en 2 minutos.
- **Diploma imprimible** al terminar un tema, para pegar en la nevera.
- **Modo hermanos**: retos sanos entre niños de la misma familia.
- **Momentos de ánimo en el inicio**: "Ayer resolviste 12 retos 💪", "Tu delfín está orgulloso de ti 🐬".

## En pausa

- **Tutor con IA** para responder dudas de los niños (sería un plan aparte). Se retoma más adelante.
