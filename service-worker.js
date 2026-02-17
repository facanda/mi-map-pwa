// service-worker.js
const STATIC_CACHE = "ruta-static";
const RUNTIME_CACHE = "ruta-runtime";

// Archivos que sí vale la pena cachear "fijos"
const STATIC_ASSETS = [
  "./",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// 1) Instala: cachea lo básico (NO index.html)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 2) Activa: toma control inmediato
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Helpers
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(request, { cache: "no-store" });
    // guarda copia para offline
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    return cached || Response.error();
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

  // Solo maneja GET
  if (req.method !== "GET") return;

  // No cachear APIs / tiles / CDNs
  if (
    url.origin.includes("openstreetmap.org") ||
    url.origin.includes("router.project-osrm.org") ||
    url.origin.includes("nominatim.openstreetmap.org") ||
    url.origin.includes("unpkg.com")
  ) {
    return; // deja que vaya directo a la red
  }

  // ✅ CLAVE: index.html SIEMPRE network-first (se actualiza solo)
  const isHTML =
    req.mode === "navigate" ||
    (url.pathname.endsWith("/index.html")) ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Manifest e íconos: cache-first
  if (url.pathname.endsWith("manifest.json") || url.pathname.includes("/icons/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Por defecto: cache-first para archivos propios
  event.respondWith(cacheFirst(req));
});
