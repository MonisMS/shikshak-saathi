// Shikshak Saathi service worker (F58). Hand-written: next-pwa/serwist need webpack, we're on Turbopack.
const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const PAGE_CACHE = `pages-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Kit pages (view + print) are what a teacher needs in a classroom without internet.
const isKitPage = (url) => /^\/kits\/[^/]+(\/print)?\/?$/.test(url.pathname) && url.pathname !== "/kits/new";

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never cache API / auth

  // Hashed build assets + icons: cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Full page loads: network-first; remember kit pages; fall back to cache, then /offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && !res.redirected && isKitPage(url)) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match(OFFLINE_URL))),
    );
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  // Explicit "Save for offline": fetch the kit's pages into the page cache.
  if (data.type === "SAVE_KIT" && data.id) {
    const paths = [`/kits/${data.id}`, `/kits/${data.id}/print`];
    event.waitUntil(
      caches
        .open(PAGE_CACHE)
        .then((c) =>
          Promise.all(
            paths.map((p) =>
              fetch(p, { credentials: "same-origin" }).then((res) => {
                if (res.ok && !res.redirected) return c.put(p, res);
              }),
            ),
          ),
        )
        .then(() => event.source && event.source.postMessage({ type: "KIT_SAVED", id: data.id })),
    );
  }
  // Logout: saved pages contain the teacher's data — wipe them on shared devices.
  if (data.type === "CLEAR_PAGES") {
    event.waitUntil(caches.delete(PAGE_CACHE));
  }
});
