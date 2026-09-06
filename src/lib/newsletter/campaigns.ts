import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const COL = "newsletterCampaigns";

// "borrador" es el estado que faltaba. El panel mandaba apenas se apretaba el
// boton, asi que no habia donde dejar una edicion escrita esperando, y sin eso
// el equipo de Portegno no podia escribirla: mandar un mail es lo mas
// irreversible que hay, y un borrador es lo que permite que lo escriba uno y lo
// mande otro.
export type CampaignStatus = "sent" | "failed" | "borrador";

export type Campaign = {
  id: string;
  subject: string;
  previewText: string;
  status: CampaignStatus;
  resendBroadcastId: string | null;
  recipientCount: number | null;
  authorEmail: string;
  error: string | null;
  createdAt: { seconds: number } | null;
};

const toSeconds = (v: unknown) => (v instanceof Timestamp ? { seconds: v.seconds } : null);

function serialize(id: string, d: FirebaseFirestore.DocumentData): Campaign {
  return {
    id,
    subject: d.subject ?? "",
    previewText: d.previewText ?? "",
    status: (d.status as CampaignStatus) ?? "sent",
    resendBroadcastId: d.resendBroadcastId ?? null,
    recipientCount: typeof d.recipientCount === "number" ? d.recipientCount : null,
    authorEmail: d.authorEmail ?? "",
    error: d.error ?? null,
    createdAt: toSeconds(d.createdAt),
  };
}

export type NewCampaign = {
  subject: string;
  previewText: string;
  contentHtml: string;
  status: CampaignStatus;
  resendBroadcastId: string | null;
  recipientCount: number | null;
  authorEmail: string;
  error?: string | null;
};

/** Record a sent (or failed) campaign for the dashboard history. */
export async function recordCampaign(data: NewCampaign): Promise<Campaign> {
  const ref = await adminDb.collection(COL).add({
    ...data,
    error: data.error ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
  const snap = await ref.get();
  return serialize(ref.id, snap.data() ?? {});
}

/**
 * Campaign history, newest first. Drafts are not history: they have not been
 * read by anyone yet, so they belong in the composer, not in the log.
 */
export async function listCampaigns(): Promise<Campaign[]> {
  const snap = await adminDb.collection(COL).orderBy("createdAt", "desc").limit(50).get();
  return snap.docs.map((d) => serialize(d.id, d.data())).filter((c) => c.status !== "borrador");
}

/** Editions written by the team and waiting to be read and sent. */
export type Pedido = { texto: string; respuesta?: string | null; encolado?: number | null };

export async function listDrafts(): Promise<
  (Campaign & { contentHtml: string; piezas: string[]; pedido: Pedido | null })[]
> {
  const snap = await adminDb
    .collection(COL)
    .where("status", "==", "borrador")
    .limit(20)
    .get();
  return snap.docs
    .map((d) => ({
      ...serialize(d.id, d.data()),
      contentHtml: d.data().contentHtml ?? "",
      // Which posts it covers, so the list says what is inside without having to
      // load it into the composer first.
      piezas: Array.isArray(d.data().piezas) ? (d.data().piezas as string[]) : [],
      pedido: (d.data().pedido as Pedido) ?? null,
    }))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
}

/** Save changes to a draft without sending it. */
export async function updateDraft(
  id: string,
  patch: { subject: string; previewText: string; contentHtml: string },
): Promise<void> {
  await adminDb.collection(COL).doc(id).update(patch);
}

/**
 * Leave a change request on a draft for the design agent to pick up.
 *
 * Overwrites whatever was there: a second ask replaces the first, because two
 * pending requests on the same edition is a way to get half of each.
 */
export async function askDesign(id: string, texto: string): Promise<void> {
  await adminDb.collection(COL).doc(id).update({
    pedido: { texto, cuando: FieldValue.serverTimestamp() },
  });
}

/** A draft stops being a draft when it goes out: it is dropped, not kept twice. */
export async function dropDraft(id: string): Promise<void> {
  await adminDb.collection(COL).doc(id).delete();
}
