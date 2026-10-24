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

const ENTRIES = [
  ["আনলিমিটেড মক টেস্ট", "যতবার ইচ্ছা অনুশীলন, কোনো সীমা নেই।"],
  ["আসল পরীক্ষার অনুরূপ", "প্রশ্নের মান ও ধরন হুবহু আসল পরীক্ষার অনুরূপ।"],
  ["লাইভ পরীক্ষা", "নির্দিষ্ট সময়ে সবার সাথে প্রতিযোগিতামূলক পরীক্ষা ও র‍্যাঙ্কিং।"],
  ["অভিজ্ঞ মেন্টর দ্বারা মূল্যায়ন", "লিখিত খাতা সরাসরি অভিজ্ঞ মেন্টরদের দ্বারা মূল্যায়ন।"],
  ["সারা দেশের মেরিট", "সারা দেশের শিক্ষার্থীদের সাথে নিজের অবস্থান যাচাই।"],
  ["বিভাগীয় সেরা ২০", "বিভাগীয় সেরা ২০ প্রস্তুতির জন্য বিশেষ লাইভ মক টেস্ট।"],
];

const STEPS = [
  ["নিবন্ধন", "ফর্ম পূরণ করে বিকাশে পেমেন্ট"],
  ["যাচাই", "অ্যাডমিন পেমেন্ট দেখে কনফার্ম করেন"],
  ["লগইন", "ইমেইল ও পাসওয়ার্ডে পোর্টালে ঢুকুন"],
  ["পরীক্ষা", "মক বা লাইভ — খাতায় লিখে ছবি জমা"],
];

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
      <section className="mx-auto max-w-5xl px-4 pb-14 pt-10 md:pb-20 md:pt-16">
        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-12">
          <div>
            <p className="lx-serif text-sm text-[var(--color-ink)]/70">
              <span className="font-bold italic text-[var(--color-ink)]">Linguistic</span>{" "}
              <span className="italic">/lɪŋˈɡwɪstɪk/</span> বিণ. — ভাষা-সংক্রান্ত
            </p>
            <h1 className="lx-serif-bn mt-3 text-4xl font-extrabold leading-[1.25] text-[var(--color-ink)] md:text-5xl">
              লিঙ্গুইসটিক অলিম্পিয়াড প্রস্তুতি কোর্স
            </h1>
            <p className="mt-2 font-display text-lg font-semibold text-[var(--color-marigold-dark)]">অগ্রদূত</p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--color-text)]/90 md:text-lg">
              ষষ্ঠ থেকে দশম শ্রেণির শিক্ষার্থীদের জন্য ভাষাবিজ্ঞান অলিম্পিয়াডের পরিপূর্ণ প্রস্তুতি। লিখিত
              মক টেস্ট, লাইভ পরীক্ষা, বিভাগীয় সেরা ২০ লাইভ মক, বিস্তারিত মূল্যায়ন ও র‍্যাঙ্কিং —
              সবকিছু এক জায়গায়।
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded-xl bg-[var(--color-redpen)] px-6 py-3 font-display text-base font-bold text-white shadow-lg shadow-[var(--color-redpen)]/20 transition hover:brightness-110 active:scale-95"
              >
                এখনই নিবন্ধন করুন
              </Link>
              <Link
                to="/status"
                className="rounded-xl bg-[var(--color-marigold)] px-6 py-3 font-display text-base font-bold text-[var(--color-ink-dark)] shadow-lg shadow-[var(--color-marigold)]/30 transition hover:brightness-110 active:scale-95"
              >
                নিবন্ধন স্ট্যাটাস দেখুন
              </Link>
            </div>
          </div>

          <figure className="relative">
            {hasImage ? (
              <div className="relative">
                <div className="absolute -right-3 -top-3 w-full opacity-90 md:-right-5 md:-top-5">
                  <GlyphChart faded />
                </div>
                <div className="relative aspect-[4/3] w-full overflow-hidden border-2 border-[var(--color-ink)] bg-[var(--color-ink)] shadow-xl">
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
            <figcaption className="lx-serif mt-3 flex items-center justify-between gap-3 text-xs italic text-[var(--color-ink)]/70">
              <span>চিত্র ১: নানা ভাষার বর্ণমালা</span>
              <span className="lx-serif-bn not-italic rounded-sm bg-[var(--color-marigold)] px-3 py-1 text-sm font-bold text-[var(--color-ink-dark)]">
                {loading ? "মূল্য লোড হচ্ছে…" : settings?.price ? `৳${settings.price} টাকায়` : "ফ্রি"}
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ===== কোর্সে যা যা থাকছে — অভিধানের পাতা ===== */}
      <section className="border-y border-[var(--color-paper-line)] bg-white/50">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="lx-serif-bn text-2xl font-bold text-[var(--color-ink)]">কোর্সে যা যা থাকছে</h2>
          <div className="lx-dict mt-5">
            {ENTRIES.map(([word, meaning], i) => (
              <div key={word} className="lx-entry">
                <p className="lx-serif-bn text-lg font-bold text-[var(--color-ink)]">
                  {word}
                  <sup className="ml-1 text-xs font-normal text-[var(--color-ink)]/50">{i + 1}</sup>{" "}
                  <span className="lx-serif text-sm font-normal italic text-[var(--color-marigold-dark)]">বি.</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text)]/85">{meaning}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== অংশগ্রহণের ধাপ — আন্তঃরৈখিক সারি (ধাপগুলো সত্যিই ক্রমানুসারে) ===== */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="lx-serif-bn text-2xl font-bold text-[var(--color-ink)]">কীভাবে অংশ নেবেন</h2>
        <ol className="lx-steps mt-5">
          {STEPS.map(([title, gloss], i) => (
            <li key={title} className="lx-step">
              <span className="lx-serif text-xs text-[var(--color-ink)]/50">{i + 1}</span>
              <p className="lx-serif-bn text-lg font-bold text-[var(--color-ink)]">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text)]/75">{gloss}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-start gap-3 border-t border-[var(--color-ink)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm text-[var(--color-text)]/75">
            অনুধাবনমূলক পরীক্ষা, বিভাগীয় সেরা ২০ বানান প্রতিযোগিতা ও লাইভ পরীক্ষা — সবই এখন চালু আছে।
            স্টুডেন্ট লগইন করে পোর্টাল থেকে অংশ নিন।
          </p>
          <Link
            to="/student/login"
            className="shrink-0 rounded-xl bg-[var(--color-ink)] px-5 py-2.5 font-display text-sm font-bold text-white transition hover:brightness-110"
          >
            স্টুডেন্ট লগইন
          </Link>
        </div>
      </section>
    </div>
  );
}
