import { useEffect, useState } from "react";

/** প্রশ্ন/উত্তর/সমাধানের ছবিতে ট্যাপ করলে পুরো পর্দায় খোলে — + / − বাটন বা ডাবল-ট্যাপে জুম,
 *  আর জুম করা ছবি আঙুল দিয়ে স্ক্রল করে দেখা যায়। ছোট হরফ ও ভাষাবিজ্ঞানের চিহ্ন পড়ার জন্য। */
export default function ZoomImage({ src, alt = "", className = "", eager = false }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;
  return (
    <>
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        onClick={() => setOpen(true)}
        className={`${className} cursor-zoom-in`}
      />
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

function Lightbox({ src, alt, onClose }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const clamp = (z) => Math.min(4, Math.max(1, Math.round(z * 100) / 100));

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/92" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-white">
        <span className="text-xs opacity-70">{Math.round(zoom * 100)}% · ডাবল-ট্যাপ করেও জুম হয়</span>
        <div className="flex gap-2">
          <button onClick={() => setZoom((z) => clamp(z - 0.5))} className="h-9 w-9 rounded-lg bg-white/15 text-lg font-bold">−</button>
          <button onClick={() => setZoom(1)} className="rounded-lg bg-white/15 px-3 text-xs font-bold">রিসেট</button>
          <button onClick={() => setZoom((z) => clamp(z + 0.5))} className="h-9 w-9 rounded-lg bg-white/15 text-lg font-bold">+</button>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-[var(--color-redpen)] text-lg font-bold" aria-label="বন্ধ করুন">✕</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <img
          src={src}
          alt={alt}
          onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2.5))}
          style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
          className="mx-auto block select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}
