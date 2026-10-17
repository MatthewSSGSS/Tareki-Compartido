# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tres públicos, y los dos primeros pesan lo mismo:

- **El niño o la niña (1.º a 11.º grado, Colombia).** Entra con la cuenta de su familia, elige su perfil y abre sus lecciones de Lección Divertida para practicar lo que ve en el colegio. Lo usa sobre todo en el celular o la tableta de la casa, a veces en el computador. Necesita entender qué hacer sin leer mucho y querer volver al día siguiente.
- **Los papás.** Pagan la mensualidad y deciden si siguen. Quieren saber, en poco tiempo, cómo le va a su hijo o hija: progreso, temas que le cuestan y consejos concretos para ayudar en casa. También piden lecciones nuevas (con fotos del cuaderno o la guía) y hablan con el equipo por el chat.
- **El equipo (y el dueño).** Pocas personas que suben lecciones, crean códigos de invitación, registran pagos a mano, atienden pedidos, escriben a las familias (chat y WhatsApp) y revisan el rendimiento de cada niño. Trabajan más en el computador.

## Product Purpose

Learnground le da a cada niño sus propias lecciones interactivas, hechas a partir de su tarea real del colegio, y guarda su progreso en su cuenta. Lo mantiene motivado con racha, estrellas y medallas, y les muestra a los papás qué va bien, qué cuesta y cómo ayudar. Funciona bien cuando el niño practica seguido por su cuenta y los papás ven el avance y renuevan la mensualidad.

## Positioning

- **Lecciones a la medida:** cada lección se hace con las fotos de la tarea o la guía del colegio y con el perfil del niño (juegos que prefiere, temas débiles, ritmo, gustos). No es un banco de ejercicios genérico.
- **Juego y motivación:** las lecciones traen juegos, jefe final, fichas y simulacro; la app suma racha, estrellas y medallas.
- **Papás informados:** el reporte traduce el progreso en temas que cuestan y consejos prácticos, no solo en un puntaje.

## Operating Context

- Las familias pagan antes de recibir el código de invitación (llave Bre-B y comprobante por WhatsApp). El cobro es 100 % manual y por niño, según el grado (1.º a 5.º y 6.º a 11.º).
- El niño abre la lección dentro de la app; la lección es un HTML aparte que la app no modifica.
- Las familias piden lecciones desde el chat o desde Papás; el equipo las atiende en Pedidos.
- Avisos push (lección nueva, racha en peligro, vencimiento) y mensajes por WhatsApp (`wa.me`).
- Hay una versión de prueba solo como familia ("Probar" en la pantalla de entrada).

## Capabilities and Constraints

- App web sin build ni npm: JS vanilla con módulos ES, publicada en Cloudflare Pages; datos en Supabase (plan gratis).
- Debe verse bien en celular (390 px, sin desborde) y aprovechar el computador (≥ 900 px).
- Instalable como app en el celular; en iPhone los avisos necesitan iOS 16.4+ con la app instalada.
- El repo es público: nunca lecciones reales ni nombres de niños.
- Si una familia vence, se bloquea el acceso pero nunca se borran sus datos; el chat sigue funcionando.
- Términos de la app: lección, racha, estrellas, medallas, fichas, simulacro, jefe final, pedido, código de invitación, mensualidad.

## Brand Commitments

- Nombre: **Learnground** (antes Tareki; el repo y el proyecto de Supabase conservan el nombre viejo). Las lecciones son de **Lección Divertida**.
- Mascota: **Lulo**, un delfín rosado con libro, bloques y control (`public/img/lulo*.png`, íconos en `public/icons/`).
- Voz: español de Colombia, tuteo, cercana y sencilla. Hablar de los niños por su nombre o en neutro ("su hijo o hija").

## Evidence on Hand

- Lulo y los íconos de la app en `public/img/` y `public/icons/`.
- Datos de demostración en `public/js/demo.js` (no son reales).
- No hay testimonios, cifras de familias ni resultados publicados: no inventarlos.

## Product Principles

1. **El niño y los papás pesan lo mismo:** cada pantalla sirve a uno sin descuidar al otro.
2. **A la medida antes que genérico:** lo que se muestra parte del niño concreto (su tarea, su progreso, sus gustos).
3. **Motivar sin engañar:** racha y medallas premian práctica real, no clics.
4. **Claro para un niño de 6 años y para un papá con prisa:** poco texto, acciones obvias.
5. **Cercanía humana:** detrás hay un equipo de personas; el chat y WhatsApp son parte del producto.

## Accessibility & Inclusion

- Lectores desde 1.º grado: textos cortos, apoyo visual y botones grandes.
- Todas las animaciones se apagan con "reducir movimiento".
- Debe funcionar en celulares sencillos y en los navegadores que usan las familias (incluido Safari en iPhone).
