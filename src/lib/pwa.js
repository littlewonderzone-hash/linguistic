/** ব্রাউজারের "হোম স্ক্রিনে যোগ করুন" ইভেন্ট ধরে রাখে — পোর্টালের বাটন থেকে ডাকা হয়। */
let deferred = null;
const listeners = new Set();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    listeners.forEach((fn) => fn(true));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((fn) => fn(false));
  });
}

export const canInstall = () => !!deferred;
export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  listeners.forEach((fn) => fn(false));
  return choice.outcome === "accepted";
}

export function registerServiceWorker() {
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
}
