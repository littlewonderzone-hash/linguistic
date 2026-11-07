import { useEffect, useRef, useState } from "react";

/** লগইন করা স্টুডেন্টদের জন্য ভাসমান যোগাযোগ বাটন — চাপলে দুইজনের WhatsApp নম্বর দেখায়,
 *  কোনোটায় চাপলেই সরাসরি ওই নম্বরের WhatsApp ইনবক্স খোলে (wa.me লিংক)। */
const CONTACTS = [
  { name: "Md. Musfiqul Alom", display: "+880 1872-821870", wa: "8801872821870" },
  { name: "Rion Khan", display: "+880 1759-609395", wa: "8801759609395" },
];

function WhatsAppIcon({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.04 3C9.4 3 4 8.4 4 15.03c0 2.12.55 4.19 1.6 6.02L4 28l7.1-1.86a12 12 0 0 0 4.94 1.06h.01C22.68 27.2 28 21.8 28 15.17A12.1 12.1 0 0 0 16.04 3Zm0 21.9h-.01c-1.78 0-3.52-.48-5.04-1.38l-.36-.21-4.21 1.1 1.12-4.1-.24-.38a9.9 9.9 0 0 1-1.52-5.3c0-5.47 4.46-9.92 9.95-9.92 2.65 0 5.14 1.03 7.01 2.9a9.84 9.84 0 0 1 2.9 7.02c0 5.47-4.46 9.92-9.9 9.92Zm5.44-7.43c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

export default function FloatingContact({ studentName = "" }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const text = encodeURIComponent(
    `আসসালামু আলাইকুম, আমি ${studentName ? studentName + " — " : ""}Linguistic অলিম্পিয়াড প্রস্তুতি কোর্সের স্টুডেন্ট। একটা বিষয়ে জানার ছিল।`
  );

  return (
    <div ref={boxRef} className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-3 print:hidden">
      {open && (
        <div className="w-[17.5rem] overflow-hidden rounded-2xl border border-[var(--color-paper-line)] bg-white shadow-2xl">
          <div className="flex items-center gap-2 bg-[#128c7e] px-4 py-3 text-white">
            <WhatsAppIcon className="h-5 w-5" />
            <p className="font-display text-sm font-bold">WhatsApp-এ যোগাযোগ করুন</p>
          </div>
          <div className="divide-y divide-[var(--color-paper-line)]">
            {CONTACTS.map((c) => (
              <a
                key={c.wa}
                href={`https://wa.me/${c.wa}?text=${text}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-[#25d366]/10"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#25d366]/15 font-display font-bold text-[#128c7e]">
                  {c.name.replace("Md. ", "").charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-bold text-[var(--color-ink)]">{c.name}</span>
                  <span className="block text-xs tabular-nums text-[var(--color-text)]/65">{c.display}</span>
                </span>
                <span className="text-[#128c7e]" aria-hidden="true">
                  <WhatsAppIcon className="h-5 w-5" />
                </span>
              </a>
            ))}
          </div>
          <p className="bg-[var(--color-paper)] px-4 py-2 text-[11px] text-[var(--color-text)]/60">নাম চাপলেই সরাসরি WhatsApp চ্যাট খুলবে।</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="যোগাযোগ"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-3 font-display text-sm font-bold text-white shadow-xl shadow-black/25 transition hover:brightness-105 active:scale-95"
      >
        <WhatsAppIcon className="h-6 w-6" />
        <span className="hidden sm:inline">{open ? "বন্ধ করুন" : "যোগাযোগ"}</span>
      </button>
    </div>
  );
}
