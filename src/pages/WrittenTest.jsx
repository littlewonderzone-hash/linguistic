import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import WrittenExamRunner from "../components/WrittenExamRunner";
import Loader from "../components/Loader";
import FloatingContact from "../components/FloatingContact";

/** লিখিত পরীক্ষা: Model Test-01, 02, ... তালিকা থেকে স্টুডেন্ট যেটা খুশি বেছে নিতে পারে।
 *  প্রতিটা মডেল টেস্টের প্রশ্ন ও সময় অ্যাডমিনের ঠিক করা — সবার জন্য একই, র‍্যান্ডম নয়।
 *  একটা শেষ হলে পরেরটা দেওয়া যায়; আগেরটা আবার দিয়ে অনুশীলনও করা যায়। */
export default function WrittenTest() {
  return (
    <>
      <WrittenTestInner />
      <FloatingContactWhenIdle />
    </>
  );
}

function FloatingContactWhenIdle() {
  // পরীক্ষা চলার সময় (ফুলস্ক্রিন-মোডের মতো) বাটন লুকানো থাকে — সময়ে মনোযোগ না ভাঙতে
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const on = (e) => setHidden(!!e.detail);
    window.addEventListener("lx-exam-running", on);
    return () => window.removeEventListener("lx-exam-running", on);
  }, []);
  return hidden ? null : <FloatingContact />;
}

function WrittenTestInner() {
  const token = localStorage.getItem("linguistic_student_token");
  const [tests, setTests] = useState(null);
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState("list"); // list -> intro -> exam -> finished
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    if (step !== "list") return;
    api.modelTests(token).then((res) => setTests(res.ok ? res.data || [] : []));
  }, [token, step]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("lx-exam-running", { detail: step === "exam" }));
    return () => window.dispatchEvent(new CustomEvent("lx-exam-running", { detail: false }));
  }, [step]);

  /* ===== পরীক্ষা চলছে ===== */
  if (step === "exam" && selected) {
    return (
      <WrittenExamRunner
        key={runKey}
        examType="mock"
        kind="written"
        modelTestId={selected.id}
        onFinished={() => setStep("finished")}
      />
    );
  }

  /* ===== শেষ ===== */
  if (step === "finished" && selected) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-2xl font-bold text-[var(--color-greenpen)]">{selected.title} সম্পন্ন ✓</p>
        <p className="mt-2 text-sm text-[var(--color-text)]/70">
          আপনার খাতা মূল্যায়নের অপেক্ষায় আছে। মূল্যায়ন শেষ হলে নম্বর ও মেন্টরের দাগ পোর্টালে দেখতে পাবেন।
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => {
              setSelected(null);
              setStep("list");
            }}
            className="rounded-xl bg-[var(--color-redpen)] px-6 py-3 font-display font-bold text-white"
          >
            পরের মডেল টেস্ট বেছে নিন
          </button>
          <Link to="/student" className="rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white">
            পোর্টালে ফিরুন
          </Link>
        </div>
      </div>
    );
  }

  /* ===== নিয়মাবলি ===== */
  if (step === "intro" && selected) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <button onClick={() => setStep("list")} className="mb-3 text-sm font-bold text-[var(--color-bluepen)] underline">
          ← মডেল টেস্টের তালিকা
        </button>
        <h1 className="font-display text-3xl font-bold text-[var(--color-ink)]">{selected.title}</h1>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="সময়" value={`${selected.minutes} মিনিট`} />
          <Stat label="প্রশ্ন" value={`${selected.questionCount}টি`} />
          <Stat label="মোট নম্বর" value={selected.totalPoints} />
        </div>

        <div className="mt-4 rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-4">
          <p className="mb-2 font-display font-bold text-[var(--color-ink)]">নিয়মাবলি</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--color-text)]/80">
            <li>খাতায় লিখে উত্তরের ছবি তুলে জমা দিতে হবে ({selected.minutes} মিনিটের মধ্যে)</li>
            <li>প্রশ্ন লেখা, ছবি, অথবা দুটোই হতে পারে — ভালোভাবে দেখে নিন</li>
            <li>শুরু করলে সময় চলতে থাকবে; সময় শেষ হলে নিজে থেকে জমা হয়ে যাবে</li>
            <li>মডেল টেস্ট যতবার খুশি দেওয়া যায়, তবে প্রতিবার নতুন করে খাতা জমা দিতে হয়</li>
          </ul>
        </div>

        <button
          onClick={() => {
            setRunKey((k) => k + 1);
            setStep("exam");
          }}
          className="mt-6 w-full rounded-xl bg-[var(--color-redpen)] px-6 py-3 font-display text-base font-bold text-white"
        >
          পরীক্ষা শুরু করুন
        </button>
      </div>
    );
  }

  /* ===== মডেল টেস্টের তালিকা ===== */
  if (tests === null) return <Loader full label="মডেল টেস্টের তালিকা লোড হচ্ছে…" />;
  const doneCount = tests.filter((t) => t.attemptCount > 0).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-[var(--color-ink)]">লিখিত পরীক্ষা</h1>
      <p className="mt-1 text-sm text-[var(--color-text)]/70">
        যে মডেল টেস্ট ইচ্ছা বেছে নিয়ে পরীক্ষা দিন — একটা শেষ হলে পরেরটা।
      </p>

      {tests.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--color-ink)]">
            <span>আপনার অগ্রগতি</span>
            <span>{doneCount}/{tests.length} সম্পন্ন</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[var(--color-paper-line)]">
            <div
              className="h-full rounded-full bg-[var(--color-greenpen)] transition-all"
              style={{ width: `${(doneCount / tests.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {tests.length === 0 ? (
        <p className="mt-6 rounded-lg bg-[var(--color-marigold)]/10 px-4 py-3 text-sm text-[var(--color-marigold-dark)]">
          এখনো কোনো মডেল টেস্ট প্রকাশ করা হয়নি। একটু পরে আবার দেখুন।
        </p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {tests.map((t) => {
            const done = t.attemptCount > 0;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelected(t);
                  setStep("intro");
                }}
                className="group relative overflow-hidden border-2 border-[var(--color-ink)] bg-white p-5 text-left shadow-[5px_5px_0_var(--color-marigold)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_var(--color-marigold)]"
              >
                <span
                  className="pointer-events-none absolute -bottom-6 -right-1 font-serif text-[7rem] font-bold leading-none text-[var(--color-ink)]/[0.06]"
                  aria-hidden="true"
                >
                  {String(t.testNo).padStart(2, "0")}
                </span>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-xl font-extrabold text-[var(--color-ink)]">{t.title}</p>
                  {done ? (
                    <span className="shrink-0 rounded-full bg-[var(--color-greenpen)]/15 px-2.5 py-0.5 text-xs font-bold text-[var(--color-greenpen)]">
                      ✓ দেওয়া হয়েছে
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-[var(--color-redpen)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--color-redpen)]">
                      নতুন
                    </span>
                  )}
                </div>
                <p className="relative mt-2 text-xs text-[var(--color-text)]/70">
                  ⏱ {t.minutes} মিনিট · ❓ {t.questionCount}টি প্রশ্ন · 🎯 {t.totalPoints} নম্বর
                </p>
                {done && t.last && (
                  <p className="relative mt-2 text-xs font-semibold text-[var(--color-ink)]">
                    সর্বশেষ: {t.last.graded ? `${t.last.score}/${t.last.total}` : "মূল্যায়নের অপেক্ষায়"} · {t.attemptCount} বার
                  </p>
                )}
                <p className="relative mt-3 font-display text-sm font-bold text-[var(--color-redpen)]">
                  {done ? "আবার দিন →" : "শুরু করুন →"}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <Link to="/student" className="mt-8 inline-block rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white">
        পোর্টালে ফিরুন
      </Link>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-[var(--color-paper-line)] bg-white/70 p-3">
      <p className="font-display text-lg font-extrabold text-[var(--color-ink)]">{value}</p>
      <p className="text-xs text-[var(--color-text)]/60">{label}</p>
    </div>
  );
}
