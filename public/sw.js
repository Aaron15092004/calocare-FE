const CACHE_NAME = "calovie-runtime-v1";
const CACHEABLE_PATHS = [
  "/manifest.webmanifest",
  "/logo.png",
  "/install-icon.png",
  "/apple-touch-icon.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png"
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request).then((response) => {
      const url = new URL(request.url);
      if (response.ok && url.origin === self.location.origin && CACHEABLE_PATHS.includes(url.pathname)) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => {
      return caches.match(request);
    })
  );
});
