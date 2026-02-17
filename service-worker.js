// service-worker.js
const STATIC_CACHE = "ruta-static";
const RUNTIME_CACHE = "ruta-runtime";

// Archivos "shell" (no incluyo index.html para que siempre se actualice)
const STATIC_ASSETS = [
  "./",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // ✅ Limpia caches viejos que puedan quedar
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => {
        if (k !== STATIC_CACHE && k !== RUNTIME_CACHE) return caches.delete(k);
        return null;
      })
    );

    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(request, { cache: "no-store" });
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    // ✅ fallback offline: abre la app shell
    return cached || caches.match("./") || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  const cache = await caches.open(RUNTIME_CACHE);
  cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // No cachear APIs / tiles / CDNs
  if (
    url.origin.includes("openstreetmap.org") ||
    url.origin.includes("router.project-osrm.org") ||
    url.origin.includes("nominatim.openstreetmap.org") ||
    url.origin.includes("unpkg.com")
  ) {
    return;
  }

  // HTML / navegación: network-first (auto update)
  const accept = req.headers.get("accept") || "";
  const isHTML =
    req.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    accept.includes("text/html");

  if (isHTML) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Manifest e íconos: cache-first
  if (url.pathname.endsWith("manifest.json") || url.pathname.includes("/icons/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Otros archivos propios: cache-first
  event.respondWith(cacheFirst(req));
});
