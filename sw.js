self.addEventListener('install', e => {
  e.waitUntil(caches.open('barcode-checker-v1').then(cache => {
    return cache.addAll(['./', './index.html', './css/index.css', './js/index.js', './js/DataAnalyzer.js']);
  }));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
