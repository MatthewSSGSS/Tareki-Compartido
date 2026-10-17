# Propuestas para Learnground

Ideas para mejorar la app y las lecciones. Muchas vienen de una mamá que usa Learnground; otras salieron de conversarlas.
Están en el orden en que proponemos hacerlas. Cuando una se termine, marquen la casilla `[x]` y anoten la fecha.

**Dónde vive cada cosa**
- 🧩 **Skill**: las lecciones HTML las hace la skill `leccion-divertida` en claude.ai. Cambiar la skill mejora las lecciones *nuevas*.
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

## Fase 1: rápido y con impacto inmediato

- [ ] **Guía "Cómo usar Learnground" para papás** (idea 13) · 📱
  Un botón en Papás que explica cada función (lecciones, racha, medallas, buzón, chat, pedidos, pagos, avisos) y cómo trabaja el equipo.
- [ ] **Trucos para aprender** (idea 16) · 🧩
  Tarjetas "💡 Truco" en cada tema: "×10 = ponle un 0", "la prueba del 9", reglas para recordar…
- [ ] **Menos texto, mejor repartido** (idea 6) · 🧩
  Párrafos cortos en tarjetas, "¿Sabías que…?", y un botón 🔊 que lee en voz alta. Mantener los conceptos, pero sin muros de texto.
- [ ] **Tono optimista en las lecciones** · 🧩
  Aplicar la regla 1 en todos los mensajes de la skill.
- [ ] **Habilidad escondida y registro de intentos en cada juego** (ideas 3 y 4) · 🧩
  Cada juego de la lección lleva su habilidad (`hab`) y anota cada partida (aciertos, errores, tiempo, fecha). Viaja solo a la cuenta del niño como el resto del progreso: no necesita SQL. Para las lecciones viejas, la app deduce la habilidad por el nombre del juego.
- [ ] **Los papás llenan los gustos del niño** · 📱 🗄️
  Campo "Gustos e intereses" en el perfil del niño. Hoy lo escribe el equipo en "📋 Perfil para la próxima lección" y solo queda en ese dispositivo.
- [ ] **Suavizar las frases actuales para papás** · 📱
  Hoy hay textos como "Bajó de 80 a 60", "el tema más débil", "puede estar adivinando" o "Reforzar:". Pasarlos a la regla 2.

## Fase 2: juegos de verdad y motivación

- [ ] **Motor de juegos** (idea 1) · 📱 🧩
  Los juegos viven una sola vez en la app (`juegos/motor-v1.js`) y la lección solo trae los datos (preguntas, parejas, enemigos). Así:
  - las lecciones pesan mucho menos y Claude no se corta al escribirlas (hoy una lección pesa ~250 KB);
  - los juegos pueden ser más elaborados y salen siempre bien;
  - el registro por habilidad es igual en todos.

  Juegos de arranque:
  - parejas de memoria;
  - unir palabras con imágenes;
  - ordenar;
  - "corre y salta";
  - un **jefe final que ataca de verdad**.

  Versionado (`v1`, `v2`…) para no dañar lecciones viejas.
- [ ] **RPG por turnos, tipo Final Fantasy pequeño** (idea nueva) · 📱 🧩 🗄️
  Pelear es responder:
  - ⚔️ **Atacar:** pregunta fácil.
  - ✨ **Magia:** pregunta difícil, con elementos 🔥💧⚡.
  - 🧪 **Objetos:** pociones ganadas en lecciones.
  - 🛡️ **Defender:** cuando el enemigo carga un ataque fuerte.

  Los enemigos salen del tema de la lección y cada uno tiene una debilidad que hay que recordar (memoria y lógica). Mapa de mundo por capítulos y el héroe sube de nivel entre lecciones.

  Por partes:
  1. Prototipo de una batalla.
  2. Nivel, objetos y varios enemigos.
  3. Mapa y capítulos.
  4. La skill escribe los enemigos y las preguntas.
- [ ] **Creador de avatar y recompensas** (idea 10) · 📱 🗄️
  El niño arma su personaje (animal, color, sombrero, arma, capa…). **El protagonista del RPG es ese avatar.** Al terminar lecciones y lograr metas desbloquea accesorios, y se le ven puestos.
- [ ] **Logros más atractivos** (idea 12) · 📱
  Medallas con niveles (bronce, plata, oro), ligadas a las recompensas del avatar. Que no sea solo la racha.

## Fase 3: análisis e informes

- [ ] **Análisis por habilidad para el equipo** (idea 4) · 📱
  Errores por juego y por habilidad, tiempos, evolución. Solo lo ve el equipo.
- [ ] **Sección "🌟 Cómo va [niño]" para papás** (idea 5) · 📱
  Incluye:
  - ✨ en qué se destaca;
  - 🌱 su próximo reto, con una **rutina de 10 minutos** para la casa;
  - 💬 una frase para animarlo.

  Las rutinas salen de una biblioteca por habilidad que escribe el equipo. Si todavía no hay suficientes datos: "Todavía estamos conociendo a…".
- [ ] **Informe semanal** (idea 5) · 📱
  Aviso los domingos: "📬 El informe semanal está listo".
- [ ] **Modo padre e hijo** (idea 11) · 🧩 📱
  Retos que se juegan con mamá o papá (la skill ya tiene "👨‍👩‍👧 Reto en familia"). Falta que den **recompensas mejores** en la app.

## Fase 4: más allá de las lecciones

- [ ] **Pausas activas** (idea 2) · 📱
  Sección con estiramientos: videos de YouTube elegidos por el equipo (modo sin cookies) y/o rutinas animadas propias, con temporizador.
- [ ] **Modo arte** (idea 8) · 📱
  Lienzo para dibujar con colores y sellos; el dibujo se guarda o se le manda al equipo.
- [ ] **Programación para niños** (idea 15) · 📱 🧩
  "Lleva al delfín a la meta" con flechas, luego bucles ("repite 3 veces") y condiciones.
- [ ] **Más imágenes y animaciones** (ideas 7 y 14) · 📱 🧩
  Se va sumando en cada cosa nueva (las animaciones respetan "reducir movimiento").

## Fase 5: lo más difícil

- [ ] **Comandos de voz** (idea 7) · 📱
  Pronunciar en inglés, leer sílabas en transición y primero. Funciona en Chrome y iPhone, no en todos los navegadores. El audio pasa por Google o Apple. Va en la app, no en la lección (las lecciones corren aisladas por seguridad).
- [ ] **Juegos con cámara, tipo Kinect** (idea 9) · 📱
  Detectar las manos con MediaPipe (gratis, corre en el celular, el video no sale del dispositivo) para mover piezas con las manos. No todo celular lo mueve bien: probar en equipos sencillos.

---

## Más ideas para considerar

- **Mascota que crece**: el animal del niño "come" con cada lección y se pone contento cuando vuelve.
- **Repaso relámpago diario**: 5 preguntas de lo que más se le ha dificultado, en 2 minutos.
- **Diploma imprimible** al terminar un tema, para pegar en la nevera.
- **Modo hermanos**: retos sanos entre niños de la misma familia.
- **Momentos de ánimo en el inicio**: "Ayer resolviste 12 retos 💪", "Tu delfín está orgulloso de ti 🐬".

## En pausa

- **Tutor con IA** para responder dudas de los niños (sería un plan aparte). Se retoma más adelante.
