import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const COL = "newsletterCampaigns";

export type CampaignStatus = "sent" | "failed";

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

/** Campaign history, newest first. */
export async function listCampaigns(): Promise<Campaign[]> {
  const snap = await adminDb.collection(COL).orderBy("createdAt", "desc").limit(50).get();
  return snap.docs.map((d) => serialize(d.id, d.data()));
}
