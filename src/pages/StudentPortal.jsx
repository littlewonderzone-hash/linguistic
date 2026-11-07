import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import Loader from "../components/Loader";
import ZoomImage from "../components/ZoomImage";
import FloatingContact from "../components/FloatingContact";
import { canInstall, onInstallChange, promptInstall } from "../lib/pwa";

const EXAM_TYPE_LABEL = { mock: "মডেল টেস্ট", live: "লাইভ টেস্ট" };
const SEEN_KEY = "linguistic_seen_graded";

const readSeen = () => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
};

/** একটা সেশনের সারাংশ: নম্বর, মোট, শতকরা, মূল্যায়ন শেষ কিনা */
function sessionStats(session) {
  const total = session.items.reduce((n, i) => n + (Number(i.points) || 0), 0);
  const score = session.items.reduce((n, i) => n + (Number(i.score) || 0), 0);
  const graded = session.items.every((i) => i.status === "graded");
  return { total, score, graded, percent: total ? Math.round((score / total) * 100) : 0 };
}

function sessionLabel(session) {
  if (session.examType === "live" && session.liveExamTitle) return session.liveExamTitle;
  return session.testTitle || "লিখিত পরীক্ষা";
}

/** টপিক ধরে শতকরা নম্বর (শুধু মূল্যায়ন শেষ হওয়া উত্তর) — দুর্বল টপিক আগে */
function topicStats(sessions) {
  const map = {};
  sessions.forEach((s) =>
    s.items
      .filter((i) => i.status === "graded" && Number(i.points) > 0)
      .forEach((i) => {
        String(i.topics || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .forEach((t) => {
            map[t] = map[t] || { score: 0, points: 0 };
            map[t].score += Number(i.score) || 0;
            map[t].points += Number(i.points) || 0;
          });
      })
  );
  return Object.entries(map)
    .map(([topic, v]) => ({ topic, percent: Math.round((v.score / v.points) * 100) }))
    .sort((a, b) => a.percent - b.percent);
}

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** প্রিন্ট/PDF-যোগ্য রিপোর্ট কার্ড — নতুন ট্যাবে খুলে প্রিন্ট ডায়ালগ দেয় ("PDF হিসেবে সেভ" বেছে নেওয়া যায়) */
function printReportCard(profile, sessions) {
  const done = sessions.filter((s) => sessionStats(s).graded).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const topics = topicStats(sessions);
  const rows = done
    .map((s) => {
      const st = sessionStats(s);
      return `<tr><td>${esc(sessionLabel(s))}</td><td>${esc(EXAM_TYPE_LABEL[s.examType] || s.examType)}</td><td>${esc(
        new Date(s.createdAt).toLocaleDateString("bn-BD")
      )}</td><td style="text-align:right">${st.score}/${st.total}</td><td style="text-align:right">${st.percent}%</td></tr>`;
    })
    .join("");
  const avg = done.length ? Math.round(done.reduce((n, s) => n + sessionStats(s).percent, 0) / done.length) : 0;
  const topicRows = topics
    .map((t) => `<tr><td>${esc(t.topic)}</td><td style="text-align:right">${t.percent}%</td></tr>`)
    .join("");
  const html = `<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>রিপোর্ট কার্ড — ${esc(profile.name)}</title>
<style>body{font-family:"Hind Siliguri","Noto Sans Bengali",Arial,sans-serif;margin:28px;color:#16211f}
h1{margin:0;color:#0f3d3e}h2{margin:22px 0 6px;font-size:16px;color:#0f3d3e}.muted{color:#667}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{border-bottom:1px solid #ddd;padding:6px 4px;text-align:left}th{background:#f1f3ee}
.box{display:inline-block;border:2px solid #0f3d3e;padding:8px 16px;margin-top:10px;font-weight:bold}</style></head><body>
<h1>অগ্রদূত Linguistic — রিপোর্ট কার্ড</h1>
<p class="muted">লিঙ্গুইসটিক অলিম্পিয়াড প্রস্তুতি কোর্স</p>
<p><b>${esc(profile.name)}</b> · ${esc(profile.className)} শ্রেণি · ${esc(profile.school)}</p>
<div class="box">${done.length}টি পরীক্ষা · গড় ${avg}%</div>
<h2>পরীক্ষার ফলাফল</h2>
<table><tr><th>পরীক্ষা</th><th>ধরন</th><th>তারিখ</th><th style="text-align:right">নম্বর</th><th style="text-align:right">শতকরা</th></tr>${rows || '<tr><td colspan="5">এখনো কোনো মূল্যায়িত ফলাফল নেই</td></tr>'}</table>
${topicRows ? `<h2>টপিক অনুযায়ী অবস্থা</h2><table><tr><th>টপিক</th><th style="text-align:right">শতকরা</th></tr>${topicRows}</table>` : ""}
<p class="muted" style="margin-top:24px;font-size:12px">তৈরি: ${esc(new Date().toLocaleString("bn-BD"))}</p>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) {
    alert("পপ-আপ ব্লক করা আছে — অনুমতি দিয়ে আবার চেষ্টা করুন।");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export default function StudentPortal() {
  const [profile, setProfile] = useState(null);
  const [notices, setNotices] = useState(null);
  const [writtenAttempts, setWrittenAttempts] = useState(null);
  const [seen, setSeen] = useState(readSeen);
  const [installable, setInstallable] = useState(canInstall());
  const navigate = useNavigate();
  const token = localStorage.getItem("linguistic_student_token");

  useEffect(() => onInstallChange(setInstallable), []);

  useEffect(() => {
    if (!token) {
      navigate("/student/login");
      return;
    }
    api.studentMe(token).then((res) => {
      if (!res.ok) {
        localStorage.removeItem("linguistic_student_token");
        navigate("/student/login");
        return;
      }
      setProfile(res.data);
    });
    api.studentNotices(token).then((res) => setNotices(res.ok ? res.data : []));
    api.studentWrittenAttempts(token).then((res) => setWrittenAttempts(res.ok ? res.data : []));
  }, [token, navigate]);

  const gradedSessions = useMemo(
    () => (writtenAttempts || []).filter((s) => sessionStats(s).graded),
    [writtenAttempts]
  );
  const unseen = gradedSessions.filter((s) => !seen.includes(s.sessionId));

  function markSeen() {
    const all = gradedSessions.map((s) => s.sessionId);
    localStorage.setItem(SEEN_KEY, JSON.stringify(all));
    setSeen(all);
  }

  function logout() {
    localStorage.removeItem("linguistic_student_token");
    navigate("/");
  }

  if (!profile) return <Loader full label="প্রোফাইল লোড হচ্ছে…" />;

  const confirmed = profile.status === "confirmed";

  return (
    <div className="min-h-screen bg-[var(--color-paper)] pb-24">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-paper-line)] bg-white/70 px-4 py-3">
        <div>
          <p className="font-display text-lg font-bold text-[var(--color-ink)]">{profile.name}</p>
          <p className="text-xs text-[var(--color-text)]/60">
            {profile.className} শ্রেণি · {profile.school}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/leaderboard" className="rounded-lg border-2 border-[var(--color-ink)] px-3 py-1.5 text-sm font-bold text-[var(--color-ink)]">
            মেরিট তালিকা
          </Link>
          <button onClick={logout} className="rounded-lg border-2 border-[var(--color-redpen)] px-3 py-1.5 text-sm font-bold text-[var(--color-redpen)]">
            লগআউট
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {!confirmed && (
          <div className="mb-6 rounded-xl border border-[var(--color-marigold)]/40 bg-[var(--color-marigold)]/10 p-4 text-sm text-[var(--color-marigold-dark)]">
            আপনার রেজিস্ট্রেশন এখনও কনফার্ম হয়নি ({profile.status === "rejected" ? "রিজেক্টেড" : "পেন্ডিং"})।
            কনফার্ম হওয়ার পর পরীক্ষা দিতে পারবেন।
          </div>
        )}

        {unseen.length > 0 && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border-2 border-[var(--color-greenpen)] bg-[var(--color-greenpen)]/10 p-4">
            <p className="text-sm font-semibold text-[var(--color-greenpen)]">
              🎉 {unseen.length}টি নতুন ফলাফল এসেছে — নিচে "পরীক্ষার ফলাফল" থেকে মেন্টরের দাগ ও সমাধান দেখুন।
            </p>
            <button onClick={markSeen} className="shrink-0 rounded-lg bg-[var(--color-greenpen)] px-3 py-1.5 text-xs font-bold text-white">
              দেখেছি
            </button>
          </div>
        )}

        {installable && (
          <button
            onClick={() => promptInstall()}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-bluepen)] bg-[var(--color-bluepen)]/10 px-4 py-3 font-display text-sm font-bold text-[var(--color-bluepen)]"
          >
            📲 অ্যাপের মতো ব্যবহার করতে হোম স্ক্রিনে যোগ করুন
          </button>
        )}

        {notices && notices.length > 0 && (
          <div className="mb-6 space-y-2">
            <h2 className="font-display font-bold text-[var(--color-ink)]">নোটিশ</h2>
            {notices.map((n) => (
              <div key={n.id} className="rounded-lg border border-[var(--color-bluepen)]/30 bg-[var(--color-bluepen)]/10 p-3 text-sm text-[var(--color-ink)]">
                {n.message}
              </div>
            ))}
          </div>
        )}

        <h2 className="font-display font-bold text-[var(--color-ink)]">পরীক্ষা কেন্দ্র</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ExamCard icon="✍️" title="লিখিত পরীক্ষা" desc="Model Test-01, 02, 03… বেছে নিয়ে দিন" enabled={confirmed} to="/exam/written" />
          <ExamCard icon="🔴" title="লাইভ পরীক্ষা" desc="সময়সূচি অনুযায়ী, প্রতিটায় একবার" enabled={confirmed} to="/exam/live" />
        </div>
        <Link to="/puzzles" className="mt-3 inline-block text-sm font-bold text-[var(--color-bluepen)] underline">
          🧩 অনুশীলনের জন্য নমুনা ধাঁধা
        </Link>

        {gradedSessions.length > 0 && (
          <>
            <h2 className="mt-8 font-display font-bold text-[var(--color-ink)]">আপনার অগ্রগতি</h2>
            <ProgressChart sessions={gradedSessions} />
            <TopicBars sessions={gradedSessions} />
          </>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-bold text-[var(--color-ink)]">পরীক্ষার ফলাফল</h2>
          {gradedSessions.length > 0 && (
            <button
              onClick={() => printReportCard(profile, writtenAttempts)}
              className="rounded-lg border-2 border-[var(--color-ink)] px-3 py-1 text-xs font-bold text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white"
            >
              🖨️ রিপোর্ট কার্ড (PDF/প্রিন্ট)
            </button>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {writtenAttempts === null && <Loader label="ফলাফল লোড হচ্ছে…" />}
          {writtenAttempts && writtenAttempts.length === 0 && (
            <p className="text-sm text-[var(--color-text)]/60">এখনো কোনো খাতা জমা দেননি।</p>
          )}
          {writtenAttempts && writtenAttempts.length > 0 && <WrittenResultsList sessions={writtenAttempts} unseen={unseen.map((s) => s.sessionId)} />}
        </div>
      </div>

      <FloatingContact studentName={profile.name} />
    </div>
  );
}

/** সময়ক্রমে প্রতিটা মূল্যায়িত পরীক্ষার শতকরা নম্বর — স্তম্ভ চার্ট (শেষ ১২টা) */
function ProgressChart({ sessions }) {
  const data = [...sessions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(-12);
  const avg = Math.round(data.reduce((n, s) => n + sessionStats(s).percent, 0) / data.length);
  return (
    <div className="mt-3 rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold text-[var(--color-text)]/70">প্রাপ্ত নম্বর (%) — সময়ক্রমে</p>
        <p className="text-xs font-bold text-[var(--color-ink)]">গড়: {avg}%</p>
      </div>
      <div className="mt-3 flex items-end gap-2 overflow-x-auto pb-1" style={{ minHeight: "9.5rem" }}>
        {data.map((s) => {
          const { percent, score, total } = sessionStats(s);
          const color = percent >= 75 ? "var(--color-greenpen)" : percent >= 50 ? "var(--color-marigold)" : "var(--color-redpen)";
          return (
            <div key={s.sessionId} className="flex w-12 shrink-0 flex-col items-center" title={`${sessionLabel(s)}: ${score}/${total}`}>
              <span className="text-[10px] font-bold text-[var(--color-ink)]">{percent}%</span>
              <div className="flex h-24 w-7 items-end rounded-sm bg-[var(--color-paper-line)]/60">
                <div className="w-full rounded-sm transition-all" style={{ height: `${Math.max(4, percent)}%`, background: color }} />
              </div>
              <span className="mt-1 w-full truncate text-center text-[9px] leading-tight text-[var(--color-text)]/65">
                {sessionLabel(s).replace("Model Test-", "MT ")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopicBars({ sessions }) {
  const topics = topicStats(sessions);
  if (topics.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-4">
      <p className="text-xs font-semibold text-[var(--color-text)]/70">টপিক অনুযায়ী আপনার অবস্থা (দুর্বল টপিক আগে)</p>
      <div className="mt-3 space-y-2.5">
        {topics.map((t) => {
          const color = t.percent >= 75 ? "var(--color-greenpen)" : t.percent >= 50 ? "var(--color-marigold)" : "var(--color-redpen)";
          const note = t.percent >= 75 ? "ভালো" : t.percent >= 50 ? "মোটামুটি" : "আরও অনুশীলন দরকার";
          return (
            <div key={t.topic}>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--color-ink)]">{t.topic}</span>
                <span className="text-[var(--color-text)]/65">{t.percent}% · {note}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--color-paper-line)]">
                <div className="h-full rounded-full" style={{ width: `${Math.max(3, t.percent)}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WrittenResultsList({ sessions, unseen }) {
  const [openId, setOpenId] = useState(null);

  return (
    <>
      {sessions.map((session) => {
        const { graded, score, total } = sessionStats(session);
        const isOpen = openId === session.sessionId;
        const label = sessionLabel(session);
        const solutions = session.solutions ? Object.values(session.solutions) : [];

        return (
          <div key={session.sessionId} className="rounded-lg border border-[var(--color-paper-line)] bg-white/70 text-sm">
            <button
              onClick={() => setOpenId(isOpen ? null : session.sessionId)}
              className="flex w-full items-center justify-between px-3 py-3 text-left"
            >
              <span className="font-semibold text-[var(--color-ink)]">
                {label} <span className="text-xs font-normal text-[var(--color-text)]/50">({EXAM_TYPE_LABEL[session.examType] || session.examType})</span>
                {unseen.includes(session.sessionId) && (
                  <span className="ml-2 rounded-full bg-[var(--color-redpen)] px-2 py-0.5 text-[10px] font-bold text-white">নতুন</span>
                )}
              </span>
              <span className="flex items-center gap-2">
                {graded ? (
                  <span className="font-display font-bold text-[var(--color-greenpen)]">{score}/{total}</span>
                ) : (
                  <span className="rounded-full bg-[var(--color-marigold)]/20 px-3 py-0.5 text-xs font-bold text-[var(--color-marigold-dark)]">পেন্ডিং</span>
                )}
                <span className="text-[var(--color-text)]/40">{isOpen ? "▲" : "▼"}</span>
              </span>
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-[var(--color-paper-line)] p-3">
                {groupByImage_(session.items).map((group) => (
                  <div key={group.imageUrl} className="rounded-md bg-[var(--color-paper)] p-2">
                    <ZoomImage
                      src={group.items[0].annotatedImageUrl || group.imageUrl}
                      alt="উত্তরপত্র"
                      className="mb-2 max-h-56 rounded-md border border-[var(--color-paper-line)]"
                    />
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div key={item.id} className="border-t border-dashed border-[var(--color-paper-line)] pt-2 first:border-t-0 first:pt-0">
                          {item.subQuestionText && (
                            <div className="lx-q text-xs text-[var(--color-text)]/70" dangerouslySetInnerHTML={{ __html: item.subQuestionText }} />
                          )}
                          {item.subQuestionImageUrl && (
                            <ZoomImage src={item.subQuestionImageUrl} alt="প্রশ্নের ছবি" className="mt-1 max-h-40 rounded-md border border-[var(--color-paper-line)] bg-white" />
                          )}
                          {item.status === "graded" ? (
                            <>
                              <p className="mt-1 text-xs font-bold text-[var(--color-ink)]">নম্বর: {item.score}/{item.points}</p>
                              {item.adminComment && <p className="mt-1 text-xs text-[var(--color-bluepen)]">মন্তব্য: {item.adminComment}</p>}
                            </>
                          ) : (
                            <p className="mt-1 text-xs font-semibold text-[var(--color-marigold-dark)]">মূল্যায়নের অপেক্ষায়</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {solutions.length > 0 && (
                  <div className="rounded-md border-2 border-[var(--color-greenpen)]/50 bg-[var(--color-greenpen)]/5 p-3">
                    <p className="mb-1 font-display text-sm font-bold text-[var(--color-greenpen)]">✓ আদর্শ উত্তর / সমাধান</p>
                    {solutions.map((sol, i) => (
                      <div key={i} className="space-y-2">
                        {sol.html && <div className="lx-q text-sm" dangerouslySetInnerHTML={{ __html: sol.html }} />}
                        {sol.imageUrl && <ZoomImage src={sol.imageUrl} alt="সমাধানের ছবি" className="w-full rounded-md border border-[var(--color-paper-line)] bg-white object-contain" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function groupByImage_(items) {
  const groups = {};
  items.forEach((item) => {
    if (!groups[item.imageUrl]) groups[item.imageUrl] = { imageUrl: item.imageUrl, items: [] };
    groups[item.imageUrl].items.push(item);
  });
  return Object.values(groups);
}

function ExamCard({ icon, title, desc, enabled, to, lockedNote }) {
  const body = (
    <div
      className={`flex h-full items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
        enabled
          ? "border-[var(--color-ink)] bg-white shadow-[4px_4px_0_var(--color-marigold)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--color-marigold)]"
          : "border-[var(--color-paper-line)] bg-white/50 text-[var(--color-text)]/40"
      }`}
    >
      <span className="text-2xl" aria-hidden="true">{icon}</span>
      <div>
        <p className="font-display text-base font-bold text-[var(--color-ink)]">{title}</p>
        <p className="text-xs font-normal text-[var(--color-text)]/65">
          {enabled ? desc : lockedNote || "কনফার্ম হওয়ার পর চালু হবে"}
        </p>
      </div>
    </div>
  );
  return enabled ? <Link to={to}>{body}</Link> : <div>{body}</div>;
}
