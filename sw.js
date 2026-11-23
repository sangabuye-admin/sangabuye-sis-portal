const CACHE_NAME = 'sangabuye-sis-v5.3';
const ASSETS = [
  './',
  './index.html',
  './core.js',
  './manifest.json',
  './admin.html',
  './director.html',
  './headmaster.html',
  './accountant.html',
  './academic.html',
  './teacher.html',
  './parent.html',
  './student.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
