/* Cauce PWA Service Worker
 *
 * Estrategias:
 *  - App shell (navegaciones): network-first con fallback a index.html cacheado
 *    (necesario para una SPA de expo-router: todas las rutas resuelven a "/").
 *  - Assets estáticos (_expo/static, fuentes, imágenes): cache-first.
 *  - Llamadas a Supabase / APIs: se dejan pasar a la red (no se cachean datos
 *    sensibles ni respuestas de auth).
 */

const CACHE_VERSION = "cauce-v2";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

// Recursos mínimos del app shell que precacheamos al instalar.
const SHELL_URLS = ["/", "/index.html", "/manifest.json", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => {
        // Si algún recurso falla (ej. 404 en dev), no bloqueamos la instalación.
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_expo/") ||
    url.pathname.startsWith("/assets/") ||
    /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|ico|ttf|otf|woff2?)$/.test(
      url.pathname
    )
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo manejamos GET; el resto (POST a Supabase, etc.) pasa directo a la red.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // No interceptamos peticiones cross-origin (Supabase, proveedor de IA, etc.).
  if (url.origin !== self.location.origin) return;

  // Navegaciones (HTML): network-first, fallback al shell cacheado.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/index.html"))
            .then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Assets estáticos: cache-first con repoblado en background.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});
