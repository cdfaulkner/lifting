const CACHE_NAME = 'ironlog-v2';
const ASSETS = ['./', './index.html', './bw_data.json', './manifest.json', './baseline-icon.svg'];

function isCacheableRequest(request) {
  return request && request.method === 'GET' && request.url.startsWith(self.location.origin);
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok && isCacheableRequest(request)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw _;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then(response => {
      if (response && response.ok && isCacheableRequest(request)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  return cached || fetchPromise;
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  if (!isCacheableRequest(e.request)) return;
  const url = new URL(e.request.url);
  const isNavigation = e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html');
  e.respondWith(isNavigation ? networkFirst(e.request) : staleWhileRevalidate(e.request));
});
