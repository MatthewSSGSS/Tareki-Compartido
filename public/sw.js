// =============================================================================
// sw.js — Service worker de Tareki.
//
// • Recibe las notificaciones push (aunque la app esté cerrada) y las muestra.
//   El texto viene cifrado dentro del push; el navegador lo descifra solo.
// • Al tocar la notificación, abre Tareki en la pantalla indicada.
// • Guarda una copia de la app para que abra rápido y sin internet muestre algo.
//   Estrategia: primero internet (así los cambios publicados se ven de una).
//
// Si cambias este archivo, sube VERSION.
// =============================================================================

const VERSION = 'v1';
const CACHE = `tareki-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './css/tareki.css', './icons/icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tareki-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// --- Notificaciones ---------------------------------------------------------------
self.addEventListener('push', (e) => {
  let a = {};
  try { a = e.data ? e.data.json() : {}; } catch { a = { cuerpo: e.data?.text() || '' }; }
  const titulo = a.titulo || 'Tareki 🦉';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: a.cuerpo || '¡Lulo te espera para aprender jugando!',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: a.tag || 'tareki',
    renotify: true,
    data: { url: a.url || '#/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '#/', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
    for (const c of lista) {
      if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
        c.navigate?.(url).catch(() => {});
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});

// --- Copia para abrir rápido ----------------------------------------------------------
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase, fuentes, etc.: directo a internet
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))),
  );
});
