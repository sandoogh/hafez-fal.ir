var CACHE = 'hafez-fal-v2';
var GHAZAL_COUNT = 495;

var SHELL_URLS = [
  '/',
  '/list/',
  '/about/',
  '/static/css/style.css',
  '/static/img/icon.png',
  '/manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(SHELL_URLS);
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
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (response && response.ok && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, copy);
          });
        }
        return response;
      }).catch(function() {
        if (e.request.mode === 'navigate') {
          return caches.match('/');
        }
        return Response.error();
      });
    })
  );
});

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'PRECACHE_ALL') {
    e.waitUntil(precacheAllGhazals());
  }
});

function precacheAllGhazals() {
  return caches.open(CACHE).then(function(cache) {
    var urls = [];
    for (var i = 1; i <= GHAZAL_COUNT; i++) {
      var num = ('000' + i).slice(-3);
      urls.push('/ghazal/' + num + '/');
    }
    return Promise.allSettled(
      urls.map(function(url) {
        return cache.match(url).then(function(hit) {
          if (hit) return;
          return fetch(url).then(function(response) {
            if (response && response.ok) {
              return cache.put(url, response);
            }
          });
        });
      })
    ).then(function(results) {
      var ok = results.filter(function(r) { return r.status === 'fulfilled'; }).length;
      console.log('[SW] Pre-cached ' + ok + '/' + urls.length + ' ghazals');
    });
  });
}
