// ─── LumaTradeFX Service Worker ───────────────────────────────
// Version bump this string to force cache refresh on deploy
const CACHE_NAME = "lumatrade-v1";
const OFFLINE_URL = "/offline.html";

// Assets to pre-cache for offline fallback
const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── INSTALL: pre-cache critical assets ─────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean up old caches ──────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: network first, fallback to cache ─────────────────────
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Don't cache API or WebSocket requests
  if (
    url.hostname === "api.lumafxt.com" ||
    event.request.url.startsWith("wss://") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for app shell
        if (response.ok && url.hostname === "app.lumafxt.com") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // For navigation requests show offline page
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// ── PUSH NOTIFICATIONS ──────────────────────────────────────────
self.addEventListener("push", event => {
  let data = { title: "LumaTradeFX Signal", body: "A new signal is ready.", tag: "lumatrade-signal" };
  try {
    data = event.data.json();
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    "/icons/icon-192.png",
      badge:   "/icons/icon-96.png",
      tag:     data.tag || "lumatrade-signal",
      data:    { url: data.url || "/" },
      vibrate: [200, 100, 200],
      requireInteraction: false,
      actions: [
        { action: "open",    title: "View Signal" },
        { action: "dismiss", title: "Dismiss"     },
      ],
    })
  );
});

// ── NOTIFICATION CLICK ──────────────────────────────────────────
self.addEventListener("notificationclick", event => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes("app.lumafxt.com") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
