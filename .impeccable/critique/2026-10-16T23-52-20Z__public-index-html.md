---
target: app completa
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\User\\Documents\\lihkis\\Learnground-impeccable\\public\\index.html"
target_fingerprint: "sha256:5d160fd4920500415ffe42ef94fd40a1570edc722f1d14649287467bd4b4fea4"
target_path: "C:\\Users\\User\\Documents\\lihkis\\Learnground-impeccable\\public\\index.html"
timestamp: 2026-10-16T23-52-20Z
slug: public-index-html
---
Método: doble agente (A: ac5c4f2a8e6c38dad · B: aacf0274ec5045058)

# Crítica de diseño: Learnground (app completa)

## Puntaje de diseño
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | "⚠️ Sin guardar" es diminuto, sin explicación ni reintento |
| 2 | Lenguaje del mundo real | 3 | KPI de Papás técnicos ("Nota promedio · Desempeño Alto") |
| 3 | Control y libertad | 3 | Zona del niño y de los papás sin separar |
| 4 | Consistencia | 2 | Regla de racha dicha de 3 formas; sol con 4 significados; Pedidos dentro de Mensajes |
| 5 | Prevención de errores | 3 | Papás sin filtro de adulto |
| 6 | Reconocer antes que recordar | 3 | Puntos de la semana ambiguos |
| 7 | Flexibilidad y eficiencia | 2 | Equipo sin acciones en lote; pedidos con 2–3 toques por estado |
| 8 | Estética y minimalismo | 2 | Inicio con ~9 bloques del mismo peso; Papás con ~15 secciones |
| 9 | Recuperación de errores | 2 | "Algo salió mal" con error técnico crudo |
| 10 | Ayuda y documentación | 3 | Sin preguntas frecuentes para papás |
| **Total** | | **26/40** | **Aceptable** |

## ¿Se siente hecho para Learnground?
Mitad sí: Lulo, racha, sello ¡NUEVA!, voz es-CO, consejos y visor. Mitad no: todas las pantallas son la misma tarjeta blanca con borde de 3 px y sombra sólida (plantilla neo-brutalista genérica). Emoji como único sistema de iconos. Lulo se lee como logo. La historia "lecciones hechas con tu tarea" no se le muestra al niño.
Detector: 126 hallazgos; 112 son valores fuera de DESIGN.md (sobre todo vacíos de documentación). Reales: franja lateral de los consejos (tareki.css:480), curva de rebote (tareki.css:565). Falsos positivos: divisores del menú y visor, separadores del chat, imagen de pedidos, franja de prueba y todo fracciones.html. En navegador: blanco sobre rosado 2.7:1, sobre verde 2.6:1, sobre la racha 2.0–2.4:1; modo oscuro .destacada 1.5:1 (tareki.css:272); desborde de "Tus pedidos" en Papás celular (tareki.css:363-369); salto h1→h3 en perfiles.

## Impresión general
Voz y momentos delicados excelentes; estructura plana con una plantilla genérica que ya se decidió retirar. La gran oportunidad es crear jerarquía en el rediseño.

## Lo que funciona
1. Textos en momentos sensibles (vencimiento, bloqueo, suspender).
2. Consejos para papás concretos y ligados al tema.
3. Sistema infantil coherente (Baloo/Nunito, colores con significado, menú adaptable, Logros).

## Problemas prioritarios
- [P1] Sin jerarquía: misma tarjeta con borde y sombra en todo. Arreglo: tres niveles, protagonista por pantalla, racha dentro del saludo, quitar bordes/sombras a la vez. Comando: shape, luego distill.
- [P1] Zona niño/papás mezclada: cobro en inicio del niño y perfiles; Papás sin filtro. Arreglo: cobro solo para adultos y filtro de adulto. Comando: clarify + harden.
- [P1] Papás ordenado al revés: consejos tras "Tu cuenta". Arreglo: KPI → Qué hacer esta semana → temas/notas → pedir/chat → avisos → ajustes plegados. Comando: layout.
- [P2] Contraste y modo oscuro: blanco sobre rosado/verde/naranja; destacada 1.5:1 en oscuro; pastel fijos. Comando: audit, luego colorize.
- [P2] Regla de la racha contradictoria y con miedo. Comando: clarify.

## Alertas por persona
- Jordan: "¿Aún no tienes cuenta?" al final; pago sin caras, plazo ni garantía; sin guía tras registrarse.
- Casey: menú de equipo con 6 opciones; botones de Pedidos chicos; Papás largo.
- Sam: contrastes; racha sin texto accesible; tabs sin tabpanel; ¡NUEVA! late sin fin.
- Niño de 1.º: globo de ~20 palabras sin voz; cifras y medallas dependen de leer; aviso de pago para adultos.
- Joven de 10.º: solo existe la cara infantil.

## Observaciones menores
- @keyframes latido duplicado (tareki.css:267 y :766).
- Franja lateral en consejos.
- Datos demo inconsistentes (TAREKI-, $60.000, fechas, WhatsApp vs chat).
- Pestaña y botón "Entrar" juntos.
- Contadores de Mensajes no cuadran.
- Sandbox del iframe más amplio que lo documentado.

## Preguntas para pensar
- ¿Y si la tarjeta dijera "Hecha con tu guía de matemáticas del martes"?
- ¿Un niño de 6 años debería leer "mensualidad"?
- ¿Qué hace Lulo que no haría una etiqueta?
- Sin bordes ni sombras, ¿qué da la sensación de caja de juguetes?
