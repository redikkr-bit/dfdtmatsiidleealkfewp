const CACHE_NAME = 'barcode-checker-v1';
const FILES = [
  './index.html',
  './css/index.css',
  './js/index.js',
  './js/DataAnalyzer.js',
  './js/zxing.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
