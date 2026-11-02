const VERSION = 'renova-me-pwa-v2-chamados';
const CORE = [
  './', './index.html', './manifest.webmanifest', './css/style.css', './js/app.js',
  './js/catalogo-biblia.js', './Logo-Renova-me.jpg', './assets/capa-app.png',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './Bíblia.png', './Sermões.png', './Liturgias.png', './Devocional.png', './Caixinha das Promessas.png',
  './Ver a Jesus.png', './Caminhar com Cristo.png', './Preciosa.png', './Preciosa e Segura.png',
  './chamados-para-servir-capa.png',
  './Dados_JSON/ChamadosParaServir/O-profissional-que-Deus-Aprova.json',
  './Dados_JSON/ChamadosParaServir/como_deus_ensinou.json',
  './Dados_JSON/ChamadosParaServir/liderar_sem_perder_a_alma.json'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(async cache => { await Promise.allSettled(CORE.map(path => cache.add(new Request(path, {cache:'reload'})))); }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('renova-me-pwa-') && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
