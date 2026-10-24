import { useState } from "react";
import { api } from "../lib/api";
import Loader from "../components/Loader";

export default function Contact() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!email || !message) {
      setError("ইমেইল ও মেসেজ দিন।");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await api.submitContact({ email, phone, message });
      if (res.ok) {
        setDone(true);
      } else {
        setError(res.message || "জমা দেওয়া যায়নি।");
      }
    } catch {
      setError("সার্ভারের সাথে সংযোগ করা যায়নি।");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-2xl font-bold text-[var(--color-greenpen)]">মেসেজ পাঠানো হয়েছে ✓</p>
        <p className="mt-2 text-sm text-[var(--color-text)]/70">
          আপনার মতামত আমাদের কাছে পৌঁছেছে। শীঘ্রই যোগাযোগ করা হবে।
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-[var(--color-ink)]">যোগাযোগ করুন</h1>
      <p className="mt-1 text-sm text-[var(--color-text)]/70">
        কোনো প্রশ্ন, সমস্যা বা মতামত থাকলে নিচের ফর্মে লিখে পাঠান।
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-[var(--color-redpen)]/10 px-4 py-2 text-sm font-medium text-[var(--color-redpen)]">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">ইমেইল</span>
          <input className="input" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">মোবাইল নম্বর</span>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
            placeholder="০১XXXXXXXXX"
            inputMode="numeric"
            maxLength={11}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">আপনার মেসেজ লিখুন</span>
          <textarea className="input" required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display text-base font-bold text-white disabled:opacity-60"
        >
          {submitting ? "পাঠানো হচ্ছে…" : "সাবমিট করুন"}
        </button>
        {submitting && <Loader />}
      </form>
    </div>
  );
}