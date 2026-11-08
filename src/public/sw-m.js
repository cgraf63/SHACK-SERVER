/*
    SHACK-SERVER mobile app (/m) - service worker.

    Makes the app installable ("Add to home screen") and starts it fast:
    the app shell is cached, but always refreshed from the server when it
    is reachable (network first). API data is never cached - spots,
    alerts and the radio are always live.
*/

const CACHE = "shack-mobile-v1";
const SHELL = [
    "/m",
    "/manifest.webmanifest",
    "/assets/app/icon-192.png",
    "/assets/app/icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(SHELL)).catch(() => undefined)
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    );
    self.clients.claim();
});

self.addEventListener("fetch", event => {

    const url = new URL(event.request.url);

    if (event.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) {
        return;
    }

    if (!SHELL.includes(url.pathname)) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                const copy = response.clone();
                caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => undefined);
                return response;
            })
            .catch(() => caches.match(event.request))
    );

});
