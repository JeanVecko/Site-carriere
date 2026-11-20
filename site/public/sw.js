/* Service worker de Carrières RDC (application installable).
   - Fichiers du site (scripts, styles, icônes, polices) : gardés sur le téléphone, ouverture rapide.
   - Pages et offres : toujours chargées en ligne d'abord ; la dernière version consultée sert hors connexion.
   - Administration, espace recruteur et envois (formulaires, statistiques) : jamais mis en cache. */
const VERSION = "v3";
const STATIC_CACHE = `carrieres-static-${VERSION}`;
const PAGES_CACHE = `carrieres-pages-${VERSION}`;
const API_CACHE = `carrieres-api-${VERSION}`;
const OFFLINE_URL = "/hors-ligne.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/LOGO/Logo.png"];
const API_HOST = "carrieres-rdc-api.onrender.com";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("carrieres-") && !key.endsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(STATIC_CACHE)).put(request, response.clone());
    return response;
  } catch {
    return Response.error(); // hors connexion et fichier jamais téléchargé
  }
}

async function networkFirst(request, cacheName, max) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      trim(cacheName, max);
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // API publique (Render) : offres et images, en ligne d'abord ; jamais l'admin ni l'espace recruteur.
  if (url.hostname === API_HOST) {
    if (/^\/api\/announcements(\/\d+(\/(cover|media\/\d+))?)?$/.test(url.pathname)) {
      event.respondWith(networkFirst(request, API_CACHE, 120));
    }
    return;
  }

  // Polices Google : stables, gardées sur le téléphone.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (/^\/(admin|espace-recruteur|api)(\/|$)/.test(url.pathname)) return;

  if (url.pathname.startsWith("/_next/static/") || /^\/(icons|LOGO)\//.test(url.pathname) || /\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pages (et leurs données de navigation) : en ligne d'abord, dernière version gardée pour le hors-ligne.
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, PAGES_CACHE, 40).catch(async () => (await caches.match(OFFLINE_URL, { ignoreVary: true, ignoreSearch: true })) || Response.error())
    );
    return;
  }
  // Données de navigation de Next.js : toujours avec « ?_rsc= » (adresse distincte de la page HTML).
  if (url.searchParams.has("_rsc")) {
    event.respondWith(networkFirst(request, PAGES_CACHE, 40));
  }
});
