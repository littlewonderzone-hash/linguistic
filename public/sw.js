/* অগ্রদূত Linguistic — ছোট্ট সার্ভিস ওয়ার্কার: অ্যাপ হিসেবে ইনস্টল করা যায়, আর নেটওয়ার্ক
 * না থাকলে আগে দেখা পেইজের কাঠামো দেখায়। নেটওয়ার্ক-ফার্স্ট, তাই নতুন ভার্সন সবসময় আগে আসে;
 * Apps Script API (script.google.com) কখনো ক্যাশ হয় না। */
const CACHE = "lx-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("/") : undefined)))
  );
});
