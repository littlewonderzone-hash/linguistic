import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import WrittenExamRunner from "../components/WrittenExamRunner";
import Loader from "../components/Loader";

function useCountdown(endsAt) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    if (!endsAt) return;
    const target = new Date(endsAt).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setLeft("সময় শেষ");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return left;
}

const fmt = (iso) =>
  new Date(iso).toLocaleString("bn-BD", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

const STATUS = {
  open: { label: "চলছে", cls: "bg-[var(--color-greenpen)]/15 text-[var(--color-greenpen)]" },
  upcoming: { label: "শুরু হয়নি", cls: "bg-[var(--color-marigold)]/20 text-[var(--color-marigold-dark)]" },
  closed: { label: "শেষ", cls: "bg-[var(--color-text)]/10 text-[var(--color-text)]/60" },
  done: { label: "অংশ নিয়েছেন ✓", cls: "bg-[var(--color-bluepen)]/15 text-[var(--color-bluepen)]" },
};

export default function LiveExam() {
  const token = localStorage.getItem("linguistic_student_token");
  const [exams, setExams] = useState(null);
  const [selected, setSelected] = useState(null); // বেছে নেওয়া লাইভ পরীক্ষা
  const [step, setStep] = useState("list"); // list -> intro -> written -> finished
  const countdown = useCountdown(selected?.end);

  useEffect(() => {
    api.liveExamStatus(token).then((res) => setExams(res.ok ? res.data.exams || [] : []));
  }, [token, step]);

  if (exams === null) return <Loader full label="লাইভ পরীক্ষার তালিকা লোড হচ্ছে…" />;

  /* ===== পরীক্ষা চলছে ===== */
  if (step === "written" && selected) {
    return <WrittenExamRunner examType="live" kind="written" liveExamId={selected.id} onFinished={() => setStep("finished")} />;
  }

  /* ===== শেষ ===== */
  if (step === "finished") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-2xl font-bold text-[var(--color-greenpen)]">লাইভ পরীক্ষা সম্পন্ন হয়েছে ✓</p>
        <p className="mt-2 text-sm text-[var(--color-text)]/70">
          আপনার খাতা মূল্যায়নের অপেক্ষায় আছে। মূল্যায়নের পর ফলাফল পোর্টালে দেখা যাবে এবং লাইভ পরীক্ষার মেরিট তালিকাও
          পোর্টাল থেকে দেখতে পারবেন।
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => {
              setSelected(null);
              setStep("list");
            }}
            className="rounded-xl bg-[var(--color-redpen)] px-6 py-3 font-display font-bold text-white"
          >
            আরেকটা লাইভ পরীক্ষা দেখুন
          </button>
          <Link to="/student" className="rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white">
            পোর্টালে ফিরুন
          </Link>
        </div>
      </div>
    );
  }

  /* ===== নিয়মাবলি (একটা পরীক্ষা বাছার পর) ===== */
  if (step === "intro" && selected) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <button onClick={() => setStep("list")} className="mb-3 text-sm font-bold text-[var(--color-bluepen)] underline">
          ← তালিকায় ফিরুন
        </button>
        <h1 className="font-display text-2xl font-bold text-[var(--color-ink)]">{selected.title}</h1>

        <div className="mt-4 rounded-xl border border-[var(--color-redpen)]/30 bg-[var(--color-redpen)]/10 p-4 text-center">
          <p className="text-xs font-semibold text-[var(--color-redpen)]">এই লাইভ পরীক্ষায় ঢোকার সময় বাকি আছে</p>
          <p className="font-display text-3xl font-extrabold tabular-nums text-[var(--color-redpen)]">{countdown}</p>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-4">
          <p className="mb-2 font-display font-bold text-[var(--color-ink)]">নিয়মাবলি</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--color-text)]/80">
            <li>এটা লিখিত পরীক্ষা — সময় {selected.minutes} মিনিট, খাতায় লিখে উত্তরের ছবি তুলে জমা দিতে হবে</li>
            <li>প্রশ্ন লেখা, ছবি, অথবা দুটোই হতে পারে — ছবির প্রশ্ন ভালোভাবে দেখে নিন</li>
            <li>একটা লাইভ পরীক্ষায় একবারই অংশ নেওয়া যায়; একবার শুরু করলে মাঝপথে থামানো যাবে না</li>
            <li>ইন্টারনেট সংযোগ স্থিতিশীল আছে কিনা নিশ্চিত করে নিন</li>
          </ul>
        </div>

        <button
          onClick={() => setStep("written")}
          className="mt-6 w-full rounded-xl bg-[var(--color-redpen)] px-6 py-3 font-display text-base font-bold text-white"
        >
          পরীক্ষা শুরু করুন
        </button>
      </div>
    );
  }

  /* ===== লাইভ পরীক্ষার তালিকা ===== */
  // এখন চলছে → শুরু হবে → শেষ, আর যেগুলোতে অংশ নেওয়া হয়ে গেছে সেগুলো আলাদা চিহ্নে
  const order = { open: 0, upcoming: 1, closed: 2 };
  const sorted = [...exams].sort((a, b) => order[a.status] - order[b.status] || new Date(a.start) - new Date(b.start));

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-[var(--color-ink)]">লাইভ পরীক্ষা</h1>
      <p className="mt-1 text-sm text-[var(--color-text)]/70">
        প্রতিটা লাইভ পরীক্ষায় একবার অংশ নেওয়া যায়। একই দিনে একাধিক লাইভ পরীক্ষা থাকলে সবগুলোতেই অংশ নিতে পারবেন।
      </p>

      <div className="mt-5 space-y-3">
        {sorted.length === 0 && (
          <p className="rounded-lg bg-[var(--color-marigold)]/10 px-4 py-3 text-sm text-[var(--color-marigold-dark)]">
            এখনো কোনো লাইভ পরীক্ষার সময় নির্ধারণ করা হয়নি।
          </p>
        )}
        {sorted.map((e) => {
          const st = e.participated ? STATUS.done : STATUS[e.status];
          const canStart = e.status === "open" && !e.participated;
          return (
            <div key={e.id} className="rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg font-bold text-[var(--color-ink)]">{e.title}</p>
                <span className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text)]/65">
                {fmt(e.start)} থেকে {fmt(e.end)} পর্যন্ত · সময় {e.minutes} মিনিট
              </p>
              {canStart && (
                <button
                  onClick={() => {
                    setSelected(e);
                    setStep("intro");
                  }}
                  className="mt-3 w-full rounded-lg bg-[var(--color-redpen)] px-4 py-2 font-display text-sm font-bold text-white"
                >
                  এই পরীক্ষায় অংশ নিন
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Link to="/student" className="mt-8 inline-block rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white">
        পোর্টালে ফিরুন
      </Link>
    </div>
  );
}
