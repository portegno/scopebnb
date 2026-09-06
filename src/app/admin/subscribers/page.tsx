"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/admin/ui";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";

/**
 * Who gets the newsletter.
 *
 * This page used to be the whole newsletter: a composer, a draft queue, a
 * preview, a history and a Send button. **All of that moved to the Portegno
 * building.** Writing an edition, laying it out, asking design for a change and
 * sending it are the team's work, and the team's work is looked at in the
 * building, next to the clippings and the plans. Keeping a second place to do
 * it here meant a second source of truth for the same email.
 *
 * What stays is what is genuinely the business's and does not travel: the list
 * of people who gave us their address. They subscribe on the site, so they are
 * counted on the site.
 */
const btnGhost =
  "rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

type Subscriber = {
  email: string;
  source: string;
  discountRedeemed: boolean;
  subscribedAt: { seconds: number } | null;
};

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

export default function SubscribersAdminPage() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<{ subscribers: Subscriber[] }>("/api/admin/newsletter/subscribers")
      .then((d) => setSubs(d.subscribers))
      .catch((e) => setError(e instanceof AdminFetchError ? e.message : "Could not load subscribers."))
      .finally(() => setLoaded(true));
  }, []);

  function exportCsv() {
    const rows = [
      ["email", "source", "discount_redeemed", "subscribed_at"],
      ...subs.map((s) => [
        s.email,
        s.source,
        String(s.discountRedeemed),
        s.subscribedAt ? new Date(s.subscribedAt.seconds * 1000).toISOString() : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "newsletter-subscribers.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Subscribers</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loaded ? `${subs.length} subscriber${subs.length === 1 ? "" : "s"}` : "Loading…"}
          </p>
        </div>
        {subs.length > 0 && (
          <button onClick={exportCsv} className={btnGhost}>
            Export CSV
          </button>
        )}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Card className="p-5">
        <p className="text-sm text-slate-500">
          Newsletters are written, laid out and sent from the Portegno building, under Clippings →
          Newsletter. This page is the audience, not the mail.
        </p>
      </Card>

      <Card className="p-5">
        {!loaded ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : subs.length === 0 ? (
          <p className="text-sm text-slate-400">No subscribers yet.</p>
        ) : (
          <div className="max-h-[32rem] overflow-auto rounded-[4px] border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Subscribed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {subs.map((s) => (
                  <tr key={s.email} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-800">{s.email}</td>
                    <td className="px-3 py-2 text-slate-500">{s.source}</td>
                    <td className="px-3 py-2 text-slate-500">{fmtDate(s.subscribedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
