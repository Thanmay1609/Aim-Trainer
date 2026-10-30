const CACHE_NAME = "range-os-shell-v2";
const OLD_CACHE_NAMES = ["range-os-shell-v0", "range-os-shell-v1"];
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./src/app.mjs",
  "./src/core.mjs",
  "./src/storage.mjs",
  "./manifest.webmanifest",
  "./assets/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => OLD_CACHE_NAMES.includes(key) && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
      }
      return response;
    }).catch(() => caches.open(CACHE_NAME).then((cache) => cache.match("./index.html"))));
    return;
  }
  event.respondWith(caches.open(CACHE_NAME).then((cache) => cache.match(request).then((cached) => cached || fetch(request))));
});
