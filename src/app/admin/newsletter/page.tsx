"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { useAuth } from "@/lib/firebase/useAuth";
import type { Campaign } from "@/lib/newsletter/campaigns";

const input =
  "rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500";
const btnPrimary =
  "rounded-[4px] bg-surface-2 px-3 py-1.5 text-sm font-semibold text-white hover:bg-surface disabled:opacity-50";
const btnGhost =
  "rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

const fmtDate = (t: { seconds: number } | null) =>
  t
    ? new Date(t.seconds * 1000).toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function NewsletterAdminPage() {
  const { user } = useAuth();

  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [testEmail, setTestEmail] = useState("");
  // Remounts the editor to clear it after a successful send.
  const [editorKey, setEditorKey] = useState(0);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscribers, setSubscribers] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "test" | "send" | "sync">(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    adminFetch<{ campaigns: Campaign[]; subscribers: number }>("/api/admin/newsletter")
      .then((d) => {
        setCampaigns(d.campaigns);
        setSubscribers(d.subscribers);
      })
      .catch((e) =>
        setError(
          e instanceof AdminFetchError && e.status === 403
            ? "Your account can't manage the newsletter."
            : "Could not load the newsletter.",
        ),
      )
      .finally(() => setLoading(false));
  }, [user]);

  async function refresh() {
    const d = await adminFetch<{ campaigns: Campaign[]; subscribers: number }>("/api/admin/newsletter");
    setCampaigns(d.campaigns);
    setSubscribers(d.subscribers);
  }

  async function sendTest() {
    setNote(null);
    if (!subject.trim() || !contentHtml.trim()) return setError("Add a subject and body first.");
    if (!testEmail.includes("@")) return setError("Enter a valid test email.");
    setError(null);
    setBusy("test");
    try {
      await adminFetch("/api/admin/newsletter", {
        method: "POST",
        body: JSON.stringify({ action: "test", subject, previewText, contentHtml, testEmail }),
      });
      setNote(`Test sent to ${testEmail}.`);
    } catch (e) {
      setError(e instanceof AdminFetchError ? e.message : "Test send failed.");
    } finally {
      setBusy(null);
    }
  }

  async function sendToAll() {
    setNote(null);
    if (!subject.trim() || !contentHtml.trim()) return setError("Add a subject and body first.");
    if (!confirm(`Send "${subject}" to ${subscribers} subscriber${subscribers === 1 ? "" : "s"}? This cannot be undone.`))
      return;
    setError(null);
    setBusy("send");
    try {
      await adminFetch("/api/admin/newsletter", {
        method: "POST",
        body: JSON.stringify({ action: "send", subject, previewText, contentHtml }),
      });
      setNote(`Newsletter sent to ${subscribers} subscriber${subscribers === 1 ? "" : "s"}.`);
      setSubject("");
      setPreviewText("");
      setContentHtml("");
      setEditorKey((k) => k + 1);
      await refresh();
    } catch (e) {
      setError(e instanceof AdminFetchError ? e.message : "Send failed.");
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setNote(null);
    setError(null);
    setBusy("sync");
    try {
      const r = await adminFetch<{ synced: number; total: number }>("/api/admin/newsletter", {
        method: "POST",
        body: JSON.stringify({ action: "sync" }),
      });
      setNote(`Synced ${r.synced}/${r.total} subscribers into the Resend audience.`);
    } catch (e) {
      setError(e instanceof AdminFetchError ? e.message : "Sync failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Newsletter</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? "Loading…" : `${subscribers} subscriber${subscribers === 1 ? "" : "s"}`}
          </p>
        </div>
        <button onClick={sync} disabled={busy !== null} className={btnGhost} title="Mirror all subscribers into the Resend audience">
          {busy === "sync" ? "Syncing…" : "Sync audience"}
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {note && <p className="text-sm text-emerald-600">{note}</p>}

      <Card className="p-5">
        <div>
          <label className="text-xs uppercase tracking-wider text-slate-400">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What's new under the Bortle 1 sky"
            className={`${input} mt-1 w-full text-base`}
          />
        </div>

        <div className="mt-4">
          <label className="text-xs uppercase tracking-wider text-slate-400">Preview text</label>
          <input
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Short snippet shown in the inbox, next to the subject"
            className={`${input} mt-1 w-full`}
          />
        </div>

        <div className="mt-4">
          <label className="text-xs uppercase tracking-wider text-slate-400">Body</label>
          <div className="mt-1">
            <RichTextEditor key={editorKey} initialHtml="" onChange={setContentHtml} />
          </div>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@example.com"
            className={`${input} w-56`}
          />
          <button onClick={sendTest} disabled={busy !== null} className={btnGhost}>
            {busy === "test" ? "Sending…" : "Send test"}
          </button>
        </div>
        <button onClick={sendToAll} disabled={busy !== null} className={btnPrimary}>
          {busy === "send" ? "Sending…" : `Send to ${subscribers} subscriber${subscribers === 1 ? "" : "s"}`}
        </button>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-slate-700">History</h2>
        {campaigns.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No newsletters sent yet.</p>
        ) : (
          <Card className="mt-2 divide-y divide-slate-200">
            {campaigns.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{c.subject}</p>
                  <p className="text-xs text-slate-400">
                    {fmtDate(c.createdAt)} · {c.authorEmail}
                    {c.recipientCount != null ? ` · ${c.recipientCount} recipients` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-[4px] px-2 py-0.5 text-xs font-medium ${
                    c.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}
                  title={c.error ?? undefined}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
