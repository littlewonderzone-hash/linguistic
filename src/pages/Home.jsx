import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toDirectImageUrl } from "../lib/image";
import CountdownBanner from "../components/CountdownBanner";

/* বিভিন্ন ভাষার বর্ণমালার চার্ট — ৪র্থ সারিটা "Linguistic" (হাইলাইট)। শুধুই সাজসজ্জা। */
const CHART_ROWS = [
  ["ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ", "ঝ", "ঞ"],
  ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ"],
  ["ʃ", "ŋ", "ə", "ɔ", "ʈ", "ɖ", "ɣ", "ʔ", "ɲ", "ɸ"],
  ["L", "i", "n", "g", "u", "i", "s", "t", "i", "c"],
  ["अ", "आ", "इ", "ई", "उ", "ऊ", "ए", "ऐ", "ओ", "औ"],
  ["ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر"],
  ["а", "б", "в", "г", "д", "е", "ж", "з", "и", "й"],
  ["あ", "い", "う", "え", "お", "か", "き", "く", "け", "こ"],
];
const HIT_ROW = 3;

function GlyphChart({ faded = false }) {
  return (
    <div className={`lx-chart ${faded ? "lx-chart-faded" : ""}`} aria-hidden="true">
      {CHART_ROWS.map((row, r) =>
        row.map((ch, c) => (
          <span
            key={`${r}-${c}`}
            className={`lx-cell ${r === HIT_ROW ? "lx-cell-hit" : ""}`}
            style={r === HIT_ROW ? { "--i": c } : undefined}
          >
            {ch}
          </span>
        ))
      )}
    </div>
  );
}

const HELLOS = ["Hello", "হ্যালো", "こんにちは", "مرحبا", "Привет", "Γειά σου", "你好", "안녕하세요", "नमस्ते", "Hola", "Bonjour", "Merhaba"];

const FEATURES = [
  { glyph: "ক", color: "var(--color-redpen)", title: "আনলিমিটেড মক টেস্ট", desc: "যতবার ইচ্ছা অনুশীলন, কোনো সীমা নেই।" },
  { glyph: "α", color: "var(--color-bluepen)", title: "আসল পরীক্ষার অনুরূপ", desc: "প্রশ্নের মান ও ধরন হুবহু আসল পরীক্ষার অনুরূপ।" },
  { glyph: "ʃ", color: "var(--color-marigold-dark)", title: "লাইভ পরীক্ষা", desc: "নির্দিষ্ট সময়ে সবার সাথে প্রতিযোগিতামূলক পরীক্ষা ও র‍্যাঙ্কিং।" },
  { glyph: "あ", color: "var(--color-greenpen)", title: "অভিজ্ঞ মেন্টর দ্বারা মূল্যায়ন", desc: "লিখিত খাতা সরাসরি অভিজ্ঞ মেন্টরদের দ্বারা মূল্যায়ন।" },
  { glyph: "ж", color: "var(--color-ink)", title: "সারা দেশের মেরিট", desc: "সারা দেশের শিক্ষার্থীদের সাথে নিজের অবস্থান যাচাই।" },
  { glyph: "ع", color: "var(--color-redpen)", title: "বিস্তারিত মূল্যায়ন", desc: "প্রতিটা প্রশ্নে আলাদা নম্বর, খাতার ওপর মেন্টরের দাগ ও মন্তব্য।" },
];

const STEPS = [
  ["নিবন্ধন", "ফর্ম পূরণ করে বিকাশে পেমেন্ট"],
  ["যাচাই", "অ্যাডমিন পেমেন্ট দেখে কনফার্ম করেন"],
  ["লগইন", "ইমেইল ও পাসওয়ার্ডে পোর্টালে ঢুকুন"],
  ["পরীক্ষা", "মক বা লাইভ - খাতায় লিখে ছবি জমা"],
];

/* ছোট্ট ধাঁধা — একটা বানানো ভাষার দুটো নিয়ম ধরে তৃতীয়টা বের করা (অলিম্পিয়াডের ধরনের নমুনা) */
const PUZZLE_OPTIONS = ["পাখিগুলো", "পাখি", "নদীগুলো"];
const PUZZLE_ANSWER = "পাখিগুলো";

function Puzzle() {
  const [picked, setPicked] = useState(null);
  const solved = picked === PUZZLE_ANSWER;

  return (
    <div>
      <div className="lx-pair">
        <span className="lx-serif text-xl font-bold italic">tavu</span>
        <span className="lx-serif-bn text-lg">নদী</span>
      </div>
      <div className="lx-pair">
        <span className="lx-serif text-xl font-bold italic">tavuli</span>
        <span className="lx-serif-bn text-lg">নদীগুলো</span>
      </div>
      <div className="lx-pair">
        <span className="lx-serif text-xl font-bold italic">mira</span>
        <span className="lx-serif-bn text-lg">পাখি</span>
      </div>
      <div className="lx-pair">
        <span className="lx-serif text-xl font-bold italic text-[var(--color-marigold)]">mirali</span>
        <span className="lx-serif-bn text-lg text-[var(--color-marigold)]">= ?</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PUZZLE_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={solved}
            onClick={() => setPicked(opt)}
            className={`lx-opt lx-serif-bn ${picked === opt ? (opt === PUZZLE_ANSWER ? "lx-opt-right" : "lx-opt-wrong") : ""}`}
          >
            {opt}
          </button>
        ))}
      </div>
      <p className="mt-3 min-h-[3rem] text-sm leading-relaxed text-[var(--color-paper)]/85" aria-live="polite">
        {picked === null && "নিয়মটা ধরতে পারলে বলো — mirali মানে কী?"}
        {picked !== null && !solved && "আবার ভাবো — tavu থেকে tavuli হতে কী যোগ হয়েছে?"}
        {solved && "ঠিক! শব্দের শেষে -li যোগ হলে বহুবচন হয়। অলিম্পিয়াডে এভাবেই অচেনা ভাষার নিয়ম ধরতে হয়।"}
      </p>
    </div>
  );
}

export default function Home() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSettings()
      .then((res) => setSettings(res.data || {}))
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }, []);

  const hasImage = !!settings?.courseImageUrl;
  const priceLabel = loading ? "মূল্য লোড হচ্ছে…" : settings?.price ? `৳${settings.price} টাকায়` : "ফ্রি";

  return (
    <div>
      {settings && (
        <CountdownBanner
          price={settings.price}
          deadline={settings.discountDeadline}
          maintenanceMode={settings.maintenanceMode}
        />
      )}

      {/* ===== হিরো ===== */}
      <section className="lx-hero">
        <div className="relative mx-auto grid max-w-5xl items-center gap-12 px-4 pb-16 pt-12 md:grid-cols-[1fr_1fr] md:pb-24 md:pt-20">
          <div>
            <p className="lx-serif text-sm text-[var(--color-paper)]/75">
              <span className="font-bold italic text-white">Linguistic</span>{" "}
              <span className="italic">/lɪŋˈɡwɪstɪk/</span> বিণ. — ভাষা-সংক্রান্ত
            </p>
            <h1 className="lx-serif mt-3 text-6xl font-bold italic leading-none text-white sm:text-7xl md:text-[5.5rem]">
              Linguistic
            </h1>
            <p className="lx-serif-bn mt-4 text-2xl font-extrabold leading-snug text-[var(--color-marigold)] md:text-3xl">
              অলিম্পিয়াড প্রস্তুতি কোর্স
            </p>
            <p className="mt-1 font-display text-base font-semibold text-[var(--color-paper)]/80">অগ্রদূত উপস্থাপিত</p>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--color-paper)]/90 md:text-lg">
              ষষ্ঠ থেকে দ্বাদশ শ্রেণির শিক্ষার্থীদের জন্য ভাষাবিজ্ঞান অলিম্পিয়াডের পরিপূর্ণ প্রস্তুতি। লিখিত
              মক টেস্ট, লাইভ পরীক্ষা, বিস্তারিত মূল্যায়ন ও র‍্যাঙ্কিং — সবকিছু এক জায়গায়।
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded-xl bg-[var(--color-marigold)] px-7 py-3.5 font-display text-base font-bold text-[var(--color-ink-dark)] shadow-lg shadow-black/30 transition hover:brightness-110 active:scale-95"
              >
                এখনই নিবন্ধন করুন
              </Link>
              <Link
                to="/status"
                className="rounded-xl border-2 border-white/70 px-7 py-3.5 font-display text-base font-bold text-white transition hover:bg-white hover:text-[var(--color-ink)] active:scale-95"
              >
                নিবন্ধন স্ট্যাটাস দেখুন
              </Link>
            </div>
          </div>

          <figure className="relative">
            <span className="lx-bubble hidden md:block" style={{ top: "-1.6rem", left: "-1.2rem", "--d": "0s" }}>Hello</span>
            <span className="lx-bubble lx-bubble-alt hidden md:block" style={{ top: "2.2rem", right: "-1.4rem", "--d": "1.2s" }}>こんにちは</span>
            <span className="lx-bubble hidden md:block" style={{ bottom: "2.6rem", left: "-1.6rem", "--d": "2.4s" }}>Привет</span>
            <span className="lx-bubble lx-bubble-alt hidden md:block" style={{ bottom: "-1.2rem", right: "1.4rem", "--d": "0.6s" }}>مرحبا</span>

            {hasImage ? (
              <div className="relative">
                <div className="absolute -right-3 -top-3 w-full md:-right-5 md:-top-5">
                  <GlyphChart faded />
                </div>
                <div className="relative aspect-[4/3] w-full overflow-hidden border-2 border-white/80 bg-[var(--color-ink)] shadow-2xl">
                  <img
                    src={toDirectImageUrl(settings.courseImageUrl)}
                    alt="Linguistic কোর্স"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>
            ) : (
              <GlyphChart />
            )}
            <figcaption className="lx-serif mt-4 flex items-center justify-between gap-3 text-xs italic text-[var(--color-paper)]/75">
              <span>চিত্র: নানা ভাষার বর্ণমালা — ঘরে ঘরে ছুঁয়ে দেখো</span>
              <span className="lx-serif-bn rotate-[-3deg] rounded-sm bg-white px-3 py-1.5 text-sm font-bold not-italic text-[var(--color-ink)] shadow-lg">
                {priceLabel}
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ===== নানা ভাষার শুভেচ্ছা-ফিতা ===== */}
      <div className="lx-marquee" aria-hidden="true">
        <div className="lx-marquee-track">
          {[...HELLOS, ...HELLOS].map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      </div>

      {/* ===== কোর্সে যা যা থাকছে ===== */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="lx-serif-bn text-3xl font-extrabold text-[var(--color-ink)]">কোর্সে যা যা থাকছে</h2>
        <p className="mt-1 text-sm text-[var(--color-text)]/70">প্রতিটা সুবিধার পাশে একটা করে ভিন্ন লিপির বর্ণ — কারণ এটা ভাষার কোর্স।</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="lx-feature" style={{ "--accent": f.color }}>
              <span className="lx-feature-bg" aria-hidden="true">{f.glyph}</span>
              <span className="lx-glyph" aria-hidden="true">{f.glyph}</span>
              <h3 className="lx-serif-bn relative mt-4 text-lg font-bold text-[var(--color-ink)]">{f.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-[var(--color-text)]/80">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== ছোট্ট ধাঁধা ===== */}
      <section className="lx-puzzle">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 md:grid-cols-2">
          <div>
            <p className="lx-serif text-sm italic text-[var(--color-marigold)]">Try it · একটা মিনিট-ধাঁধা</p>
            <h2 className="lx-serif-bn mt-2 text-3xl font-extrabold leading-snug">
              অচেনা ভাষা, চেনা যুক্তি
            </h2>
            <p className="mt-3 max-w-md text-[var(--color-paper)]/85">
              লিঙ্গুইসটিক অলিম্পিয়াডে কোনো ভাষা জানা লাগে না — সাজানো কিছু উদাহরণ থেকে নিয়ম ধরে
              উত্তর বের করতে হয়। এই ধাঁধাটা একবার চেষ্টা করে দেখো।
            </p>
            <Link
              to="/register"
              className="mt-6 inline-block rounded-xl bg-[var(--color-marigold)] px-6 py-3 font-display font-bold text-[var(--color-ink-dark)] transition hover:brightness-110 active:scale-95"
            >
              এমন আরও ধাঁধার জন্য নিবন্ধন করুন
            </Link>
          </div>
          <div className="border border-white/25 bg-white/5 p-5">
            <p className="lx-serif mb-1 text-xs italic text-[var(--color-paper)]/60">Tavu ভাষা (বানানো)</p>
            <Puzzle />
          </div>
        </div>
      </section>

      {/* ===== অংশগ্রহণের ধাপ ===== */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="lx-serif-bn text-3xl font-extrabold text-[var(--color-ink)]">কীভাবে অংশ নেবেন</h2>
        <ol className="lx-steps mt-8">
          {STEPS.map(([title, gloss], i) => (
            <li key={title} className="lx-step">
              <span className="lx-step-num">{i + 1}</span>
              <p className="lx-serif-bn text-lg font-bold text-[var(--color-ink)]">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text)]/75">{gloss}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== শেষ ডাক ===== */}
      <section className="bg-[var(--color-marigold)]">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="lx-serif-bn text-2xl font-extrabold text-[var(--color-ink-dark)]">লিখিত পরীক্ষা ও লাইভ পরীক্ষা — সবই চালু আছে</p>
            <p className="mt-1 text-sm text-[var(--color-ink-dark)]/80">নিবন্ধিত হলে স্টুডেন্ট লগইন করে পোর্টাল থেকে অংশ নিন।</p>
          </div>
          <Link
            to="/student/login"
            className="shrink-0 rounded-xl bg-[var(--color-ink)] px-7 py-3.5 font-display text-base font-bold text-white transition hover:brightness-110 active:scale-95"
          >
            স্টুডেন্ট লগইন
          </Link>
        </div>
      </section>
    </div>
  );
}
