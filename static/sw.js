var CACHE = 'hafez-fal-v1.1';
var GHAZAL_COUNT = 495;

self.addEventListener('install', function(e) {
  var urls = [
    '/',
    '/static/css/style.css',
    '/static/img/icon.png',
    '/list/',
    '/about/'
  ];
  for (var i = 1; i <= GHAZAL_COUNT; i++) {
    var num = ('000' + i).slice(-3);
    urls.push('/ghazal/' + num + '/');
  }
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(urls);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request);
    }).catch(function() {
      return caches.match('/');
    })
  );
});
