/* Renova-me Deus Meu — Service Worker PWA
 * Cache version dedicated to the build that includes Formados para Amar.
 */
const CACHE_NAME = 'renova-me-pwa-v8-formados-para-amar';

const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './Logo-Renova-me.jpg',
  './assets/capa-app.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './LogodoChamadosparaServir.png',
  './imagens/formados-para-amar/Formados-para-Amar.png',
  './imagens/formados-para-amar/Formados-para-Amar-alternativa.png',
  './imagens/formados-para-amar/01-Para-Conquista-la-com-Honra.png',
  './imagens/formados-para-amar/02-Antes-do-Altar.png',
  './imagens/formados-para-amar/03-Edifique-o-Seu-Casamento.png',
  './Dados_JSON/FormadosParaAmar/para_conquista_la_com_honra.json',
  './Dados_JSON/FormadosParaAmar/antes_do_altar.json',
  './Dados_JSON/FormadosParaAmar/edifique_o_seu_casamento.json',
  './Dados_JSON/ChamadosParaServir/O-profissional-que-Deus-Aprova.json',
  './Dados_JSON/ChamadosParaServir/como_deus_ensinou.json',
  './Dados_JSON/ChamadosParaServir/liderar_sem_perder_a_alma.json'
];

const LEGACY_FILES = [
  './js/catalogo-biblia.js',
  './Bíblia.png', './Sermões.png', './Liturgias.png', './Devocional.png',
  './Caixinha das Promessas.png', './Ver a Jesus.png', './Caminhar com Cristo.png',
  './Preciosa.png', './Preciosa e Segura.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Os arquivos essenciais desta atualização são cacheados em conjunto.
    await cache.addAll(APP_FILES.map((path) => new Request(new URL(path, self.registration.scope), { cache: 'reload' })));
    // Arquivos que pertencem ao projeto-base podem não estar no ZIP de sobreposição.
    // Sua ausência não deve impedir a instalação do aplicativo.
    await Promise.allSettled(LEGACY_FILES.map(async (path) => {
      const url = new URL(path, self.registration.scope);
      const response = await fetch(url, { cache: 'reload' });
      if (response.ok) await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith('renova-me-pwa-') && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // App navigation: prefer the network, then fall back to the cached shell.
    if (request.mode === 'navigate') {
      try {
        const response = await fetch(request);
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
      } catch (_error) {
        return (await cache.match(request)) ||
          (await cache.match(new URL('./index.html', self.registration.scope).href)) ||
          Response.error();
      }
    }

    // Static files: use the cached copy immediately and refresh it in the background
    // whenever the network is available.
    const cached = await cache.match(request);
    if (cached) {
      event.waitUntil(fetch(request).then((response) => {
        if (response && response.ok) return cache.put(request, response.clone());
      }).catch(() => {}));
      return cached;
    }

    try {
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    } catch (_error) {
      return Response.error();
    }
  })());
});
