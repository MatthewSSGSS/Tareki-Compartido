# Propuestas para Learnground

Ideas para mejorar la app y las lecciones. Muchas vienen de una mamá que usa Learnground; otras salieron de conversarlas.
Están en el orden en que las vamos a hacer (7 pasos): cada paso prepara el siguiente. No abrimos dos pasos grandes a la vez. Cuando una se termine, marquen la casilla `[x]` y anoten la fecha.

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

## Paso 1: mejorar la skill · 🧩 *(en curso)*
Va primero porque cada lección hecha desde ese día ya guarda los datos por habilidad, y los informes del paso 5 necesitan semanas de datos.

- [x] **Habilidad escondida y registro de partidas** (ideas 3 y 4): cada juego lleva `hab`. Cada partida queda en `ld-<KEY>-registro` con aciertos, errores, tiempo, modo y cómo terminó (`termino`, `perdio` o `salio`). Viaja solo a la cuenta del niño, sin SQL. La app ya lee la `hab` de cada juego. *(17-oct-2026, probado con Playwright)*
- [x] **Trucos para aprender** (idea 16): 1 o 2 tarjetas "💡 Truco" por tema, como pista en normal y en los Tips.
- [x] **Menos texto, mejor repartido** (idea 6): "📌 Lo importante", bloques de máximo 3 líneas con 🔊 y lo extra en "📖 Quiero saber más".
- [x] **Tono optimista en las lecciones**: reglas para `OOPS`, `PRAISE`, finales, jefe, ficha y simulacro.
- [ ] **Subir la skill nueva a claude.ai** y hacer una lección de prueba.

## Paso 2: arreglos rápidos en la app · 📱
- [ ] **Suavizar las frases actuales para papás**: "Bajó de 80 a 60", "el tema más débil", "puede estar adivinando", "Reforzar:" → regla 2.
- [ ] **Guía "Cómo usar Learnground" para papás** (idea 13): botón en Papás que explica cada función (lecciones, racha, medallas, buzón, chat, pedidos, pagos, avisos) y cómo trabaja el equipo.
- [ ] **Los papás llenan los gustos del niño** · 🗄️: campo "Gustos e intereses" en el perfil del niño. Hoy lo escribe el equipo en "📋 Perfil para la próxima lección" y solo queda en ese dispositivo.

## Paso 3: avatar, recompensas y logros · 📱 🗄️
Va antes de los juegos grandes porque **el protagonista de esos juegos es el avatar**.
- [ ] **Creador de avatar** (idea 10): el niño arma su personaje (animal, color, sombrero, arma, capa…).
- [ ] **Recompensas**: al terminar lecciones y lograr metas desbloquea accesorios, y se le ven puestos.
- [ ] **Logros más atractivos** (idea 12): medallas con niveles (bronce, plata, oro), ligadas a las recompensas. Que no sea solo la racha.

## Paso 4: motor de juegos con varios modelos · 📱 🧩
- [ ] **Motor de juegos** (idea 1): los juegos viven una sola vez en la app (`juegos/motor-v1.js`) y la lección solo trae los datos (preguntas, parejas, enemigos, escenas). Así:
  - las lecciones pesan mucho menos y Claude no se corta al escribirlas (hoy una lección pesa ~250 KB);
  - los juegos pueden ser mucho más elaborados y salen siempre bien;
  - el registro por habilidad es igual en todos.

  Versionado (`v1`, `v2`…) para no dañar lecciones viejas.
- [ ] **Modelos de juego**, todos con el avatar como protagonista. **El RPG es un ejemplo, no el único**: la idea es tener varios modelos y que se vayan rotando.
  - ⚔️ **RPG por turnos (tipo Final Fantasy pequeño).** Pelear es responder:
    - ⚔️ **Atacar:** pregunta fácil.
    - ✨ **Magia:** pregunta difícil, con elementos 🔥💧⚡.
    - 🧪 **Objetos:** ganados en lecciones.
    - 🛡️ **Defender:** cuando el enemigo carga un ataque fuerte.

    Los enemigos salen del tema y cada uno tiene una debilidad que hay que recordar. Hay mapa de mundo por capítulos y el héroe sube de nivel entre lecciones.
  - 🃏 Memoria, 🔗 unir palabras con imágenes, 🔢 ordenar.
  - 🏃 Plataformas, "corre y salta".
  - 👾 **Jefe final que ataca de verdad** (con fases, ataques y estrategia).
  - Otros por definir: aventura por escenas, escape room, simulación ("tu tiendita", "tu granja"), carreras…
- [ ] **La skill aprende a usar el motor**: escribe solo los datos de cada modelo.
- Se hace por partes y cada parte se prueba antes de seguir (por ejemplo: primero una batalla del RPG, luego niveles y objetos, luego el mapa).

## Paso 5: análisis e informes · 📱
Para entonces ya habrá un mes o más de datos del paso 1.
- [ ] **Análisis por habilidad para el equipo** (idea 4): errores por juego y por habilidad, tiempos, partidas abandonadas y evolución. Solo lo ve el equipo.
- [ ] **Sección "🌟 Cómo va [niño]" para papás** (idea 5): incluye
  - ✨ en qué se destaca;
  - 🌱 su próximo reto, con una **rutina de 10 minutos** para la casa;
  - 💬 una frase para animarlo.

  Si aún no hay datos: "Todavía estamos conociendo a…".
- [ ] **Biblioteca de rutinas por habilidad**: la redacta Claude y **el equipo la revisa y aprueba** (son las que leen los papás).
- [ ] **Informe semanal** (idea 5): aviso los domingos, "📬 El informe semanal está listo".
- [ ] **Modo padre e hijo** (idea 11): retos con mamá o papá (la skill ya tiene "👨‍👩‍👧 Reto en familia") que den **recompensas mejores** en la app.

## Paso 6: más allá de las lecciones · 📱
- [ ] **Pausas activas** (idea 2): estiramientos con videos de YouTube elegidos por el equipo (modo sin cookies) y/o rutinas animadas propias, con temporizador.
- [ ] **Modo arte** (idea 8): lienzo para dibujar con colores y sellos; el dibujo se guarda o se le manda al equipo.
- [ ] **Programación para niños** (idea 15): "lleva al delfín a la meta" con flechas, luego bucles ("repite 3 veces") y condiciones.
- [ ] **Más imágenes y animaciones** (ideas 7 y 14): se van sumando en cada cosa nueva (respetando "reducir movimiento").

## Paso 7: lo más difícil · 📱
- [ ] **Comandos de voz** (idea 7): pronunciar en inglés y leer sílabas en transición y primero.
  - Funciona en Chrome y en iPhone, no en todos los navegadores.
  - El audio pasa por Google o Apple.
  - Va en la app, no en la lección, porque las lecciones corren aisladas.
- [ ] **Juegos con cámara, tipo Kinect** (idea 9): detectar las manos con MediaPipe para mover piezas.
  - Es gratis y corre en el celular; el video no sale del dispositivo.
  - Hay que probarlo en celulares sencillos.

---

## Recomendaciones
- **Después del paso 3, mostrarle la app a la mamá que dio las ideas.** Su opinión puede cambiar el orden de lo que sigue.
- **Terminar un paso**, que las familias lo usen y luego seguir.

## Más ideas para considerar

- **Mascota que crece**: el animal del niño "come" con cada lección y se pone contento cuando vuelve.
- **Repaso relámpago diario**: 5 preguntas de lo que más se le ha dificultado, en 2 minutos.
- **Diploma imprimible** al terminar un tema, para pegar en la nevera.
- **Modo hermanos**: retos sanos entre niños de la misma familia.
- **Momentos de ánimo en el inicio**: "Ayer resolviste 12 retos 💪", "Tu delfín está orgulloso de ti 🐬".

## En pausa

- **Tutor con IA** para responder dudas de los niños (sería un plan aparte). Se retoma más adelante.
