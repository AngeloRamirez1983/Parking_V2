/* Simple app-shell SW: cache-first para estáticos, network-first para CDN */
const CACHE = 'parking-pwa-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png'
];

// Precarga básicos (app shell)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Limpieza de versiones viejas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estrategia de fetch
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // CDN de qrcodejs: intenta red primero, cae a cache si existe
  const isCDN = /cdnjs\.cloudflare\.com/.test(url.hostname);

  if (isCDN) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Mismo origen: cache-first
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      }).catch(() => cached) // si falla red, intenta cache (por si estaba)
    )
  );
});
