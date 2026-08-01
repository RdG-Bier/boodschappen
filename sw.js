/* Nieuwe versies moeten direct doorkomen:
   - HTML altijd eerst van het netwerk (anders blijf je op een oude bundel hangen)
   - overige bestanden uit cache, die hebben een unieke naam per build */
const CACHE = "boodschappen-v2";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./"])).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPagina = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isPagina) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const kopie = res.clone();
          caches.open(CACHE).then((c) => c.put(req, kopie));
          return res;
        })
        .catch(() => caches.match(req).then((h) => h || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const kopie = res.clone();
            caches.open(CACHE).then((c) => c.put(req, kopie));
          }
          return res;
        })
    )
  );
});
