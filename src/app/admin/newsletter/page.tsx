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

type Borrador = Campaign & { contentHtml: string; piezas: string[] };
type Subscriber = { email: string; source: string; discountRedeemed: boolean; subscribedAt: { seconds: number } | null };

export default function NewsletterAdminPage() {
  const { user } = useAuth();

  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [testEmail, setTestEmail] = useState("");
  // Remounts the editor to clear it after a successful send.
  const [editorKey, setEditorKey] = useState(0);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  // Ediciones que el equipo de Portegno ya escribio y esperan que alguien las
  // lea y las mande. Se cargan al compositor: nadie manda un mail salvo una
  // persona apretando Send acá.
  const [drafts, setDrafts] = useState<Borrador[]>([]);
  const [fromDraft, setFromDraft] = useState<string | null>(null);
  // Dos solapas y un compositor que aparece. Antes estaba todo apilado en una
  // columna: suscriptores, borradores, compositor e historial, así que para ver
  // qué se había mandado había que pasar por encima de un formulario vacío.
  const [tab, setTab] = useState<"newsletters" | "subscribers">("newsletters");
  const [composing, setComposing] = useState(false);
  // La edición que escribió el equipo se **mira**, no se edita. Su HTML es HTML
  // de mail de verdad (tablas, estilos en línea) y el compositor lo aplastaría:
  // TipTap parsea contra su propio esquema y tira todo lo que no conoce.
  const [viendo, setViendo] = useState<Borrador | null>(null);
  const [html, setHtml] = useState("");
  // Un mail se abre más en el teléfono que en la compu, y ahí la fila de dos
  // columnas es lo primero que se rompe: la miniatura y el texto no entran al
  // lado. Ver los dos anchos es la única forma de saberlo antes de mandarlo.
  const [ancho, setAncho] = useState<"desktop" | "mobile">("desktop");
  // **Dos formas de tocar lo mismo, y no son equivalentes.** El HTML es la
  // verdad; el visual es cómodo y tiene un costo: TipTap parsea contra su propio
  // esquema y tira las tablas y los estilos en línea, o sea la maquetación que
  // armó diseño. Se puede mirar en visual sin romper nada; se rompe al escribir.
  const [modo, setModo] = useState<"html" | "visual">("html");
  const [avisado, setAvisado] = useState(false);

  function newDraft() {
    setSubject("");
    setPreviewText("");
    setContentHtml("");
    setFromDraft(null);
    setEditorKey((k) => k + 1);
    setNote(null);
    setComposing(true);
  }

  function openDraft(d: Borrador) {
    setError(null);
    setNote(null);
    setViendo(d);
    setFromDraft(d.id);
    setSubject(d.subject);
    setPreviewText(d.previewText);
    setContentHtml(d.contentHtml);
  }

  async function saveDraft() {
    if (!fromDraft) return;
    setBusy("save");
    try {
      await adminFetch("/api/admin/newsletter", {
        method: "POST",
        body: JSON.stringify({ action: "save", draftId: fromDraft, subject, previewText, contentHtml }),
      });
      setNote("Saved.");
      await refresh();
    } catch (e) {
      setError(e instanceof AdminFetchError ? e.message : "Could not save it.");
    } finally {
      setBusy(null);
    }
  }
  const [subscribers, setSubscribers] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "test" | "send" | "sync" | "discard" | "save">(null);
  const [note, setNote] = useState<string | null>(null);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [subsLoaded, setSubsLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    adminFetch<{ campaigns: Campaign[]; drafts: Borrador[]; subscribers: number }>("/api/admin/newsletter")
      .then((d) => {
        setCampaigns(d.campaigns);
        setDrafts(d.drafts ?? []);
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

    adminFetch<{ subscribers: Subscriber[] }>("/api/admin/newsletter/subscribers")
      .then((d) => setSubs(d.subscribers))
      .catch(() => {})
      .finally(() => setSubsLoaded(true));
  }, [user]);

  // **El preview sigue a lo que escribís, no a lo guardado.** Se espera medio
  // segundo: pedirlo por tecla serían cien llamadas para ver un cambio.
  useEffect(() => {
    if (!viendo) return;
    const t = setTimeout(() => {
      adminFetch<{ html: string }>("/api/admin/newsletter", {
        method: "POST",
        body: JSON.stringify({ action: "preview", contentHtml, previewText }),
      })
        .then((r) => setHtml(r.html))
        .catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [viendo, contentHtml, previewText]);

  async function refresh() {
    const d = await adminFetch<{ campaigns: Campaign[]; drafts: Borrador[]; subscribers: number }>("/api/admin/newsletter");
    setCampaigns(d.campaigns);
    setDrafts(d.drafts ?? []);
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
        body: JSON.stringify({ action: "send", subject, previewText, contentHtml, draftId: fromDraft }),
      });
      setNote(`Newsletter sent to ${subscribers} subscriber${subscribers === 1 ? "" : "s"}.`);
      setSubject("");
      setPreviewText("");
      setContentHtml("");
      setFromDraft(null);
      setEditorKey((k) => k + 1);
      setComposing(false);
      setViendo(null);
      await refresh();
    } catch (e) {
      setError(e instanceof AdminFetchError ? e.message : "Send failed.");
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    const rows = [
      ["email", "source", "subscribed_at"],
      ...subs.map((s) => [
        s.email,
        s.source,
        s.subscribedAt ? new Date(s.subscribedAt.seconds * 1000).toISOString() : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function discard(d: Borrador) {
    if (!confirm(`Discard "${d.subject}"? The team would have to write it again.`)) return;
    setNote(null);
    setError(null);
    setBusy("discard");
    try {
      await adminFetch("/api/admin/newsletter", {
        method: "POST",
        body: JSON.stringify({ action: "discard", draftId: d.id }),
      });
      // If it was the one loaded in the composer, the composer no longer points
      // at anything: clearing the link avoids sending and then trying to drop a
      // draft that is already gone.
      if (fromDraft === d.id) { setFromDraft(null); setViendo(null); }
      setNote("Draft discarded.");
      await refresh();
    } catch (e) {
      setError(e instanceof AdminFetchError ? e.message : "Could not discard it.");
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
        {tab === "subscribers" && (
          <button onClick={sync} disabled={busy !== null} className={btnGhost} title="Mirror all subscribers into the Resend audience">
            {busy === "sync" ? "Syncing…" : "Sync audience"}
          </button>
        )}
        {tab === "newsletters" && !composing && !viendo && (
          <button onClick={newDraft} className={btnPrimary}>
            New newsletter
          </button>
        )}
      </div>

      {/* Las solapas separan dos cosas que se miran en momentos distintos: qué
          se mandó y a quién se le manda. */}
      <div className="flex gap-1">
        {([
          ["newsletters", `Newsletters${drafts.length ? ` (${drafts.length} draft${drafts.length === 1 ? "" : "s"})` : ""}`],
          ["subscribers", `Subscribers${subsLoaded ? ` (${subs.length})` : ""}`],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-[4px] px-3 py-1.5 text-sm transition-colors ${
              tab === id ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {note && <p className="text-sm text-emerald-600">{note}</p>}

      {tab === "subscribers" && (
        <>
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Subscribers{subsLoaded ? ` (${subs.length})` : ""}
          </h2>
          {subs.length > 0 && (
            <button onClick={exportCsv} className={btnGhost}>
              Export CSV
            </button>
          )}
        </div>
        {!subsLoaded ? (
          <p className="mt-2 text-sm text-slate-400">Loading…</p>
        ) : subs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No subscribers yet.</p>
        ) : (
          <div className="mt-3 max-h-80 overflow-auto rounded-[4px] border border-slate-200">
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
        </>
      )}

      {tab === "newsletters" && !composing && !viendo && (
        <>
          {drafts.length > 0 ? (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-800">Written by the team</h2>
          <p className="mt-1 text-xs text-slate-500">
            Load one into the composer, read it, and send it yourself. Nothing goes out on its own.
          </p>
          <ul className="mt-3 space-y-2">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-800">{d.subject}</p>
                  <p className="truncate text-xs text-slate-500">{d.previewText}</p>
                  {d.piezas.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {d.piezas.length} post{d.piezas.length === 1 ? "" : "s"}: {d.piezas.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                <button
                  className={btnGhost}
                  onClick={() => openDraft(d)}
                >
                  Open
                </button>
                <button
                  className={btnGhost}
                  disabled={busy !== null}
                  onClick={() => discard(d)}
                  title="Throw it away. The team would have to write it again."
                >
                  Discard
                </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
          ) : (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-slate-800">Written by the team</h2>
              <p className="mt-1 text-xs text-slate-500">
                Nothing waiting. When marketing writes an edition it lands here, and you read it
                and send it yourself.
              </p>
            </Card>
          )}

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
        </>
      )}

      {tab === "newsletters" && viendo && (
        <>
          <Card className="p-5">
            <label className="text-xs uppercase tracking-wider text-slate-400">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)}
                   className={`${input} mt-1 w-full text-base`} />
            <label className="mt-4 block text-xs uppercase tracking-wider text-slate-400">Preview text</label>
            <input value={previewText} onChange={(e) => setPreviewText(e.target.value)}
                   className={`${input} mt-1 w-full`} />
          </Card>

          {/* Dos áreas: lo que escribís y lo que llega. El HTML de un mail no
              pasa por un WYSIWYG sin perder la mitad, así que se edita como
              texto; lo que lo hace usable es que el de al lado sea el mail de
              verdad y no una aproximación. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="flex flex-col p-0">
              <div className="flex items-center justify-between gap-2 px-4 py-2">
                <span className="text-xs uppercase tracking-wider text-slate-400">Source</span>
                <div className="flex gap-1">
                  {(["html", "visual"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        if (m === "visual") setEditorKey((k) => k + 1);
                        setModo(m);
                      }}
                      className={`rounded-[4px] px-2 py-1 text-xs transition-colors ${
                        modo === m ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {m === "html" ? "HTML" : "Visual"}
                    </button>
                  ))}
                </div>
              </div>
              {modo === "html" ? (
                <textarea
                  value={contentHtml}
                  onChange={(e) => setContentHtml(e.target.value)}
                  spellCheck={false}
                  className="h-[65vh] w-full resize-none rounded-b-[4px] border-0 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800 outline-none"
                />
              ) : (
                <div className="h-[65vh] overflow-auto p-4">
                  {/* El aviso aparece una sola vez y recién cuando podría doler:
                      mirar en visual no rompe nada, escribir sí. */}
                  {!avisado && (
                    <p className="mb-3 rounded-[4px] bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Editing here drops what the editor does not understand: the two column blocks,
                      Mike&#39;s tip and the inline styles. Fine for fixing a line; not for keeping
                      the layout.
                    </p>
                  )}
                  <RichTextEditor
                    key={editorKey}
                    initialHtml={contentHtml}
                    onChange={(h) => {
                      setAvisado(true);
                      setContentHtml(h);
                    }}
                  />
                </div>
              )}
            </Card>
            <Card className="flex flex-col overflow-hidden p-0">
              <div className="flex items-center justify-between gap-2 px-4 py-2">
                <span className="text-xs uppercase tracking-wider text-slate-400">
                  What lands in the inbox
                </span>
                <div className="flex gap-1">
                  {(["desktop", "mobile"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAncho(a)}
                      className={`rounded-[4px] px-2 py-1 text-xs transition-colors ${
                        ancho === a ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {a === "desktop" ? "Desktop" : "Mobile"}
                    </button>
                  ))}
                </div>
              </div>
              {/* iframe y no div: el mail trae su propio <style> y su propio
                  <body>, y metido en la página sus reglas se mezclan con las del
                  admin. Ahí lo que se ve deja de ser lo que se manda. */}
              {/* En mobile se angosta el iframe, no se escala: escalarlo mostraría
                  el mismo layout más chico, que es justo lo que no se quiere ver.
                  A 375px el mail reflowea de verdad, como en el teléfono. */}
              <div className={ancho === "mobile" ? "flex h-[65vh] justify-center overflow-auto bg-slate-200 py-3" : "h-[65vh]"}>
                <iframe
                  title="Preview"
                  srcDoc={html}
                  sandbox=""
                  className={`border-0 bg-white ${ancho === "mobile" ? "h-full w-[375px] shrink-0 rounded-[4px] shadow" : "h-full w-full"}`}
                />
              </div>
            </Card>
          </div>

          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
                     placeholder="you@example.com" className={`${input} w-56`} />
              <button onClick={sendTest} disabled={busy !== null} className={btnGhost}>
                {busy === "test" ? "Sending…" : "Send test"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setViendo(null)} disabled={busy !== null} className={btnGhost}>
                Back
              </button>
              <button onClick={saveDraft} disabled={busy !== null} className={btnGhost}>
                {busy === "save" ? "Saving…" : "Save"}
              </button>
              <button onClick={() => discard(viendo)} disabled={busy !== null} className={btnGhost}>
                Discard
              </button>
              <button onClick={sendToAll} disabled={busy !== null} className={btnPrimary}>
                {busy === "send" ? "Sending…" : `Send to ${subscribers} subscriber${subscribers === 1 ? "" : "s"}`}
              </button>
            </div>
          </Card>
        </>
      )}

      {tab === "newsletters" && composing && (
        <>
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
            {/* `initialHtml` estaba fijo en "": el editor no es controlado, sólo lee
                esa prop al montarse, así que cargar un borrador ponía el asunto y el
                preview y dejaba el cuerpo vacío. Se pasa el estado, y `editorKey`
                fuerza el remonte cuando cambia lo que hay que mostrar. */}
            <RichTextEditor key={editorKey} initialHtml={contentHtml} onChange={setContentHtml} />
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
        <button onClick={() => setComposing(false)} disabled={busy !== null} className={btnGhost}>
          Cancel
        </button>
        <button onClick={sendToAll} disabled={busy !== null} className={btnPrimary}>
          {busy === "send" ? "Sending…" : `Send to ${subscribers} subscriber${subscribers === 1 ? "" : "s"}`}
        </button>
      </Card>
        </>
      )}
    </div>
  );
}
