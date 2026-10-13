// =============================================================================
// fotos.js — Achica las fotos antes de subirlas (las del celular pesan 3–8 MB).
// Quedan en JPEG de máximo 1600 px por lado: se leen bien y pesan ~300 KB.
// =============================================================================

/** Abre la imagen (respeta la orientación de la foto). */
async function abrir(archivo) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch { /* se intenta con <img> */ }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

/** Devuelve un Blob JPEG achicado. Si el navegador no puede abrirla, devuelve el archivo tal cual. */
export async function comprimirFoto(archivo, { max = 1600, calidad = 0.82 } = {}) {
  let img;
  try { img = await abrir(archivo); } catch { return archivo; }
  const ancho = img.width || img.naturalWidth, alto = img.height || img.naturalHeight;
  const escala = Math.min(1, max / Math.max(ancho, alto));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(ancho * escala);
  lienzo.height = Math.round(alto * escala);
  const c = lienzo.getContext('2d');
  c.fillStyle = '#fff';
  c.fillRect(0, 0, lienzo.width, lienzo.height);
  c.drawImage(img, 0, 0, lienzo.width, lienzo.height);
  img.close?.();
  const blob = await new Promise((r) => lienzo.toBlob(r, 'image/jpeg', calidad));
  return blob && blob.size < archivo.size ? blob : archivo.type === 'image/jpeg' ? archivo : blob || archivo;
}

/** Blob → data:URL (solo para la demostración, que guarda todo en el navegador). */
export const aDataUrl = (blob) => new Promise((ok, mal) => {
  const r = new FileReader();
  r.onload = () => ok(r.result);
  r.onerror = mal;
  r.readAsDataURL(blob);
});
