// Cataleya v3 — service worker
// Permette di aprire l'app anche senza rete, quando è pubblicata in https
// (es. GitHub Pages) nella stessa cartella di cataleya-app.html.
// Strategia: rete prima (così vedi sempre l'ultima versione), copia salvata se offline.
// Le chiamate al Google Script NON passano da qui: i dati offline li gestisce l'app.

const CACHE = 'cataleya-v3-1';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['./cataleya-app.html']).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || (req.mode === 'navigate' ? caches.match('./cataleya-app.html') : null))
        .then(res => res || Response.error()))
  );
});
