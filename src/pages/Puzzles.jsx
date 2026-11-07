import { useState } from "react";
import { Link } from "react-router-dom";

/** বিনামূল্যে নমুনা ধাঁধা — নিবন্ধন ছাড়াই করা যায়, উত্তর সাথে সাথে মিলিয়ে ব্যাখ্যা দেখায়।
 *  প্রতিটা ধাঁধায় একটা বানানো ভাষার কয়েকটা উদাহরণ থেকে নিয়ম ধরে নতুন শব্দের মানে বের করতে হয়। */
const PUZZLES = [
  {
    lang: "Tavu",
    title: "বহুবচনের নিয়ম",
    pairs: [["tavu", "নদী"], ["tavuli", "নদীগুলো"], ["mira", "পাখি"]],
    ask: "mirali",
    options: ["পাখিগুলো", "পাখি", "নদীগুলো", "ছোট পাখি"],
    answer: "পাখিগুলো",
    why: "tavu → tavuli: শব্দের শেষে -li যোগ হলে বহুবচন হয়। তাই mira → mirali = পাখিগুলো।",
  },
  {
    lang: "Kolu",
    title: "সর্বনাম আর ক্রিয়া",
    pairs: [["mo kal suma", "আমি ভাত খাই"], ["to kal suma", "তুমি ভাত খাও"], ["mo pan suma", "আমি জল খাই"]],
    ask: "to pan suma",
    options: ["তুমি জল খাও", "আমি জল খাই", "তুমি ভাত খাও", "আমি ভাত খাই"],
    answer: "তুমি জল খাও",
    why: "mo = আমি, to = তুমি, kal = ভাত, pan = জল, suma = খা-। শব্দগুলো একই ক্রমে বসে, তাই to pan suma = তুমি জল খাও।",
  },
  {
    lang: "Rena",
    title: "না-বোধক ও অতীত",
    pairs: [["sib", "সে দেখে"], ["sibta", "সে দেখেছিল"], ["nosib", "সে দেখে না"]],
    ask: "nosibta",
    options: ["সে দেখেনি", "সে দেখে না", "সে দেখেছিল", "সে দেখবে না"],
    answer: "সে দেখেনি",
    why: "no- শুরুতে বসলে না-বোধক (sib → nosib), আর -ta শেষে বসলে অতীত (sib → sibta)। দুটো একসাথে: nosibta = সে দেখেনি।",
  },
  {
    lang: "Ilo",
    title: "সংখ্যা পদ্ধতি",
    pairs: [["ru tan", "৫"], ["mi tan", "১৫"], ["mi tan so", "১৭"]],
    ask: "so tan mi",
    options: ["১৩", "২৩", "১২", "১৫"],
    answer: "১৩",
    why: "tan = ৫ ও ru = ১ (ru tan = ১×৫), mi = ৩ (mi tan = ১৫), so = ২ (১৫ + ২ = ১৭)। তাই so tan mi = ২×৫ + ৩ = ১৩।",
  },
  {
    lang: "Zipa",
    title: "শব্দের দ্বিত্ব",
    pairs: [["jipa", "ছোট"], ["jipajipa", "খুব ছোট"], ["lomu", "বড়"]],
    ask: "lomulomu",
    options: ["খুব বড়", "একটু বড়", "ছোট", "বড় বড়"],
    answer: "খুব বড়",
    why: "শব্দটাকে দুইবার বললে অর্থ জোরালো হয় (jipa → jipajipa = খুব ছোট)। তাই lomulomu = খুব বড়।",
  },
];

function PuzzleCard({ puzzle, index, picked, onPick }) {
  const solved = picked === puzzle.answer;
  return (
    <div className="border-2 border-[var(--color-ink)] bg-white p-5 shadow-[5px_5px_0_var(--color-marigold)]">
      <div className="flex items-baseline justify-between">
        <p className="lx-serif-bn text-lg font-extrabold text-[var(--color-ink)]">
          {index + 1}. {puzzle.title}
        </p>
        <span className="lx-serif text-xs italic text-[var(--color-ink)]/60">{puzzle.lang} ভাষা (বানানো)</span>
      </div>

      <div className="mt-3">
        {puzzle.pairs.map(([a, b]) => (
          <div key={a} className="flex items-baseline justify-between gap-3 border-b border-dashed border-[var(--color-paper-line)] py-2">
            <span className="lx-serif text-lg font-bold italic text-[var(--color-ink)]">{a}</span>
            <span className="lx-serif-bn">{b}</span>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 py-2">
          <span className="lx-serif text-lg font-bold italic text-[var(--color-redpen)]">{puzzle.ask}</span>
          <span className="lx-serif-bn font-bold text-[var(--color-redpen)]">= ?</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {puzzle.options.map((opt) => {
          const chosen = picked === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={solved}
              onClick={() => onPick(opt)}
              className={`lx-serif-bn border-2 px-3.5 py-2 text-sm font-semibold transition ${
                chosen
                  ? opt === puzzle.answer
                    ? "border-[var(--color-greenpen)] bg-[var(--color-greenpen)] text-white"
                    : "border-[var(--color-redpen)] bg-[var(--color-redpen)] text-white"
                  : "border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white disabled:opacity-50"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <p className="mt-3 min-h-[2.5rem] text-sm leading-relaxed" aria-live="polite">
        {picked === null && <span className="text-[var(--color-text)]/60">নিয়মটা ধরে উত্তর বেছে নাও।</span>}
        {picked !== null && !solved && <span className="text-[var(--color-redpen)]">আবার ভাবো — উদাহরণগুলোর মধ্যে কী বদলেছে লক্ষ করো।</span>}
        {solved && <span className="text-[var(--color-greenpen)]">✓ ঠিক! {puzzle.why}</span>}
      </p>
    </div>
  );
}

export default function Puzzles() {
  const [picks, setPicks] = useState({});
  const solvedCount = PUZZLES.filter((p, i) => picks[i] === p.answer).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="lx-serif text-sm italic text-[var(--color-marigold-dark)]">Free · নিবন্ধন ছাড়াই</p>
      <h1 className="lx-serif-bn mt-1 text-3xl font-extrabold text-[var(--color-ink)]">নমুনা ধাঁধা</h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--color-text)]/75">
        লিঙ্গুইসটিক অলিম্পিয়াডে কোনো ভাষা জানা লাগে না — কয়েকটা উদাহরণ থেকে নিয়ম ধরে নতুন শব্দের মানে বের করতে হয়।
        নিচের ৫টা বানানো ভাষার ধাঁধা চেষ্টা করে দেখো।
      </p>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-paper-line)]">
          <div className="h-full rounded-full bg-[var(--color-greenpen)] transition-all" style={{ width: `${(solvedCount / PUZZLES.length) * 100}%` }} />
        </div>
        <span className="text-sm font-bold text-[var(--color-ink)]">{solvedCount}/{PUZZLES.length}</span>
      </div>

      <div className="mt-6 space-y-6">
        {PUZZLES.map((p, i) => (
          <PuzzleCard key={p.lang} puzzle={p} index={i} picked={picks[i] ?? null} onPick={(opt) => setPicks((s) => ({ ...s, [i]: opt }))} />
        ))}
      </div>

      {solvedCount === PUZZLES.length && (
        <div className="mt-8 border-2 border-[var(--color-ink)] bg-[var(--color-marigold)] p-5 text-center">
          <p className="lx-serif-bn text-xl font-extrabold text-[var(--color-ink-dark)]">সবগুলো মিলিয়ে ফেলেছ! 🎉</p>
          <p className="mt-1 text-sm text-[var(--color-ink-dark)]/80">কোর্সে এর চেয়েও কঠিন ও বিস্তারিত Model Test আছে — মেন্টর তোমার খাতা দেখে নম্বর দেবেন।</p>
          <Link to="/register" className="mt-4 inline-block rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white">
            কোর্সে নিবন্ধন করুন
          </Link>
        </div>
      )}
    </div>
  );
}
