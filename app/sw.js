const CACHE_NAME = 'solis-pos-v1.2.1';
const ASSETS = [
  '/app/',
  '/app/index.html',
  '/app/icon-192.png',
  '/app/icon-512.png',
  '/app/apple-touch-icon.png',
  '/app/manifest.json',
];

const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).then(() => {
        return Promise.all(
          FONT_URLS.map((url) =>
            fetch(url)
              .then((resp) => {
                if (resp.ok) {
                  cache.put(url, resp.clone());
                  const css = resp.clone();
                  return css.text().then((text) => {
                    const fontFileUrls = text.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g);
                    if (fontFileUrls) {
                      return Promise.all(
                        fontFileUrls.map((u) => {
                          const cleanUrl = u.replace(/^url\(/, '').replace(/\)$/, '');
                          return fetch(cleanUrl)
                            .then((r) => r.ok ? cache.put(cleanUrl, r) : null)
                            .catch(() => null);
                        })
                      );
                    }
                  });
                }
              })
              .catch(() => null)
          )
        );
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  if (url.pathname.startsWith('/app/')) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
});
