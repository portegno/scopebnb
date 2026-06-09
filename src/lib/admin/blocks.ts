import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const COL = "blockedNights";

export type NightBlock = { date: string; blockedBy: string; note: string };

const YMD = /^\d{4}-\d{2}-\d{2}$/;
export const isYmd = (v: unknown): v is string => typeof v === "string" && YMD.test(v);

/** Block a night (doc id = the date, so one block per night). */
export async function blockNight(date: string, blockedBy: string, note = "") {
  await adminDb.doc(`${COL}/${date}`).set(
    { date, blockedBy, note, createdAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

export async function updateBlockNote(date: string, note: string) {
  await adminDb.doc(`${COL}/${date}`).set({ note }, { merge: true });
}

export async function unblockNight(date: string) {
  await adminDb.doc(`${COL}/${date}`).delete();
}

/** All blocked nights (small collection). */
export async function listBlocks(): Promise<NightBlock[]> {
  const snap = await adminDb.collection(COL).get();
  return snap.docs.map((d) => ({
    date: d.id,
    blockedBy: d.data().blockedBy ?? "",
    note: d.data().note ?? "",
  }));
}
