/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE = "ih-v1";
const PRECACHE: string[] = ["/", "/pricing", "/about", "/features"];

self.addEventListener("install", (e: ExtendableEvent) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e: ExtendableEvent) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>f
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e: FetchEvent) => {
  const { request } = e;
  if (request.method !== "GET") return;
  if (request.url.includes("/api/")) return; // never cache API
  e.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
    )
  );
});
