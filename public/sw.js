const prefix = `game-lab:${self.registration.scope}:`;
const cacheName = prefix + 'v2';
const files = [
  './', './index.html', './style.css', './app.js', './campaign.js', './views.js', './extra-views.js', './storage.js', './motion.js', './circuit-view.js', './scene.js', './assets/optical-archive.webp', './assets/tidal-glass.webp',
  './games/common.js', './games/mirror.js', './games/flood.js', './games/switch.js',
  './games/crate.js', './games/echo.js', './games/voxel.js', './games/mosaic.js', './games/circuit.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', event => {
  const requests = files.map(path => new Request(new URL(path, self.registration.scope), {cache: 'reload'}));
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(requests)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const oldCaches = (await caches.keys()).filter(key => key.startsWith(prefix) && key !== cacheName);
    await Promise.all(oldCaches.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    if (request.mode === 'navigate') return (await cache.match('./index.html')) ?? fetch(request);
    return (await cache.match(request)) ?? fetch(request);
  })());
});
