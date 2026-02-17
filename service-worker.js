const CACHE_NAME = "ruta-map-v20"; // cambia versión cuando actualices

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", event => {

  const url = new URL(event.request.url);

  // 🚫 NO cachear APIs externas ni tiles
  if (
    url.origin.includes("openstreetmap.org") ||
    url.origin.includes("router.project-osrm.org") ||
    url.origin.includes("nominatim.openstreetmap.org") ||
    url.origin.includes("unpkg.com")



