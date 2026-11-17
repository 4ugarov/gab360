// Service worker ГАБ 360: оболочка и данные — network-first (кэш для офлайна).
// v2: index.html тоже network-first — иначе после обновления сайта браузер
// продолжает показывать старую версию из кэша.
const SHELL = "gab360-shell-v2";
const SHELL_FILES = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isShell =
    e.request.mode === "navigate" ||
    url.pathname.endsWith("index.html") ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("sw.js") ||
    url.pathname.endsWith("manifest.json");
  // всё, кроме самого data.json.enc, — network-first с офлайн-fallback
  if (url.pathname.endsWith("data.json.enc") || isShell) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // статические ассеты (иконка и т.п.) — кэш-первый
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(e.request, copy));
          return res;
        })
    )
  );
});
