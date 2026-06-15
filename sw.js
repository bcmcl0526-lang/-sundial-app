// Minimal service worker - enables "Add to Home Screen" installability
// and is the hook point for future push notification support.

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // pass-through, no caching strategy needed for this simple app
});
