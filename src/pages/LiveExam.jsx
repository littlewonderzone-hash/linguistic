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

export default function LiveExam() {
  const token = localStorage.getItem("linguistic_student_token");
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState(null);
  const [step, setStep] = useState("intro"); // intro -> written -> finished
  const countdown = useCountdown(status?.endsAt);

  useEffect(() => {
    api.liveExamStatus(token).then((res) => {
      setStatus(res.ok ? res.data : { open: false, reason: "যাচাই করা যায়নি।" });
      setChecking(false);
    });
  }, [token]);

  if (checking) return <Loader full label="লাইভ পরীক্ষার সময় যাচাই হচ্ছে…" />;

  if (!status?.open) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-lg font-bold text-[var(--color-ink)]">লাইভ পরীক্ষা এখন চালু নেই</p>
        <p className="mt-2 rounded-lg bg-[var(--color-marigold)]/10 px-4 py-3 text-sm text-[var(--color-marigold-dark)]">
          {status?.reason}
        </p>
        <Link to="/student" className="mt-6 inline-block rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white">
          পোর্টালে ফিরুন
        </Link>
      </div>
    );
  }

  if (status.alreadyParticipated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-lg font-bold text-[var(--color-ink)]">আপনি ইতিমধ্যে অংশ নিয়েছেন</p>
        <p className="mt-2 rounded-lg bg-[var(--color-marigold)]/10 px-4 py-3 text-sm text-[var(--color-marigold-dark)]">
          আপনি ইতিমধ্যে এই লাইভ পরীক্ষায় অংশ নিয়েছেন — একটা লাইভ পরীক্ষায় শুধু একবারই অংশ নেওয়া যায়।
          পরবর্তী লাইভ পরীক্ষায় আবার অংশ নিতে পারবেন।
        </p>
        <Link to="/student" className="mt-6 inline-block rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white">
          পোর্টালে ফিরুন
        </Link>
      </div>
    );
  }

  if (step === "intro") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-[var(--color-ink)]">লাইভ পরীক্ষা</h1>

        <div className="mt-4 rounded-xl border border-[var(--color-redpen)]/30 bg-[var(--color-redpen)]/10 p-4 text-center">
          <p className="text-xs font-semibold text-[var(--color-redpen)]">লাইভ পরীক্ষার সময় বাকি আছে</p>
          <p className="font-display text-3xl font-extrabold tabular-nums text-[var(--color-redpen)]">{countdown}</p>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-4">
          <p className="mb-2 font-display font-bold text-[var(--color-ink)]">নিয়মাবলি</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--color-text)]/80">
            <li>পরীক্ষাটি অনুধাবনমূলক — ২৫ মিনিট, খাতায় লিখে উত্তরের ছবি তুলে জমা দিতে হবে</li>
            <li>প্রশ্ন লেখা, ছবি, অথবা দুটোই হতে পারে — ছবির প্রশ্ন ভালোভাবে দেখে নিন</li>
            <li>একবার শুরু করলে মাঝপথে থামানো যাবে না — নিশ্চিত হয়ে "পরীক্ষা শুরু করুন" চাপুন</li>
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

  if (step === "finished") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-2xl font-bold text-[var(--color-greenpen)]">লাইভ পরীক্ষা সম্পন্ন হয়েছে ✓</p>
        <p className="mt-2 text-sm text-[var(--color-text)]/70">
          আপনার খাতা মূল্যায়নের অপেক্ষায় আছে। মূল্যায়নের পর ফলাফল পোর্টালে দেখা যাবে এবং
          লাইভ পরীক্ষার মেরিট তালিকাও পোর্টাল থেকে দেখতে পারবেন।
        </p>
        <Link to="/student" className="mt-6 inline-block rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white">
          পোর্টালে ফিরুন
        </Link>
      </div>
    );
  }

  if (step === "written") {
    return <WrittenExamRunner examType="live" kind="written" onFinished={() => setStep("finished")} />;
  }

  return null;
}