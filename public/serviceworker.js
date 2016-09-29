'use strict';

const version = 'v1.0.1::';
const staticCacheName = version + 'static';

function updateStaticCache() {
  return caches.open(staticCacheName).then(
    cache => {
      // These items won't block the installation of the Service Worker
      cache.addAll([
        '/vendor/stackblur.min.js',
        'print.css',
        'manifest.webmanifest'
      ]);

      // These items must be cached for the Service Worker to complete installation
      return cache.addAll([
        '/default_image.svg',
        '/edgedetect.js',
        '/script.js',
        '/style.css',
        '/'
      ]);
    }
  );
}

function stashInCache(cacheName, request, response) {
  caches.open(cacheName)
    .then( cache => cache.put(request, response) );
}


// Limit the number of items in a specified cache.
function trimCache(cacheName, maxItems) {
  caches.open(cacheName)
    .then( cache => {
      cache.keys()
        .then(keys => {
          if (keys.length > maxItems) {
            cache.delete(keys[0])
              .then(trimCache(cacheName, maxItems));
          }
        });
    });
}

// Remove caches whose name is no longer valid
function clearOldCaches() {
  return caches.keys()
    .then( keys => {
      return Promise.all(keys
        .filter(key => key.indexOf(version) !== 0)
        .map(key => caches.delete(key))
      );
    });
}

self.addEventListener('install', event => {
  event.waitUntil(updateStaticCache()
    .then( () => self.skipWaiting() )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clearOldCaches()
    .then( () => self.clients.claim() )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});