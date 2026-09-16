/* Only the public calculator shell is stored. Account/API responses never enter this cache. */
importScripts('./app/precache.js');
const CACHE = 'cyphers-shell-' + self.CYPHERS_PRECACHE.version;
const BASE = new URL('./', self.location.href);
const ASSETS = new Set(self.CYPHERS_PRECACHE.files.map(file => new URL(file, BASE).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...ASSETS])));
  // Updates wait for existing tabs to close so a session cannot mix versions.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('cyphers-shell-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== BASE.origin) return;
  url.search = '';
  url.hash = '';
  if (url.href === BASE.href) url.pathname += 'index.html';
  if (ASSETS.has(url.href)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.href)) || fetch(request)));
  } else if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(new URL('offline.html', BASE).href)) || Response.error();
    }));
  }
});
