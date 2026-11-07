import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import Loader from "../components/Loader";
import { fileToDataUrl, compressImage, stitchImages } from "../lib/image";
import ZoomImage from "./ZoomImage";

const MAX_PAGES = 4; // এক সেটের উত্তরে সর্বোচ্চ কয়টা পৃষ্ঠার ছবি

const TITLE = { written: "লিখিত পরীক্ষা" };

/** ছবি তোলা/আপলোডের জন্য দুইটা আলাদা বাটন — কিছু ফোনে "capture" দেওয়া থাকলে
 *  ক্যামেরা খোলে না (শুধু ফাইল/গ্যালারি কাজ করে), আবার কিছু ফোনে সম্মিলিত
 *  চুজার ব্যবহার করলে সমস্যা দেখা যায় — তাই দুইটা সম্পূর্ণ আলাদা <input>
 *  হিসেবে রাখা হয়েছে যাতে একটা কাজ না করলেও অন্যটা দিয়ে চালানো যায়। */
function PhotoPicker({ onFile, more = false }) {
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-marigold)] bg-[var(--color-marigold)]/10 px-4 py-4 font-display text-sm font-bold text-[var(--color-marigold-dark)] transition hover:bg-[var(--color-marigold)]/20">
        📷 {more ? "আরেক পৃষ্ঠার ছবি তুলুন" : "ক্যামেরা দিয়ে ছবি তুলুন"}
        <input type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} className="hidden" />
      </label>
      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-bluepen)] bg-[var(--color-bluepen)]/10 px-4 py-4 font-display text-sm font-bold text-[var(--color-bluepen)] transition hover:bg-[var(--color-bluepen)]/20">
        🖼️ {more ? "গ্যালারি থেকে আরেকটা" : "গ্যালারি থেকে বাছাই করুন"}
        <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} className="hidden" />
      </label>
    </div>
  );
}

export default function WrittenExamRunner({ examType = "mock", kind = "written", liveExamId = "", modelTestId = "", onFinished }) {
  const token = localStorage.getItem("linguistic_student_token");

  const [stage, setStage] = useState("loading");
  const [error, setError] = useState("");
  const [sets, setSets] = useState([]);
  const [images, setImages] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [submitProgress, setSubmitProgress] = useState({ done: 0, total: 0 });

  const [testTitle, setTestTitle] = useState("");
  const stageRef = useRef("loading");
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const setsRef = useRef(sets);
  setsRef.current = sets;
  const sessionIdRef = useRef("");

  useEffect(() => {
    if (!token) return;
    api
      .startWrittenExam(token, examType, kind, liveExamId, modelTestId)
      .then((res) => {
        if (res.ok) {
          sessionIdRef.current = res.data.sessionId;
          setTestTitle(res.data.title || "");
          setSets(res.data.sets);
          setSecondsLeft((Number(res.data.minutes) > 0 ? Number(res.data.minutes) : 25) * 60);
          setStage("exam");
        } else {
          setError(res.message || "পরীক্ষা শুরু করা যায়নি।");
          setStage("error");
        }
      })
      .catch(() => {
        setError("সার্ভারের সাথে সংযোগ করা যায়নি।");
        setStage("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // প্রশ্নের ছবিগুলো আগে থেকেই লোড করে রাখা — পরীক্ষার সময় ধীর নেটওয়ার্কে ছবি দেরিতে আসা আটকাতে
  useEffect(() => {
    sets.forEach((set) => {
      [set.passageImageUrl, ...(set.subQuestions || []).map((sq) => sq.imageUrl)].filter(Boolean).forEach((u) => {
        const img = new Image();
        img.src = u;
      });
    });
  }, [sets]);

  useEffect(() => {
    if (stage !== "exam") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          submitAll();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  async function handleFile(setId, file) {
    if (!file) return;
    const rawDataUrl = await fileToDataUrl(file);
    const dataUrl = await compressImage(rawDataUrl);
    setImages((prev) => {
      const pages = prev[setId] || [];
      if (pages.length >= MAX_PAGES) return prev;
      return { ...prev, [setId]: [...pages, dataUrl] };
    });
  }

  function removePage(setId, index) {
    setImages((prev) => {
      const pages = (prev[setId] || []).filter((_, i) => i !== index);
      const next = { ...prev };
      if (pages.length === 0) delete next[setId];
      else next[setId] = pages;
      return next;
    });
  }

  async function submitAll() {
    if (stageRef.current !== "exam") return;
    setStage("submitting");

    const entries = setsRef.current
      .map((set) => ({ set, pages: imagesRef.current[set.id] }))
      .filter((e) => e.pages && e.pages.length > 0 && (e.set.subQuestions || []).length > 0);

    setSubmitProgress({ done: 0, total: entries.length });
    try {
      for (const { set, pages } of entries) {
        // একাধিক পৃষ্ঠা থাকলে উপর-নিচে জুড়ে একটা ছবি — মূল্যায়ন আগের মতোই এক ছবিতে হয়
        const merged = await stitchImages(pages);
        const items = (set.subQuestions || []).map((sq) => ({
          writtenQuestionId: sq.writtenQuestionId,
          subQuestionId: sq.id,
          subQuestionText: sq.text,
          subQuestionImageUrl: sq.imageUrl || "",
          points: sq.points,
        }));
        await api.submitWrittenAnswersBatch({
          token,
          examType,
          kind,
          liveExamId,
          sessionId: sessionIdRef.current,
          items,
          imageBase64: merged,
          mimeType: "image/jpeg",
        });
        setSubmitProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      setStage("done");
    } catch {
      setError("কিছু উত্তর জমা দেওয়া যায়নি — ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।");
      setStage("exam");
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Link to="/student/login" className="rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white">
          স্টুডেন্ট লগইন করুন
        </Link>
      </div>
    );
  }

  if (stage === "loading") return <Loader full label="প্রশ্ন প্রস্তুত হচ্ছে…" />;

  if (stage === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="rounded-lg bg-[var(--color-redpen)]/10 px-4 py-3 text-sm font-medium text-[var(--color-redpen)]">{error}</p>
        <Link to="/student" className="mt-4 inline-block rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white">
          পোর্টালে ফিরুন
        </Link>
      </div>
    );
  }

  if (stage === "submitting") {
    return (
      <Loader full label={submitProgress.total ? `জমা হচ্ছে… (${submitProgress.done}/${submitProgress.total})` : "জমা হচ্ছে…"} />
    );
  }

  if (stage === "done") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-2xl font-bold text-[var(--color-greenpen)]">খাতা জমা হয়েছে ✓</p>
        <p className="mt-2 text-sm text-[var(--color-text)]/70">
          আপনার উত্তর মূল্যায়নের অপেক্ষায় আছে (পেন্ডিং)। মূল্যায়ন শেষ হলে পোর্টালে ফলাফল দেখতে পারবেন।
        </p>
        {onFinished ? (
          <button onClick={onFinished} className="mt-6 rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white">
            পরীক্ষা সম্পন্ন করুন →
          </button>
        ) : (
          <Link to="/student" className="mt-6 inline-block rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white">
            পোর্টালে ফিরুন
          </Link>
        )}
      </div>
    );
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const answeredSets = sets.filter((s) => (images[s.id] || []).length > 0).length;

  return (
    <div className="min-h-screen bg-[var(--color-paper)] pb-24">
      <div className="sticky top-0 z-30 flex items-center justify-between bg-[var(--color-ink)] px-4 py-2 font-display font-bold text-white">
        <span>{testTitle || TITLE[kind]}</span>
        <span className="tabular-nums">
          {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </span>
      </div>

      <p className="mx-auto mt-3 max-w-2xl px-4 text-xs text-[var(--color-text)]/60">
        {"একটা উদ্দীপকের সবগুলো প্রশ্নের উত্তর খাতায় লিখে ছবি তুলুন/আপলোড করুন। উত্তর একাধিক পৃষ্ঠায় হলে সর্বোচ্চ ৪টা পৃষ্ঠার ছবি দিন — সবগুলো একসাথে জমা হবে। ছবিতে চাপ দিলে বড় করে দেখা যায়।"}{" "}
        উত্তরপত্র জমা: {answeredSets}/{sets.length}
      </p>

      <div className="mx-auto max-w-2xl space-y-5 px-4 py-4">
        {sets.map((set) => (
          <div key={set.id} className="rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-4">
            {set.passageHtml && (
              <div className="lx-q mb-3 rounded-lg bg-[var(--color-paper)] p-3 text-sm" dangerouslySetInnerHTML={{ __html: set.passageHtml }} />
            )}
            {set.passageImageUrl && (
              <ZoomImage
                eager
                src={set.passageImageUrl}
                alt="প্রশ্নের ছবি"
                className="mb-3 w-full rounded-lg border border-[var(--color-paper-line)] bg-white object-contain"
              />
            )}

            <ol className="list-decimal space-y-2 pl-5">
              {(set.subQuestions || []).map((sq, qi) => {
                const hasText = String(sq.text || "").replace(/<[^>]*>/g, "").trim() !== "";
                return (
                  <li key={sq.id} className="font-semibold text-[var(--color-ink)]">
                    {hasText ? (
                      <span className="lx-q" dangerouslySetInnerHTML={{ __html: sq.text }} />
                    ) : (
                      !sq.imageUrl && <span>প্রশ্ন নং {qi + 1}</span>
                    )}{" "}
                    <span className="text-xs font-normal text-[var(--color-text)]/50">({sq.points} নম্বর)</span>
                    {sq.imageUrl && (
                      <ZoomImage
                        eager
                        src={sq.imageUrl}
                        alt={`প্রশ্ন ${qi + 1}-এর ছবি`}
                        className="mt-2 w-full rounded-lg border border-[var(--color-paper-line)] bg-white object-contain"
                      />
                    )}
                  </li>
                );
              })}
            </ol>

            {(images[set.id] || []).length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold text-[var(--color-ink)]">
                  উত্তরপত্র: {images[set.id].length}টি পৃষ্ঠা (সর্বোচ্চ {MAX_PAGES}টি)
                </p>
                <div className="flex flex-wrap gap-2">
                  {images[set.id].map((page, pi) => (
                    <div key={pi} className="relative">
                      <ZoomImage src={page} alt={`পৃষ্ঠা ${pi + 1}`} className="h-28 rounded-lg border border-[var(--color-paper-line)] object-cover" eager />
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] font-bold text-white">{pi + 1}</span>
                      <button
                        type="button"
                        onClick={() => removePage(set.id, pi)}
                        title="এই পৃষ্ঠা বাদ দিন"
                        className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--color-redpen)] text-xs font-bold text-white shadow-md"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(images[set.id] || []).length < MAX_PAGES && (
              <PhotoPicker more={(images[set.id] || []).length > 0} onFile={(file) => handleFile(set.id, file)} />
            )}
          </div>
        ))}

        {error && <p className="rounded-lg bg-[var(--color-redpen)]/10 px-4 py-2 text-sm font-medium text-[var(--color-redpen)]">{error}</p>}

        <button onClick={submitAll} className="w-full rounded-xl bg-[var(--color-redpen)] px-6 py-3 font-display text-base font-bold text-white">
          সবগুলো জমা দিন
        </button>
      </div>
    </div>
  );
}