// Service worker mínimo: red primero y, si no hay red, lo último que se guardó (la app abre sin señal).
// El modelo de Hugging Face y Transformers.js no pasan por acá: los guarda Transformers.js en Cache Storage.
const CACHE = "pisos-v7";
const SHELL = ["./prototipo-foto.html", "./manifest.webmanifest", "./icono-192.png", "./icono-512.png", "./icono-180.png", "./catalogo/muestras.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
