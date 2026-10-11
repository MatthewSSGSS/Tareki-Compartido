# Archivos compartidos

Repositorio donde varias personas suben archivos que se publican automáticamente en Cloudflare Pages.

## Cómo subir archivos (sin instalar nada)

1. Entra al repositorio en GitHub.
2. Abre la carpeta `public/archivos/`.
3. Pulsa **Add file → Upload files**, arrastra tus archivos y pulsa **Commit changes**.
4. En 1–2 minutos aparecen en el sitio de Cloudflare.

Puedes crear subcarpetas dentro de `public/archivos/` para ordenar las cosas.

## Límites

- Máximo **25 MB por archivo** (límite de Cloudflare Pages). Si alguien sube uno más grande, la publicación falla y el error dice cuál es.
- GitHub no acepta archivos de más de 100 MB.
- Para archivos grandes o muchos gigas, conviene un bucket de Cloudflare R2 en lugar de este repositorio.

## Configuración en Cloudflare Pages

| Campo | Valor |
|---|---|
| Framework preset | None |
| Build command | `node build.js` |
| Build output directory | `dist` |

## Dar acceso a más personas

En GitHub: **Settings → Collaborators → Add people** y escribe su usuario de GitHub. Cada persona recibe una invitación por correo y, al aceptarla, ya puede subir archivos.

## Probar en local

```bash
node build.js
npx serve dist
```
