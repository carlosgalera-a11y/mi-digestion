/* Mi Digestión — Service Worker (PWA)
 * Cachea el "app shell" público para uso sin conexión.
 * NO cachea el modelo ONNX (29 MB) ni el runtime wasm ni las llamadas a Supabase. */

const VERSION = "midig-v1";
const CACHE = `midig-shell-${VERSION}`;

const APP_SHELL = [
  "./",
  "index.html", "diario.html", "historial.html", "bristol.html",
  "aprende.html", "consulta.html", "acceso.html",
  "css/styles.css",
  "js/storage.js", "js/ui.js", "js/bristol.js", "js/charts.js",
  "js/diario.js", "js/historial.js", "js/pwa.js",
  "favicon.svg", "manifest.webmanifest",
  "img/qr-app.svg",
  "img/icons/icon-192.png", "img/icons/icon-512.png",
  "img/icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function noCachear(url) {
  return url.pathname.includes("/modelo/") ||        // modelo ONNX (grande)
         url.pathname.includes("/vendor/ort/") ||    // runtime wasm (grande)
         url.pathname.endsWith(".onnx") ||
         url.pathname.endsWith(".wasm");
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Solo gestionamos el mismo origen; Supabase y demás van directos a la red.
  if (url.origin !== self.location.origin) return;
  if (noCachear(url)) return;

  // Navegaciones (páginas): red primero, con respaldo de caché sin conexión.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        return resp;
      }).catch(() => caches.match(req).then((m) => m || caches.match("index.html")))
    );
    return;
  }

  // Recursos estáticos: caché primero, luego red (y se guarda).
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((resp) => {
        if (resp.ok && resp.type === "basic") {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        }
        return resp;
      }).catch(() => hit)
    )
  );
});
