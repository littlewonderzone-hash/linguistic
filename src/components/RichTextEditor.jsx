import { useEffect, useRef, useState } from "react";

const COLORS = ["#16211f", "#b23a2e", "#2b4f9e", "#2f7a4f", "#d98e04"];

/** ভাষাবিজ্ঞানের প্রশ্নে বারবার লাগে এমন চিহ্ন — IPA, ডায়াক্রিটিক, গ্রিক, তীর। কার্সারের জায়গায় বসে। */
const SYMBOL_GROUPS = [
  ["IPA", "ʃ ʒ ŋ ɲ ɳ ə ɛ ɔ ɪ ʊ ʌ æ ɑ ɒ ɨ ɯ ʈ ɖ ɭ ɾ ɹ ɣ ʔ ɸ β θ ð χ ħ ʕ ɓ ɗ ʰ ʷ ʲ ː ˈ ˌ"],
  ["ডায়াক্রিটিক", "ā ī ū ē ō ã ĩ ũ ñ ṭ ḍ ṇ ś ṣ ḥ ṃ ç š ž č ć ǎ é è ü ö ä"],
  ["অন্যান্য", "α γ δ ε λ μ π σ φ ψ ω → ← ↔ ⇒ ≈ ≠ ∅ ‖ · ′ ″"],
];

/** নির্ভরতা ছাড়া হালকা রিচ-টেক্সট এডিটর — উদ্দীপক (কবিতা/গদ্য) লেখার জন্য।
 *  value/onChange HTML স্ট্রিং হিসেবে কাজ করে। resetKey পাল্টালে (যেমন নতুন
 *  ডকুমেন্ট লোড হলে বা ফর্ম রিসেট হলে) এডিটরের ভেতরের কনটেন্ট নতুন করে বসানো
 *  হয় — প্রতিটা কিস্ট্রোকে না, তাহলে কার্সার লাফিয়ে পড়ত। */
export default function RichTextEditor({ value, onChange, placeholder, resetKey }) {
  const ref = useRef(null);
  const [showSymbols, setShowSymbols] = useState(false);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  function exec(cmd, arg) {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    onChange(ref.current?.innerHTML || "");
  }

  function insertSymbol(ch) {
    ref.current?.focus();
    document.execCommand("insertText", false, ch);
    onChange(ref.current?.innerHTML || "");
  }

  const Btn = ({ children, onClick, title }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // ফোকাস হারানো আটকানো
      onClick={onClick}
      className="rounded-md border border-[var(--color-paper-line)] bg-white px-2 py-1 text-xs font-bold text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-xl border border-[var(--color-paper-line)] bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-paper-line)] p-2">
        <Btn title="Bold" onClick={() => exec("bold")}><b>B</b></Btn>
        <Btn title="Italic" onClick={() => exec("italic")}><i>I</i></Btn>
        <Btn title="Underline" onClick={() => exec("underline")}><u>U</u></Btn>
        <Btn title="বাম" onClick={() => exec("justifyLeft")}>⯇</Btn>
        <Btn title="মাঝে" onClick={() => exec("justifyCenter")}>≡</Btn>
        <Btn title="ডান" onClick={() => exec("justifyRight")}>⯈</Btn>
        <Btn title="বুলেট লিস্ট" onClick={() => exec("insertUnorderedList")}>•—</Btn>
        <Btn title="নাম্বার লিস্ট" onClick={() => exec("insertOrderedList")}>1.</Btn>
        <Btn title="উদ্ধৃতি" onClick={() => exec("formatBlock", "blockquote")}>❝</Btn>
        <Btn title="লাইন ব্রেক (কবিতার জন্য)" onClick={() => exec("insertHTML", "<br>")}>⏎</Btn>
        <Btn title="Undo" onClick={() => exec("undo")}>↶</Btn>
        <Btn title="Redo" onClick={() => exec("redo")}>↷</Btn>
        <Btn title="ফন্ট বড়" onClick={() => exec("fontSize", "5")}>A+</Btn>
        <Btn title="ফন্ট ছোট" onClick={() => exec("fontSize", "3")}>A-</Btn>
        <Btn title="ফরম্যাট মুছুন" onClick={() => exec("removeFormat")}>✕</Btn>
        <Btn title="IPA ও বিশেষ চিহ্ন" onClick={() => setShowSymbols((v) => !v)}>{showSymbols ? "ʃ ▲" : "ʃ ▼"}</Btn>
        <div className="ml-1 flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title="রঙ"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("foreColor", c)}
              className="h-5 w-5 rounded-full border border-black/10"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      {showSymbols && (
        <div className="space-y-1.5 border-b border-[var(--color-paper-line)] bg-[var(--color-paper)] p-2">
          {SYMBOL_GROUPS.map(([name, chars]) => (
            <div key={name} className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[10px] font-bold text-[var(--color-text)]/50">{name}</span>
              {chars.split(" ").map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertSymbol(ch)}
                  className="lx-serif min-w-[1.75rem] rounded border border-[var(--color-paper-line)] bg-white px-1.5 py-0.5 text-base leading-tight hover:bg-[var(--color-marigold)]/30"
                >
                  {ch}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
        className="min-h-[140px] whitespace-pre-wrap px-3 py-2 text-sm leading-relaxed text-[var(--color-text)] outline-none empty:before:text-[var(--color-text)]/40 empty:before:content-[attr(data-placeholder)]"
        style={{ fontFamily: "var(--font-serif-bn), var(--font-serif)" }}
      />
    </div>
  );
}
