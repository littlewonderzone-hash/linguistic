import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import Loader from "../../components/Loader";
import RichTextEditor from "../../components/RichTextEditor";
import GradingCanvas from "../../components/GradingCanvas";
import { fileToDataUrl, compressImage } from "../../lib/image";
import ZoomImage from "../../components/ZoomImage";

function useAdminToken() {
  const navigate = useNavigate();
  const token = localStorage.getItem("linguistic_admin_token");
  useEffect(() => {
    if (!token) navigate("/system-3212/admin-panel/login");
  }, [token, navigate]);
  return token;
}

export default function AdminDashboard() {
  const token = useAdminToken();
  const [tab, setTab] = useState("stats");
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("linguistic_admin_token");
    navigate("/system-3212/admin-panel/login");
  }

  if (!token) return null;

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      <header className="flex items-center justify-between border-b border-[var(--color-paper-line)] bg-white/70 px-4 py-3">
        <h1 className="font-display text-xl font-bold text-[var(--color-ink)]">অ্যাডমিন প্যানেল — Linguistic</h1>
        <button onClick={logout} className="rounded-lg border-2 border-[var(--color-redpen)] px-3 py-1.5 text-sm font-bold text-[var(--color-redpen)]">
          লগআউট
        </button>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex flex-wrap gap-2">
          {[
            ["stats", "ড্যাশবোর্ড"],
            ["registrations", "রেজিস্ট্রেশন"],
            ["writtenQuestions", "প্রশ্ন (লেখা/ছবি)"],
            ["grading", "খাতা মূল্যায়ন"],
            ["notices", "নোটিশ"],
            ["liveExams", "লাইভ পরীক্ষা"],
            ["liveResults", "লাইভ ফলাফল"],
            ["contacts", "মতামত"],
            ["offline", "অফলাইন প্রশ্নপত্র"],
            ["settings", "সেটিংস"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 font-display text-sm font-bold ${
                tab === key ? "bg-[var(--color-ink)] text-white" : "bg-white text-[var(--color-ink)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "stats" && <AdminStats token={token} />}
          {tab === "registrations" && <Registrations token={token} />}
          {tab === "writtenQuestions" && <WrittenQuestions token={token} />}
          {tab === "grading" && <Grading token={token} />}
          {tab === "notices" && <Notices token={token} />}
          {tab === "liveExams" && <LiveExamsAdmin token={token} />}
          {tab === "liveResults" && <LiveResults token={token} />}
          {tab === "contacts" && <Contacts token={token} />}
          {tab === "offline" && <OfflineExams token={token} />}
          {tab === "settings" && <Settings token={token} />}
        </div>
      </div>
    </div>
  );
}

/** ব্রাউজারে CSV বানিয়ে ডাউনলোড (UTF-8 BOM সহ — Excel-এ বাংলা ঠিকঠাক খোলে) */
function downloadCsv(filename, headers, rows) {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function StatCard({ label, value, tone = "ink", hint }) {
  const cls = {
    ink: "border-[var(--color-ink)] text-[var(--color-ink)]",
    warn: "border-[var(--color-marigold)] text-[var(--color-marigold-dark)]",
    good: "border-[var(--color-greenpen)] text-[var(--color-greenpen)]",
  }[tone];
  return (
    <div className={`rounded-xl border-2 bg-white p-4 ${cls}`}>
      <p className="font-display text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs font-semibold text-[var(--color-text)]/70">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-[var(--color-text)]/50">{hint}</p>}
    </div>
  );
}

function AdminStats({ token }) {
  const [stats, setStats] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.adminStats(token).then((res) => setStats(res.ok ? res.data : {}));
  }, [token]);

  async function exportResults() {
    setExporting(true);
    const res = await api.adminResultsExport(token);
    setExporting(false);
    if (!res.ok) return;
    downloadCsv(
      `linguistic-results-${new Date().toISOString().slice(0, 10)}.csv`,
      ["নাম", "শ্রেণি", "স্কুল", "বিভাগ", "ফোন", "ইমেইল", "পরীক্ষা", "ধরন", "তারিখ", "নম্বর", "মোট", "অবস্থা"],
      res.data.map((r) => [r.name, r.className, r.school, r.division, r.phone, r.email, r.exam, r.type, new Date(r.date).toLocaleString("bn-BD"), r.score, r.total, r.status])
    );
  }

  if (stats === null) return <Loader label="পরিসংখ্যান লোড হচ্ছে…" />;
  if (!stats.registrations) return <p className="text-sm text-[var(--color-redpen)]">পরিসংখ্যান আনা যায়নি — Apps Script-এ নতুন Code.gs ডিপ্লয় করা আছে তো?</p>;
  const r = stats.registrations;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="মোট নিবন্ধন" value={r.total} />
        <StatCard label="কনফার্মড" value={r.confirmed} tone="good" />
        <StatCard label="পেমেন্ট যাচাইয়ের অপেক্ষায়" value={r.pending} tone={r.pending ? "warn" : "ink"} />
        <StatCard label="মূল্যায়নের অপেক্ষায় খাতা" value={stats.pendingGrading} tone={stats.pendingGrading ? "warn" : "ink"} hint="একটা ছবি = একটা খাতা" />
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">Model Test অনুযায়ী</h3>
        <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--color-paper-line)] bg-white/70">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-paper)] text-left text-xs text-[var(--color-text)]/70">
              <tr><th className="px-3 py-2">টেস্ট</th><th className="px-3 py-2">স্টুডেন্ট</th><th className="px-3 py-2">জমা</th><th className="px-3 py-2">পেন্ডিং</th><th className="px-3 py-2">গড় নম্বর</th></tr>
            </thead>
            <tbody>
              {stats.tests.length === 0 && <tr><td colSpan={5} className="px-3 py-3 text-[var(--color-text)]/60">এখনো কেউ কোনো Model Test দেয়নি।</td></tr>}
              {stats.tests.map((t) => (
                <tr key={t.title} className="border-t border-[var(--color-paper-line)]">
                  <td className="px-3 py-2 font-semibold text-[var(--color-ink)]">{t.title}</td>
                  <td className="px-3 py-2">{t.students}</td>
                  <td className="px-3 py-2">{t.sessions}</td>
                  <td className="px-3 py-2">{t.pending || "—"}</td>
                  <td className="px-3 py-2">{t.avgPercent === null ? "—" : `${t.avgPercent}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">সবচেয়ে কঠিন প্রশ্ন (গড় নম্বর কম)</h3>
          <div className="mt-2 space-y-2">
            {stats.hardQuestions.length === 0 && <p className="text-sm text-[var(--color-text)]/60">মূল্যায়ন হওয়া উত্তর এখনো নেই।</p>}
            {stats.hardQuestions.map((q, i) => (
              <div key={i} className="rounded-lg border border-[var(--color-paper-line)] bg-white/70 p-3">
                <div className="flex justify-between gap-2 text-xs">
                  <span className="font-semibold text-[var(--color-ink)]">{q.test || "—"}</span>
                  <span className="font-bold text-[var(--color-redpen)]">{q.avgPercent}% ({q.answers}টি উত্তর)</span>
                </div>
                <p className="lx-q mt-1 text-xs text-[var(--color-text)]/75">{q.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">লাইভ পরীক্ষায় অংশগ্রহণ</h3>
          <div className="mt-2 space-y-2">
            {stats.live.length === 0 && <p className="text-sm text-[var(--color-text)]/60">কোনো লাইভ পরীক্ষা নেই।</p>}
            {stats.live.map((l) => (
              <div key={l.title} className="flex justify-between rounded-lg border border-[var(--color-paper-line)] bg-white/70 p-3 text-sm">
                <span className="font-semibold text-[var(--color-ink)]">{l.title}</span>
                <span>{l.participants} জন</span>
              </div>
            ))}
          </div>

          <button
            onClick={exportResults}
            disabled={exporting}
            className="mt-5 w-full rounded-xl bg-[var(--color-ink)] px-4 py-3 font-display font-bold text-white disabled:opacity-60"
          >
            {exporting ? "তৈরি হচ্ছে…" : "⬇️ সব ফলাফল Excel/CSV এ ডাউনলোড"}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL = { pending: "পেন্ডিং", confirmed: "কনফার্মড", rejected: "রিজেক্টেড" };
const STATUS_CLS = {
  pending: "bg-[var(--color-marigold)]/20 text-[var(--color-marigold-dark)]",
  confirmed: "bg-[var(--color-greenpen)]/15 text-[var(--color-greenpen)]",
  rejected: "bg-[var(--color-redpen)]/15 text-[var(--color-redpen)]",
};

function Registrations({ token }) {
  const [rows, setRows] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all");

  function load() {
    setRows(null);
    api.adminListRegistrations(token).then((res) => setRows(res.ok ? res.data : []));
  }

  useEffect(load, [token]);

  async function updateStatus(id, status) {
    setBusyId(id);
    await api.adminUpdateRegistrationStatus(token, id, status);
    setBusyId(null);
    load();
  }

  if (rows === null) return <Loader label="রেজিস্ট্রেশন লোড হচ্ছে…" />;

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  function exportRegistrations() {
    downloadCsv(
      `linguistic-registrations-${new Date().toISOString().slice(0, 10)}.csv`,
      ["নাম", "শ্রেণি", "স্কুল", "বিভাগ", "ফোন", "ইমেইল", "বিকাশ নম্বর", "TrxID", "অবস্থা", "নিবন্ধনের সময়"],
      rows.map((r) => [r.name, r.className, r.school, r.division, r.phone, r.email, r.bkashSender, r.transactionId, STATUS_LABEL[r.status] || r.status, r.createdAt ? new Date(r.createdAt).toLocaleString("bn-BD") : ""])
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {["all", "pending", "confirmed", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 font-semibold ${
              filter === f ? "bg-[var(--color-ink)] text-white" : "bg-white text-[var(--color-ink)]"
            }`}
          >
            {f === "all" ? "সব" : STATUS_LABEL[f]}
          </button>
        ))}
        <button onClick={exportRegistrations} className="ml-auto rounded-full border-2 border-[var(--color-ink)] px-3 py-1 text-xs font-bold text-[var(--color-ink)]">
          ⬇️ CSV
        </button>
      </div>

      <div className="space-y-3">
        {visible.length === 0 && <p className="text-sm text-[var(--color-text)]/60">কোনো রেজিস্ট্রেশন নেই।</p>}
        {visible.map((r) => (
          <div key={r.id} className="rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 font-display font-bold text-[var(--color-ink)]">
                  {r.name}
                  {r.tier === "free" ? (
                    <span className="rounded-full bg-[var(--color-bluepen)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--color-bluepen)]">
                      ফ্রি
                    </span>
                  ) : (
                    <span className="rounded-full bg-[var(--color-greenpen)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--color-greenpen)]">
                      পেইড
                    </span>
                  )}
                </p>
                <p className="text-sm text-[var(--color-text)]/70">
                  {r.className} শ্রেণি · {r.school} · {r.division}
                </p>
                <p className="text-sm text-[var(--color-text)]/70">{r.phone} · {r.email}</p>
                {(r.bkashSender || r.transactionId) && (
                  <p className="mt-1 text-sm text-[var(--color-bluepen)]">
                    বিকাশ: {r.bkashSender} · TrxID: {r.transactionId}
                  </p>
                )}
                {r.duplicateTrx && (
                  <p className="mt-1 rounded bg-[var(--color-redpen)]/10 px-2 py-1 text-xs font-bold text-[var(--color-redpen)]">
                    ⚠️ এই TrxID একাধিক নিবন্ধনে ব্যবহার হয়েছে — কনফার্মের আগে যাচাই করুন
                  </p>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLS[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>

            {r.status !== "confirmed" && r.status !== "rejected" && (
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busyId === r.id}
                  onClick={() => updateStatus(r.id, "confirmed")}
                  className="rounded-lg bg-[var(--color-greenpen)] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  কনফার্ম করুন
                </button>
                <button
                  disabled={busyId === r.id}
                  onClick={() => updateStatus(r.id, "rejected")}
                  className="rounded-lg bg-[var(--color-redpen)] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  রিজেক্ট করুন
                </button>
              </div>
            )}
            {(r.status === "confirmed" || r.status === "rejected") && (
              <button
                disabled={busyId === r.id}
                onClick={() => updateStatus(r.id, "pending")}
                className="mt-3 text-xs font-semibold text-[var(--color-bluepen)] underline"
              >
                পেন্ডিং-এ ফিরিয়ে নিন
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Settings({ token }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then((res) => setForm(res.data || {}));
  }, []);

  if (!form) return <Loader label="সেটিংস লোড হচ্ছে…" />;

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await api.adminUpdateSettings(token, form);
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={save} className="max-w-md space-y-4 rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-5">
      <Field label="কোর্স ফি (৳)">
        <input className="input" value={form.price || ""} onChange={set("price")} placeholder="যেমনঃ 99" />
      </Field>
      <Field label="ছাড়ের মেয়াদ শেষ হওয়ার তারিখ-সময়">
        <input className="input" type="datetime-local" value={form.discountDeadline || ""} onChange={set("discountDeadline")} />
      </Field>
      <Field label="কোর্স ছবির URL (Google Drive/Imgur লিংক)">
        <input className="input" value={form.courseImageUrl || ""} onChange={set("courseImageUrl")} placeholder="https://..." />
        <span className="mt-1 block text-xs text-[var(--color-text)]/60">
          Google Drive: ছবিতে রাইট-ক্লিক → Share → "Anyone with the link" সিলেক্ট করে লিংক কপি করুন
          (শেয়ার লিংক দিলেই চলবে, বিশেষ ফরম্যাটে বদলাতে হবে না)। Imgur: ছবি আপলোডের পর যে লিংক
          পাবেন সেটাই দিন।
        </span>
      </Field>
      <Field label="অগ্রদূত লোগোর সরাসরি URL (অফলাইন প্রশ্নপত্রের হেডারে ব্যবহার হবে, ঐচ্ছিক)">
        <input className="input" value={form.logoUrl || ""} onChange={set("logoUrl")} placeholder="https://..." />
        <span className="mt-1 block text-xs text-[var(--color-text)]/60">
          লাইভ সাইটের `/images/agrodut-logo.png` লিংকটা এখানে দিতে পারেন (যেমনঃ
          https://আপনার-সাইট.netlify.app/images/agrodut-logo.png)। ফাঁকা রাখলে PDF-এ লোগো
          ছাড়াই শুধু লেখা দিয়ে হেডার হবে।
        </span>
      </Field>
      <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
        <input type="checkbox" checked={!!form.maintenanceMode} onChange={set("maintenanceMode")} />
        মেইনটেন্যান্স মোড চালু করুন
      </label>

      <div className="rounded-lg border border-[var(--color-paper-line)] p-3">
        <p className="mb-2 text-sm font-bold text-[var(--color-ink)]">লিখিত পরীক্ষা (মক টেস্ট)</p>
        <Field label="ডিফল্ট সময় (মিনিট) — যে মডেল টেস্টে আলাদা সময় দেওয়া নেই সেগুলোর জন্য">
          <input className="input" type="number" min="1" value={form.writtenMinutes || ""} onChange={set("writtenMinutes")} placeholder="যেমনঃ 25" />
        </Field>
        <Field label="সাইটের লিংক (ইমেইলে পোর্টালের বাটনের জন্য, যেমনঃ https://linguistic.netlify.app)">
          <input className="input" value={form.siteUrl || ""} onChange={set("siteUrl")} placeholder="https://..." />
        </Field>
        <p className="text-xs text-[var(--color-text)]/60">
          প্রতিটা মডেল টেস্টের নিজস্ব সময় প্রশ্ন ট্যাবে প্রশ্ন লেখার ফর্মেই ঠিক করা যায়। লাইভ পরীক্ষার সময় ও
          সময়সূচি আলাদা "লাইভ পরীক্ষা" ট্যাব থেকে ঠিক করুন।
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white disabled:opacity-60"
      >
        {saving ? "সেভ হচ্ছে…" : "সেভ করুন"}
      </button>
      {saved && <p className="text-center text-sm font-semibold text-[var(--color-greenpen)]">সেভ হয়েছে ✓</p>}
    </form>
  );
}

function Notices({ token }) {
  const [list, setList] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setList(null);
    api.adminListNotices(token).then((res) => setList(res.ok ? res.data : []));
  }

  useEffect(load, [token]);

  async function addNotice(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    await api.adminAddNotice(token, message.trim());
    setSaving(false);
    setMessage("");
    load();
  }

  async function deleteNotice(id) {
    setBusyId(id);
    await api.adminDeleteNotice(token, id);
    setBusyId(null);
    load();
  }

  return (
    <div className="max-w-xl space-y-6">
      <form onSubmit={addNotice} className="space-y-3 rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-5">
        <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">নতুন নোটিশ</h3>
        <textarea
          className="input"
          rows={3}
          placeholder="যেমনঃ আগামীকাল রাত ৯টায় লাইভ পরীক্ষা অনুষ্ঠিত হবে।"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white disabled:opacity-60"
        >
          {saving ? "যোগ হচ্ছে…" : "নোটিশ যোগ করুন"}
        </button>
      </form>

      <div>
        <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">সব নোটিশ</h3>
        {list === null ? (
          <Loader label="নোটিশ লোড হচ্ছে…" />
        ) : (
          <div className="mt-3 space-y-2">
            {list.length === 0 && <p className="text-sm text-[var(--color-text)]/60">এখনো কোনো নোটিশ নেই।</p>}
            {list.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-2 rounded-lg border border-[var(--color-paper-line)] bg-white/70 p-3">
                <p className="text-sm text-[var(--color-ink)]">{n.message}</p>
                <button
                  disabled={busyId === n.id}
                  onClick={() => deleteNotice(n.id)}
                  className="shrink-0 text-xs font-bold text-[var(--color-redpen)] underline disabled:opacity-50"
                >
                  মুছুন
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Contacts({ token }) {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState("new");
  const [busyId, setBusyId] = useState(null);

  function load() {
    setList(null);
    api.adminListContacts(token).then((res) => setList(res.ok ? res.data : []));
  }

  useEffect(load, [token]);

  async function toggleDone(c) {
    setBusyId(c.id);
    await api.adminMarkContactDone(token, c.id, c.status === "done" ? "new" : "done");
    setBusyId(null);
    load();
  }

  if (list === null) return <Loader label="মতামত লোড হচ্ছে…" />;

  const visible = filter === "all" ? list : list.filter((c) => c.status === filter);

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex gap-2 text-sm">
        {[
          ["new", "নতুন"],
          ["done", "সম্পন্ন"],
          ["all", "সব"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 font-semibold ${
              filter === key ? "bg-[var(--color-ink)] text-white" : "bg-white text-[var(--color-ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.length === 0 && <p className="text-sm text-[var(--color-text)]/60">কোনো মেসেজ নেই।</p>}
        {visible.map((c) => (
          <div key={c.id} className="rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">{c.email}</p>
                {c.phone && <p className="text-xs text-[var(--color-text)]/60">{c.phone}</p>}
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  c.status === "done" ? "bg-[var(--color-greenpen)]/15 text-[var(--color-greenpen)]" : "bg-[var(--color-marigold)]/20 text-[var(--color-marigold-dark)]"
                }`}
              >
                {c.status === "done" ? "সম্পন্ন" : "নতুন"}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-text)]/80">{c.message}</p>
            <button
              disabled={busyId === c.id}
              onClick={() => toggleDone(c)}
              className="mt-3 text-xs font-bold text-[var(--color-bluepen)] underline disabled:opacity-50"
            >
              {c.status === "done" ? "নতুন হিসেবে চিহ্নিত করুন" : "সম্পন্ন হিসেবে চিহ্নিত করুন"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const TOPIC_PRESETS = ["ধ্বনিতত্ত্ব", "রূপতত্ত্ব", "বাক্যতত্ত্ব", "শব্দার্থ", "লিপি ও বর্ণমালা", "সংখ্যা পদ্ধতি", "অনুবাদ ধাঁধা", "ভাষা পরিবার"];

const emptyWrittenQuestion = {
  passageHtml: "",
  passageImageUrl: "",
  passageImageBase64: "",
  subQuestions: [{ text: "", points: 10, imageUrl: "", imageBase64: "" }],
  kind: "written",
  status: "draft",
  forMock: true,
  forLive: false,
  liveExamId: "",
  testNo: "",
  minutes: "",
  topics: "",
  solutionHtml: "",
  solutionImageUrl: "",
  solutionImageBase64: "",
  publishAt: "",
};

function WrittenQuestions({ token }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(emptyWrittenQuestion);
  const [editingId, setEditingId] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [liveExams, setLiveExams] = useState([]);

  function load() {
    setList(null);
    api.adminListWrittenQuestions(token).then((res) => setList(res.ok ? res.data : []));
    api.adminListLiveExams(token).then((res) => setLiveExams(res.ok ? res.data : []));
  }

  useEffect(load, [token]);

  function updateSubQuestion(i, key, value) {
    setForm((f) => {
      const subQuestions = f.subQuestions.map((sq, idx) => (idx === i ? { ...sq, [key]: value } : sq));
      return { ...f, subQuestions };
    });
  }

  function addSubQuestion() {
    setForm((f) => ({ ...f, subQuestions: [...f.subQuestions, { text: "", points: 10, imageUrl: "", imageBase64: "" }] }));
  }

  function removeSubQuestion(i) {
    setForm((f) => ({ ...f, subQuestions: f.subQuestions.filter((_, idx) => idx !== i) }));
  }

  async function save(status) {
    setError("");
    const hasText = (html) => String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() !== "";
    // লেখাও নেই ছবিও নেই এমন "ফাঁকা" প্রশ্ন বাদ — তবে উদ্দীপকে (লেখা/ছবি) পুরো প্রশ্ন থাকলে
    // ফাঁকা প্রশ্ন-স্লট রাখা যায় (শুধু নম্বর ও উত্তরের ছবির জন্য)
    const hasPassage = hasText(form.passageHtml) || form.passageImageBase64 || form.passageImageUrl;
    const cleanSubQuestions = form.subQuestions.filter(
      (sq) => hasText(sq.text) || sq.imageBase64 || sq.imageUrl || hasPassage
    );
    if (cleanSubQuestions.length === 0) {
      setError("অন্তত একটা প্রশ্ন (লেখা বা ছবি) যোগ করুন।");
      return;
    }
    if (!hasPassage && !cleanSubQuestions.some((sq) => hasText(sq.text) || sq.imageBase64 || sq.imageUrl)) {
      setError("উদ্দীপক বা প্রশ্নের লেখা অথবা ছবি দিন।");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      subQuestions: cleanSubQuestions,
      status,
      publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : "",
    };
    const res = editingId
      ? await api.adminUpdateWrittenQuestion(token, editingId, payload)
      : await api.adminAddWrittenQuestion(token, payload);
    setSaving(false);
    if (res.ok) {
      cancelEdit();
      load();
    } else {
      setError(res.message || "সেভ করা যায়নি।");
    }
  }

  function startEdit(q) {
    setEditingId(q.id);
    setForm({
      passageHtml: q.passageHtml || "",
      passageImageUrl: q.passageImageUrl || "",
      passageImageBase64: "",
      subQuestions: (q.subQuestions || []).map((sq) => ({
        id: sq.id,
        text: sq.text || "",
        points: sq.points,
        imageUrl: sq.imageUrl || "",
        imageBase64: "",
      })),
      kind: q.kind || "written",
      status: q.status || "draft",
      forMock: q.forMock === true || q.forMock === "TRUE",
      forLive: q.forLive === true || q.forLive === "TRUE",
      liveExamId: q.liveExamId || "",
      testNo: q.testNo || "",
      minutes: q.minutes || "",
      topics: q.topics || "",
      solutionHtml: q.solutionHtml || "",
      solutionImageUrl: q.solutionImageUrl || "",
      solutionImageBase64: "",
      publishAt: toLocalInput_(q.publishAt),
    });
    setResetKey((k) => k + 1);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyWrittenQuestion);
    setResetKey((k) => k + 1);
  }

  /** একটা প্রশ্ন-সেটের ড্রাফট কপি (ছবিসহ) — একই ধাঁচের নতুন Model Test বানাতে */
  async function copyQ(q) {
    setBusyId(q.id);
    await api.adminAddWrittenQuestion(token, {
      passageHtml: q.passageHtml || "",
      passageImageUrl: q.passageImageUrl || "",
      kind: "written",
      status: "draft",
      forMock: q.forMock === true || q.forMock === "TRUE",
      forLive: q.forLive === true || q.forLive === "TRUE",
      liveExamId: q.liveExamId || "",
      minutes: q.minutes || "",
      topics: q.topics || "",
      solutionHtml: q.solutionHtml || "",
      solutionImageUrl: q.solutionImageUrl || "",
      subQuestions: (q.subQuestions || []).map((sq) => ({ text: sq.text || "", points: sq.points, imageUrl: sq.imageUrl || "" })),
    });
    setBusyId(null);
    load();
  }

  async function deleteQ(id) {
    setBusyId(id);
    await api.adminDeleteWrittenQuestion(token, id);
    setBusyId(null);
    if (editingId === id) cancelEdit();
    load();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="h-fit space-y-3 rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-5">
        <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">
          {editingId ? "প্রশ্ন এডিট করুন" : "নতুন প্রশ্ন যোগ করুন"}
        </h3>
        {error && <p className="rounded-lg bg-[var(--color-redpen)]/10 px-3 py-2 text-sm text-[var(--color-redpen)]">{error}</p>}

        {(
          <Field label="উদ্দীপক">
            <RichTextEditor
              value={form.passageHtml}
              onChange={(html) => setForm((f) => ({ ...f, passageHtml: html }))}
              placeholder="এখানে উদ্দীপক লিখুন — কবিতা হলে প্রতিটা লাইনের পর Enter চাপুন... (লেখা না দিয়ে শুধু ছবিও দিতে পারেন)"
              resetKey={resetKey}
            />
          </Field>
        )}

        {(
          <ImagePicker
            label="উদ্দীপক / পুরো প্রশ্নের ছবি (ঐচ্ছিক — লেখা না দিয়ে শুধু ছবিও চলবে)"
            url={form.passageImageUrl}
            base64={form.passageImageBase64}
            onChange={({ url, base64 }) => setForm((f) => ({ ...f, passageImageUrl: url, passageImageBase64: base64 }))}
          />
        )}

        <div className="space-y-3">
          <span className="block text-sm font-semibold text-[var(--color-ink)]">
            প্রশ্নসমূহ
          </span>
          {form.subQuestions.map((sq, i) => (
            <div key={i} className="rounded-lg border border-[var(--color-paper-line)] bg-[var(--color-paper)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-ink)] font-display text-xs font-bold text-white">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeSubQuestion(i)}
                  className="rounded-lg border border-[var(--color-redpen)] px-2 py-0.5 text-xs font-bold text-[var(--color-redpen)]"
                >
                  ✕ বাদ দিন
                </button>
              </div>
                <RichTextEditor
                  value={sq.text}
                  onChange={(html) => updateSubQuestion(i, "text", html)}
                  placeholder={`${i + 1} নম্বর প্রশ্ন লিখুন... (ছবি দিলে লেখা ফাঁকা রাখা যায়)`}
                  resetKey={`${resetKey}-${i}`}
                />
              {(
                <div className="mt-2">
                  <ImagePicker
                    label={`${i + 1} নম্বর প্রশ্নের ছবি (ঐচ্ছিক)`}
                    url={sq.imageUrl}
                    base64={sq.imageBase64}
                    onChange={({ url, base64 }) => {
                      updateSubQuestion(i, "imageUrl", url);
                      updateSubQuestion(i, "imageBase64", base64);
                    }}
                  />
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs font-semibold text-[var(--color-ink)]">নম্বর:</label>
                <input
                  className="input w-24"
                  type="number"
                  min="0"
                  value={sq.points}
                  onChange={(e) => updateSubQuestion(i, "points", Number(e.target.value))}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addSubQuestion}
            className="rounded-lg border border-[var(--color-paper-line)] px-3 py-1 text-xs font-bold text-[var(--color-ink)]"
          >
            + আরেকটা প্রশ্ন যোগ করুন
          </button>
        </div>

        <div className="flex gap-4 text-sm font-semibold text-[var(--color-ink)]">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={form.forMock} onChange={(e) => setForm((f) => ({ ...f, forMock: e.target.checked }))} /> মডেল টেস্ট
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={form.forLive} onChange={(e) => setForm((f) => ({ ...f, forLive: e.target.checked }))} /> লাইভ টেস্ট
          </label>
        </div>
        {form.forMock && (
          <div className="rounded-lg border border-[var(--color-marigold)]/50 bg-[var(--color-marigold)]/10 p-3">
            <p className="mb-2 text-xs font-bold text-[var(--color-marigold-dark)]">
              এই প্রশ্নটাই একটা মডেল টেস্ট — স্টুডেন্ট Model Test তালিকা থেকে বেছে এটাই পাবে (র‍্যান্ডম নয়)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="সময় (মিনিট)">
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.minutes}
                  onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
                  placeholder="ফাঁকা = ডিফল্ট"
                />
              </Field>
              <Field label="Model Test নম্বর">
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.testNo}
                  onChange={(e) => setForm((f) => ({ ...f, testNo: e.target.value }))}
                  placeholder="ফাঁকা = পরের নম্বর"
                />
              </Field>
            </div>
          </div>
        )}
        {form.forLive && (
          <Field label="কোন লাইভ পরীক্ষায় আসবে?">
            <select className="input" value={form.liveExamId || ""} onChange={(e) => setForm((f) => ({ ...f, liveExamId: e.target.value }))}>
              <option value="">সব লাইভ পরীক্ষায়</option>
              {liveExams.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="টপিক ট্যাগ (কমা দিয়ে আলাদা — স্টুডেন্ট নিজের দুর্বল টপিক দেখতে পাবে)">
          <input className="input" value={form.topics} onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))} placeholder="যেমনঃ ধ্বনিতত্ত্ব, রূপতত্ত্ব" />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TOPIC_PRESETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() =>
                  setForm((f) => {
                    const cur = f.topics.split(",").map((x) => x.trim()).filter(Boolean);
                    return { ...f, topics: (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]).join(", ") };
                  })
                }
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  form.topics.split(",").map((x) => x.trim()).includes(t)
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                    : "border-[var(--color-paper-line)] bg-white text-[var(--color-ink)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <details className="rounded-lg border border-[var(--color-greenpen)]/40 bg-[var(--color-greenpen)]/5 p-3" open={!!(form.solutionHtml || form.solutionImageUrl || form.solutionImageBase64)}>
          <summary className="cursor-pointer text-sm font-bold text-[var(--color-greenpen)]">✓ আদর্শ উত্তর / সমাধান (ঐচ্ছিক — মূল্যায়নের পর স্টুডেন্ট দেখবে)</summary>
          <div className="mt-3 space-y-3">
            <RichTextEditor
              value={form.solutionHtml}
              onChange={(html) => setForm((f) => ({ ...f, solutionHtml: html }))}
              placeholder="সমাধান লিখুন..."
              resetKey={resetKey}
            />
            <ImagePicker
              label="সমাধানের ছবি (ঐচ্ছিক)"
              url={form.solutionImageUrl}
              base64={form.solutionImageBase64}
              onChange={({ url, base64 }) => setForm((f) => ({ ...f, solutionImageUrl: url, solutionImageBase64: base64 }))}
            />
          </div>
        </details>

        <Field label="স্বয়ংক্রিয় প্রকাশের সময় (ঐচ্ছিক — প্রকাশ করুন চাপলেও এই সময়ের আগে স্টুডেন্টরা দেখবে না)">
          <input className="input" type="datetime-local" value={form.publishAt} onChange={(e) => setForm((f) => ({ ...f, publishAt: e.target.value }))} />
        </Field>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => save("draft")}
            className="flex-1 rounded-xl border-2 border-[var(--color-ink)] px-4 py-3 font-display font-bold text-[var(--color-ink)] disabled:opacity-60"
          >
            ড্রাফট রাখুন
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("published")}
            className="flex-1 rounded-xl bg-[var(--color-ink)] px-4 py-3 font-display font-bold text-white disabled:opacity-60"
          >
            {saving ? "সেভ হচ্ছে…" : "প্রকাশ করুন"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="rounded-xl border-2 border-[var(--color-redpen)] px-3 font-display font-bold text-[var(--color-redpen)]">
              বাতিল
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">প্রশ্ন তালিকা {list ? `(${list.length}টি)` : ""}</h3>
        {list === null ? (
          <Loader label="লোড হচ্ছে…" />
        ) : (
          <div className="mt-3 max-h-[36rem] space-y-2 overflow-y-auto">
            {list.length === 0 && <p className="text-sm text-[var(--color-text)]/60">এখনো কোনো প্রশ্ন যোগ করা হয়নি।</p>}
            {list.map((q) => (
              <div key={q.id} className="rounded-lg border border-[var(--color-paper-line)] bg-white/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${q.status === "published" ? "bg-[var(--color-greenpen)]/15 text-[var(--color-greenpen)]" : "bg-[var(--color-marigold)]/20 text-[var(--color-marigold-dark)]"}`}>
                      {q.status === "published" ? "প্রকাশিত" : "ড্রাফট"}
                    </span>{" "}
                    <span className="text-xs font-semibold text-[var(--color-ink)]">{q.testTitle || "শুধু লাইভ"}</span>{" "}
                    <span className="text-xs text-[var(--color-text)]/60">
                      · {(q.subQuestions || []).length}টি প্রশ্ন{q.minutes ? ` · ${q.minutes} মিনিট` : ""}{q.forLive === true || q.forLive === "TRUE" ? " · লাইভ" : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => startEdit(q)} className="text-xs font-bold text-[var(--color-bluepen)] underline">এডিট</button>
                    <button disabled={busyId === q.id} onClick={() => copyQ(q)} className="text-xs font-bold text-[var(--color-ink)] underline disabled:opacity-50">কপি</button>
                    <button disabled={busyId === q.id} onClick={() => deleteQ(q.id)} className="text-xs font-bold text-[var(--color-redpen)] underline disabled:opacity-50">মুছুন</button>
                  </div>
                </div>
                {q.publishAt && new Date(q.publishAt) > new Date() && (
                  <p className="mt-1 text-xs font-bold text-[var(--color-bluepen)]">⏰ {fmtBn_(q.publishAt)}-এ স্বয়ংক্রিয়ভাবে প্রকাশ হবে</p>
                )}
                {q.topics && <p className="mt-1 text-xs text-[var(--color-text)]/60">🏷 {q.topics}</p>}
                {q.passageHtml && <div className="lx-q mt-2 line-clamp-2 text-xs text-[var(--color-text)]/70" dangerouslySetInnerHTML={{ __html: q.passageHtml }} />}
                {(q.passageImageUrl || (q.subQuestions || []).some((sq) => sq.imageUrl)) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.passageImageUrl && <img src={q.passageImageUrl} alt="উদ্দীপকের ছবি" className="h-14 rounded border border-[var(--color-paper-line)] bg-white" />}
                    {(q.subQuestions || []).filter((sq) => sq.imageUrl).map((sq) => (
                      <img key={sq.id} src={sq.imageUrl} alt="প্রশ্নের ছবি" className="h-14 rounded border border-[var(--color-paper-line)] bg-white" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const KIND_LABEL_ADMIN = { written: "লিখিত" };
const EXAM_TYPE_LABEL_ADMIN = { mock: "মডেল টেস্ট", live: "লাইভ" };

function groupPendingWritten_(list) {
  const groups = {};
  list.forEach((item) => {
    // ছবির লিংক দিয়ে গ্রুপ করা হয় — একটা আপলোড (submitWrittenAnswersBatch)
    // সবসময় একটাই ছবি তৈরি করে যেটা সেই ব্যাচের সবকটা প্রশ্ন শেয়ার করে,
    // এমনকি প্রশ্নগুলো ভিন্ন ভিন্ন মূল ডকুমেন্ট (writtenQuestionId) থেকে
    // আসলেও (যেমন একাধিক উদ্দীপক) — তাই ছবিই আসল গ্রুপিং কী।
    const key = item.imageUrl;
    if (!groups[key]) {
      groups[key] = { key, imageUrl: item.imageUrl, kind: item.kind, examType: item.examType, passageHtml: item.passageHtml || "", passageImageUrl: item.passageImageUrl || "", testTitle: item.testTitle || "", items: [] };
    }
    groups[key].items.push(item);
  });
  return Object.values(groups);
}

const COMMENT_TEMPLATES = ["চমৎকার!", "যুক্তি স্পষ্ট করে লেখো", "নিয়মটা আবার দেখো", "হাতের লেখা আরও পরিষ্কার করো", "উদাহরণ থেকে নিয়ম ধরার চেষ্টা করো", "ভালো চেষ্টা, কিন্তু উত্তর অসম্পূর্ণ"];

function Grading({ token }) {
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(null); // একটা গ্রুপ (একই ছবির সব প্রশ্ন)
  const [scores, setScores] = useState({}); // { [attemptId]: score }
  const [comment, setComment] = useState("");
  const [annotated, setAnnotated] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all"); // all | টেস্টের নাম | live

  function load(silent = false) {
    if (!silent) setList(null);
    api.adminListPendingWritten(token).then((res) => setList(res.ok ? res.data : []));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const allGroups = list ? groupPendingWritten_(list) : [];
  const filterOf = (g) => (g.examType === "live" ? "live" : g.testTitle || "other");
  const filterOptions = [...new Set(allGroups.map(filterOf))].sort();
  const groups = allGroups.filter((g) => filter === "all" || filterOf(g) === filter);

  function openGroup(group) {
    setSelected(group);
    setScores({});
    setComment("");
    setAnnotated(null);
    window.scrollTo({ top: 0 });
  }

  async function save() {
    const items = selected.items
      .filter((it) => scores[it.id] !== undefined && scores[it.id] !== "")
      .map((it) => ({ id: it.id, score: Math.min(Number(scores[it.id]), Number(it.points) || Number(scores[it.id])) }));
    if (items.length === 0) return;
    setSaving(true);
    await api.adminGradeWrittenBatch(token, {
      items,
      annotatedImageBase64: annotated,
      adminComment: comment,
    });
    setSaving(false);
    // পরের খাতায় সরাসরি চলে যাওয়া (ফিল্টার করা তালিকার ক্রমে) — তালিকায় ফিরতে হয় না
    const idx = groups.findIndex((g) => g.key === selected.key);
    const next = groups[idx + 1] || groups[idx - 1];
    setList((old) => (old || []).filter((it) => !selected.items.some((s) => s.id === it.id)));
    if (next && next.key !== selected.key) openGroup(next);
    else setSelected(null);
    load(true);
  }

  if (selected) {
    const allFilled = selected.items.every((it) => scores[it.id] !== undefined && scores[it.id] !== "");
    const remaining = groups.filter((g) => g.key !== selected.key).length;
    return (
      <div className="max-w-2xl">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setSelected(null)} className="text-sm font-bold text-[var(--color-bluepen)] underline">
            ← তালিকায় ফিরুন
          </button>
          <span className="rounded-full bg-[var(--color-marigold)]/20 px-3 py-1 text-xs font-bold text-[var(--color-marigold-dark)]">
            এরপর আরও {remaining}টি খাতা বাকি
          </span>
        </div>
        {selected.testTitle && <p className="mb-2 font-display text-sm font-bold text-[var(--color-ink)]">{selected.testTitle}</p>}

        {selected.passageHtml && (
          <div
            className="lx-q mb-3 rounded-lg border border-[var(--color-paper-line)] bg-[var(--color-paper)] p-3 text-sm"
            dangerouslySetInnerHTML={{ __html: selected.passageHtml }}
          />
        )}

        {selected.passageImageUrl && (
          <ZoomImage src={selected.passageImageUrl} alt="প্রশ্নের ছবি" className="mb-3 w-full rounded-lg border border-[var(--color-paper-line)] bg-white object-contain" />
        )}

        <GradingCanvas key={selected.key} imageUrl={selected.imageUrl} onExport={setAnnotated} />
        {annotated && <p className="mt-2 text-xs text-[var(--color-greenpen)]">মার্কিং প্রস্তুত ✓ — নিচে প্রতিটার নম্বর দিয়ে সাবমিট করুন।</p>}

        <div className="mt-4 space-y-3 rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-[var(--color-ink)]">
              এই খাতায় {selected.items.length}টি প্রশ্ন — প্রতিটার নম্বর আলাদাভাবে দিন
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScores(Object.fromEntries(selected.items.map((it) => [it.id, it.points])))}
                className="rounded-lg bg-[var(--color-greenpen)]/15 px-3 py-1 text-xs font-bold text-[var(--color-greenpen)]"
              >
                সব পূর্ণ নম্বর
              </button>
              <button
                type="button"
                onClick={() => setScores(Object.fromEntries(selected.items.map((it) => [it.id, 0])))}
                className="rounded-lg bg-[var(--color-redpen)]/10 px-3 py-1 text-xs font-bold text-[var(--color-redpen)]"
              >
                সব ০
              </button>
            </div>
          </div>
          {selected.items.map((it, i) => (
            <div key={it.id} className="rounded-lg bg-[var(--color-paper)] p-3">
              <div className="lx-q text-xs font-semibold text-[var(--color-ink)]" dangerouslySetInnerHTML={{ __html: `${i + 1}. ${it.subQuestionText || ""}` }} />
              {it.subQuestionImageUrl && (
                <ZoomImage src={it.subQuestionImageUrl} alt="প্রশ্নের ছবি" className="mt-1 max-h-48 rounded-md border border-[var(--color-paper-line)] bg-white" />
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="text-xs text-[var(--color-text)]/70">নম্বর (সর্বোচ্চ {it.points}):</label>
                <input
                  className="input w-24"
                  type="number"
                  min="0"
                  max={it.points}
                  value={scores[it.id] ?? ""}
                  onChange={(e) => setScores((s) => ({ ...s, [it.id]: e.target.value }))}
                />
                <button type="button" onClick={() => setScores((s) => ({ ...s, [it.id]: it.points }))} className="text-xs font-bold text-[var(--color-greenpen)] underline">
                  পূর্ণ
                </button>
              </div>
            </div>
          ))}

          <Field label="সামগ্রিক মন্তব্য (ঐচ্ছিক, সবগুলোর জন্য একই থাকবে)">
            <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {COMMENT_TEMPLATES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setComment((c) => (c ? `${c} ${t}` : t))}
                  className="rounded-full border border-[var(--color-paper-line)] bg-white px-2.5 py-0.5 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-marigold)]/20"
                >
                  + {t}
                </button>
              ))}
            </div>
          </Field>

          <button
            disabled={saving || !allFilled}
            onClick={save}
            className="w-full rounded-xl bg-[var(--color-ink)] px-6 py-3 font-display font-bold text-white disabled:opacity-60"
          >
            {saving ? "সেভ হচ্ছে…" : `সেভ করে পরের খাতায় যান (${selected.items.length}টি প্রশ্ন)`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">
          মূল্যায়নের অপেক্ষায় {list ? `(${groups.length}টি খাতা)` : ""}
        </h3>
        {allGroups.length > 0 && (
          <div className="flex items-center gap-2">
            <select className="input !w-auto !py-1.5 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">সব পরীক্ষা</option>
              {filterOptions.map((o) => (
                <option key={o} value={o}>{o === "live" ? "লাইভ পরীক্ষা" : o === "other" ? "অন্যান্য" : o}</option>
              ))}
            </select>
            {groups.length > 0 && (
              <button onClick={() => openGroup(groups[0])} className="rounded-lg bg-[var(--color-redpen)] px-3 py-1.5 text-sm font-bold text-white">
                ▶ মূল্যায়ন শুরু করুন
              </button>
            )}
          </div>
        )}
      </div>
      {list === null ? (
        <Loader label="লোড হচ্ছে…" />
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {groups.length === 0 && <p className="text-sm text-[var(--color-text)]/60">এখন মূল্যায়নের অপেক্ষায় কিছু নেই।</p>}
          {groups.map((g) => (
            <button key={g.key} onClick={() => openGroup(g)} className="rounded-lg border border-[var(--color-paper-line)] bg-white/70 p-2 text-left">
              <img src={g.imageUrl} alt="উত্তরপত্র" className="h-32 w-full rounded-md object-cover" />
              <p className="mt-1 text-xs font-semibold text-[var(--color-ink)]">{g.items.length}টি প্রশ্নের উত্তর</p>
              <p className="text-xs text-[var(--color-text)]/60">
                {g.testTitle ? `${g.testTitle} · ` : ""}{KIND_LABEL_ADMIN[g.kind] || g.kind} · {EXAM_TYPE_LABEL_ADMIN[g.examType] || g.examType}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveResults({ token }) {
  const [rows, setRows] = useState(null);
  const [exams, setExams] = useState(null);
  const [examId, setExamId] = useState("");

  useEffect(() => {
    api.adminListLiveExams(token).then((res) => {
      const list = res.ok ? res.data : [];
      setExams(list);
      if (list.length) setExamId(list[list.length - 1].id);
    });
  }, [token]);

  useEffect(() => {
    if (exams === null) return;
    setRows(null);
    api.adminLiveResults(token, examId).then((res) => setRows(res.ok ? res.data : []));
  }, [token, examId, exams]);

  if (rows === null || exams === null) return <Loader label="লোড হচ্ছে…" />;
  const examTitle = exams.find((e) => e.id === examId)?.title || "সব লাইভ পরীক্ষা";

  return (
    <div className="max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">{examTitle} — ফলাফল (মূল্যায়ন শেষ হওয়া খাতা)</h3>
        <button onClick={() => window.print()} className="rounded-lg bg-[var(--color-ink)] px-4 py-1.5 text-sm font-bold text-white">
          প্রিন্ট / PDF ডাউনলোড
        </button>
      </div>
      <select className="input mb-3" value={examId} onChange={(e) => setExamId(e.target.value)}>
        <option value="">সব লাইভ পরীক্ষা (সর্বোচ্চ নম্বর)</option>
        {exams.map((e) => (
          <option key={e.id} value={e.id}>{e.title}</option>
        ))}
      </select>
      <p className="mb-2 text-xs text-[var(--color-text)]/60">
        প্রিন্ট বাটনে চাপলে ব্রাউজারের প্রিন্ট ডায়ালগ খুলবে — সেখান থেকে "Save as PDF" বেছে নিলে PDF হিসেবে সেভ হয়ে যাবে।
      </p>
      <table className="w-full border-collapse overflow-hidden rounded-lg border border-[var(--color-paper-line)] bg-white text-sm">
        <thead>
          <tr className="bg-[var(--color-ink)] text-white">
            <th className="p-2 text-left">ক্রম</th>
            <th className="p-2 text-left">নাম</th>
            <th className="p-2 text-left">শ্রেণি/বিদ্যালয়</th>
            <th className="p-2 text-left">বিভাগ</th>
            <th className="p-2 text-right">নম্বর</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-[var(--color-paper-line)]">
              <td className="p-2">{i + 1}</td>
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.className} · {r.school}</td>
              <td className="p-2">{r.division}</td>
              <td className="p-2 text-right font-bold">{r.score}/{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function downloadBase64Pdf_(base64, filename) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "question-paper.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function OfflineExams({ token }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tests, setTests] = useState(null);
  const [testId, setTestId] = useState("");

  useEffect(() => {
    api.adminListWrittenQuestions(token).then((res) => {
      const list = res.ok ? res.data : [];
      setTests(list.filter((q) => q.testNo && q.status === "published").sort((a, b) => a.testNo - b.testNo));
    });
  }, [token]);

  async function generate() {
    setError("");
    setLoading(true);
    try {
      const res = await api.adminGenerateOfflineWritten(token, testId);
      if (res.ok) {
        downloadBase64Pdf_(res.data.base64, res.data.filename);
      } else {
        setError(res.message || "PDF তৈরি করা যায়নি।");
      }
    } catch {
      setError("সার্ভারের সাথে সংযোগ করা যায়নি।");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <p className="mb-4 text-sm text-[var(--color-text)]/70">
        অফলাইনে পরীক্ষা নেওয়ার জন্য প্রিন্টযোগ্য (A4) প্রশ্নপত্র। একটা নির্দিষ্ট মডেল টেস্ট বেছে নিন, অথবা সব প্রকাশিত
        মডেল টেস্ট একসাথে (প্রতিটা আলাদা পাতায়) ডাউনলোড করুন। প্রতিটার নিচে উত্তর লেখার জায়গা ও নির্ধারিত সময় থাকে।
      </p>
      {error && <p className="mb-4 rounded-lg bg-[var(--color-redpen)]/10 px-4 py-2 text-sm text-[var(--color-redpen)]">{error}</p>}
      {tests === null ? (
        <Loader label="লোড হচ্ছে…" />
      ) : (
        <div className="space-y-3 rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-4">
          <select className="input" value={testId} onChange={(e) => setTestId(e.target.value)}>
            <option value="">সবগুলো মডেল টেস্ট (একসাথে)</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>{t.testTitle}{t.minutes ? ` — ${t.minutes} মিনিট` : ""}</option>
            ))}
          </select>
          <button
            disabled={loading || tests.length === 0}
            onClick={generate}
            className="w-full rounded-xl bg-[var(--color-ink)] px-4 py-3 font-display font-bold text-white disabled:opacity-60"
          >
            {loading ? "তৈরি হচ্ছে…" : "PDF ডাউনলোড"}
          </button>
          {tests.length === 0 && <p className="text-xs text-[var(--color-text)]/60">এখনো কোনো প্রকাশিত মডেল টেস্ট নেই।</p>}
        </div>
      )}
    </div>
  );
}

function toLocalInput_(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fmtBn_ = (iso) =>
  new Date(iso).toLocaleString("bn-BD", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

const emptyLive = { id: "", title: "", start: "", end: "", minutes: 25 };

/** একাধিক লাইভ পরীক্ষা — একই দিনেও যত খুশি। প্রতিটার নাম, শুরু/শেষের উইন্ডো ও সময়কাল আলাদা।
 *  স্টুডেন্ট প্রতিটা লাইভ পরীক্ষায় একবার অংশ নিতে পারে। */
function LiveExamsAdmin({ token }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(emptyLive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    setList(null);
    api.adminListLiveExams(token).then((res) => setList(res.ok ? res.data : []));
  }
  useEffect(load, [token]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setError("");
    if (!form.start || !form.end) {
      setError("শুরু ও শেষের তারিখ-সময় দিন।");
      return;
    }
    setSaving(true);
    const res = await api.adminSaveLiveExam(token, {
      id: form.id,
      title: form.title,
      // ব্রাউজারের লোকাল সময়কে UTC-তে বদলে পাঠানো হয় — স্ক্রিপ্টের টাইমজোন যাই হোক সময় ঠিক থাকে
      start: new Date(form.start).toISOString(),
      end: new Date(form.end).toISOString(),
      minutes: Number(form.minutes),
    });
    setSaving(false);
    if (res.ok) {
      setForm(emptyLive);
      load();
    } else {
      setError(res.message || "সেভ করা যায়নি।");
    }
  }

  function startEdit(ex) {
    setForm({ id: ex.id, title: ex.title, start: toLocalInput_(ex.start), end: toLocalInput_(ex.end), minutes: ex.minutes });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id) {
    setBusyId(id);
    await api.adminDeleteLiveExam(token, id);
    setBusyId(null);
    if (form.id === id) setForm(emptyLive);
    load();
  }

  const now = Date.now();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={save} className="h-fit space-y-3 rounded-xl border border-[var(--color-paper-line)] bg-white/70 p-5">
        <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">
          {form.id ? "লাইভ পরীক্ষা এডিট করুন" : "নতুন লাইভ পরীক্ষা যোগ করুন"}
        </h3>
        {error && <p className="rounded-lg bg-[var(--color-redpen)]/10 px-3 py-2 text-sm text-[var(--color-redpen)]">{error}</p>}
        <Field label="পরীক্ষার নাম">
          <input className="input" value={form.title} onChange={set("title")} placeholder="যেমনঃ লাইভ টেস্ট ১ (সকাল)" />
        </Field>
        <Field label="শুরুর তারিখ ও সময় (এই সময় থেকে ঢোকা যাবে)">
          <input className="input" type="datetime-local" required value={form.start} onChange={set("start")} />
        </Field>
        <Field label="শেষের তারিখ ও সময় (এরপর আর ঢোকা যাবে না)">
          <input className="input" type="datetime-local" required value={form.end} onChange={set("end")} />
        </Field>
        <Field label="পরীক্ষার সময়কাল (মিনিট)">
          <input className="input" type="number" min="1" required value={form.minutes} onChange={set("minutes")} />
        </Field>
        <p className="text-xs text-[var(--color-text)]/60">
          একই দিনে যত খুশি লাইভ পরীক্ষা যোগ করা যায় (উইন্ডো ওভারল্যাপ করলেও সমস্যা নেই)। স্টুডেন্ট প্রতিটায় একবার অংশ নিতে পারবে।
          কোন প্রশ্ন কোন লাইভ পরীক্ষায় আসবে তা প্রশ্ন ট্যাবে ঠিক করা যায়।
        </p>
        <div className="flex gap-2">
          <button disabled={saving} className="flex-1 rounded-xl bg-[var(--color-ink)] px-4 py-3 font-display font-bold text-white disabled:opacity-60">
            {saving ? "সেভ হচ্ছে…" : form.id ? "আপডেট করুন" : "যোগ করুন"}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyLive)} className="rounded-xl border-2 border-[var(--color-redpen)] px-3 font-display font-bold text-[var(--color-redpen)]">
              বাতিল
            </button>
          )}
        </div>
      </form>

      <div>
        <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">লাইভ পরীক্ষার তালিকা {list ? `(${list.length}টি)` : ""}</h3>
        {list === null ? (
          <Loader label="লোড হচ্ছে…" />
        ) : (
          <div className="mt-3 space-y-2">
            {list.length === 0 && <p className="text-sm text-[var(--color-text)]/60">এখনো কোনো লাইভ পরীক্ষা যোগ করা হয়নি।</p>}
            {list.map((ex) => {
              const state = now < new Date(ex.start) ? ["শুরু হয়নি", "bg-[var(--color-marigold)]/20 text-[var(--color-marigold-dark)]"] : now > new Date(ex.end) ? ["শেষ", "bg-[var(--color-text)]/10 text-[var(--color-text)]/60"] : ["চলছে", "bg-[var(--color-greenpen)]/15 text-[var(--color-greenpen)]"];
              return (
                <div key={ex.id} className="rounded-lg border border-[var(--color-paper-line)] bg-white/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display font-bold text-[var(--color-ink)]">{ex.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${state[1]}`}>{state[0]}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text)]/65">
                    {fmtBn_(ex.start)} → {fmtBn_(ex.end)} · {ex.minutes} মিনিট
                  </p>
                  <div className="mt-2 flex gap-3">
                    <button onClick={() => startEdit(ex)} className="text-xs font-bold text-[var(--color-bluepen)] underline">এডিট</button>
                    <button disabled={busyId === ex.id} onClick={() => remove(ex.id)} className="text-xs font-bold text-[var(--color-redpen)] underline disabled:opacity-50">মুছুন</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** অ্যাডমিনের জন্য প্রশ্নের ছবি আপলোড — ক্যামেরা/গ্যালারি থেকে নিয়ে ব্রাউজারেই ছোট
 *  করা হয়। url = আগে থেকে সেভ হওয়া ছবি (Drive), base64 = নতুন বাছাই করা ছবি। */
function ImagePicker({ label, url, base64, onChange }) {
  const [busy, setBusy] = useState(false);
  const preview = base64 || url;

  async function pick(file) {
    if (!file) return;
    setBusy(true);
    try {
      const raw = await fileToDataUrl(file);
      const compressed = await compressImage(raw, 1800, 0.8);
      onChange({ url: "", base64: compressed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-[var(--color-bluepen)]/50 bg-[var(--color-bluepen)]/5 p-3">
      <p className="mb-2 text-xs font-bold text-[var(--color-bluepen)]">{label}</p>
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="প্রশ্নের ছবি" className="max-h-56 rounded-md border border-[var(--color-paper-line)] bg-white" />
          <button
            type="button"
            onClick={() => onChange({ url: "", base64: "" })}
            title="ছবি সরান"
            className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-[var(--color-redpen)] font-bold text-white shadow-md"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--color-marigold)] bg-[var(--color-marigold)]/10 px-3 py-2 text-xs font-bold text-[var(--color-marigold-dark)]">
            📷 ক্যামেরায় ছবি তুলুন
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--color-bluepen)] bg-white px-3 py-2 text-xs font-bold text-[var(--color-bluepen)]">
            🖼️ ছবি আপলোড করুন
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
        </div>
      )}
      {busy && <p className="mt-2 text-xs text-[var(--color-text)]/60">ছবি প্রস্তুত হচ্ছে…</p>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-[var(--color-ink)]">{label}</span>
      {children}
    </label>
  );
}