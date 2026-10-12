# Tareki 🦉

App de Lección Divertida: cada niño entra con la cuenta de su familia, ve **solo sus lecciones**, guarda su progreso, mantiene su racha 🔥 y gana medallas. Los papás ven el rendimiento con consejos, y el equipo sube lecciones y crea códigos de invitación.

## ⚠️ Importante para el equipo

**Ya no se suben lecciones a este repositorio.** El repo es público: cualquier HTML que se suba aquí lo puede ver cualquiera, con el nombre del niño adentro.

Las lecciones se suben **desde la app**: entra con tu cuenta de equipo → **Subir** → arrastra el HTML → elige al niño. La app revisa que el archivo mencione al niño correcto y que no traiga nombres de otros niños.

## Cómo funciona

- **Familias:** solo pueden crear cuenta con un **código de invitación** que genera el equipo (sirve una vez y vence en 7 días).
- **Lecciones:** se guardan en un almacén privado y se abren dentro de la app, aisladas. Las lecciones no hay que cambiarlas: la app guarda solo lo que la lección ya guardaba (estrellas, fichas, simulacro, jefe final).
- **Racha:** un día cuenta si el niño termina algo o estudia 5 minutos.

## Configuración en Cloudflare Pages

| Campo | Valor |
|---|---|
| Framework preset | None |
| Build command | `node build.js` |
| Build output directory | `dist` |

## Probar en local

```bash
python -m http.server 8800 --directory public
```

Abre http://localhost:8800. Mientras no esté conectado Supabase, la app está en **modo demostración** (datos de prueba en el navegador): entra como "Una familia" o "El equipo", o regístrate con el código `TAREKI-DEMO`.
