const CACHE_NAME = "timpla-pos-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/vite.svg",
  "/takopi.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  
  const url = new URL(event.request.url);
  
  // Skip non-http, extension, Supabase backend APIs, and Vite dev server internal assets
  if (!url.protocol.startsWith("http")) return;
  if (url.hostname.includes("supabase.co")) return;
  if (url.pathname.startsWith("/@") || url.pathname.includes("node_modules") || url.pathname.includes("hot-update")) return;

  event.respondWith(
    (async () => {
      try {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          // Background revalidate
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      } catch (err) {
        if (event.request.mode === "navigate") {
          const indexCache = (await caches.match("/index.html")) || (await caches.match("/"));
          if (indexCache) return indexCache;
        }
        // Fallback response to prevent 'Failed to convert value to Response' error
        return new Response("Offline", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({ "Content-Type": "text/plain" })
        });
      }
    })()
  );
});
