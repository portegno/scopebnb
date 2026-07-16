import "server-only";

import { randomUUID } from "crypto";
import { adminDb, adminBucket } from "@/lib/firebase/admin";
import type { SessionReport } from "./report";
import { getSessionReport } from "@/data/sessions";
import { stretchFitsLight, encodeJpeg } from "./fitsToJpg";

/**
 * Server-side persistence for ingested session reports. Reports produced by the
 * ingest pipeline (parse → assess → narrate) are stored here; the public report
 * page reads them back. Demo reports stay in code (src/data/sessions.ts) and are
 * used as a fallback, so both real and demo ids resolve at /report/[id].
 */
const COLLECTION = "sessionReports";

export async function saveSessionReport(report: SessionReport): Promise<void> {
  // Firestore rejects `undefined`; the JSON round-trip drops undefined fields
  // (e.g. an absent target.catalog) recursively. Report is JSON-serializable.
  const clean = JSON.parse(JSON.stringify(report)) as SessionReport;
  await adminDb.collection(COLLECTION).doc(report.id).set(clean, { merge: true });
}

/**
 * Store the session preview JPEG (the auto-stretched light) in Storage and
 * return a public download URL, same scheme as blog images. Stored under a
 * stable path per report id so re-ingesting overwrites in place.
 */
export async function saveSessionImage(id: string, jpeg: Buffer, variant?: string): Promise<string> {
  const token = randomUUID();
  const path = `sessions/${id}${variant ? `-${variant}` : ""}.jpg`;
  await adminBucket.file(path).save(jpeg, {
    contentType: "image/jpeg",
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${adminBucket.name}/o/${encodeURIComponent(
    path,
  )}?alt=media&token=${token}`;
}

/** Where the uploader PUTs the raw light before we process it. */
const rawLightPath = (id: string) => `sessions/incoming/${id}.fits`;

/**
 * A short-lived v4 signed URL to PUT one raw light FITS straight to Storage.
 * This bypasses the request-body size limit (a full sub is tens of MB); the
 * app never receives the FITS as a request body.
 */
export async function signLightUpload(id: string): Promise<{ uploadUrl: string; path: string }> {
  const path = rawLightPath(id);
  const [uploadUrl] = await adminBucket.file(path).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 30 * 60 * 1000,
    contentType: "application/octet-stream",
  });
  return { uploadUrl, path };
}

/**
 * Read the uploaded raw light, auto-stretch it to a JPEG, store it, and patch
 * the report's `finalImage`. Deletes the raw FITS afterwards. Returns the public
 * image URL, or null if no light was uploaded for this id.
 */
export async function buildImageFromUploadedLight(id: string): Promise<string | null> {
  const raw = adminBucket.file(rawLightPath(id));
  const [exists] = await raw.exists();
  if (!exists) return null;

  const snap = await adminDb.collection(COLLECTION).doc(id).get();
  const report = snap.exists ? (snap.data() as SessionReport) : null;
  const filter = report?.capture.filter ?? "";

  const [fits] = await raw.download();
  // Debayer once; reuse it as the mono source if the sensor is monochrome.
  const colorImg = stretchFitsLight(fits, { mode: "color" });
  const hasColor = colorImg.channels === 3;
  const monoImg = hasColor ? stretchFitsLight(fits, { mode: "mono" }) : colorImg;

  const enc = (img: typeof monoImg, variant: string) =>
    Promise.all([encodeJpeg(img, 1200, 82), encodeJpeg(img, 3200, 85)]).then(([disp, zoom]) =>
      Promise.all([saveSessionImage(id, disp, variant), saveSessionImage(id, zoom, `${variant}-full`)]).then(
        ([src, zoomSrc]) => ({ label: variant === "mono" ? "Mono" : "Color", src, zoomSrc }),
      ),
    );

  const mono = await enc(monoImg, "mono");
  const color = hasColor ? await enc(colorImg, "color") : null;

  // Narrowband defaults to mono (the luminance is the honest read); broadband
  // color defaults to the debayered RGB. The toggle lets the client switch.
  const narrowband = /extreme|enhance|ultimate|duo|narrow|\bha\b|oiii|sii|\bnb\b|antlia/i.test(filter);
  const renders = color ? (narrowband ? [mono, color] : [color, mono]) : undefined;
  const def = renders ? renders[0] : mono;

  const finalImage = {
    src: def.src,
    zoomSrc: def.zoomSrc,
    renders,
    caption: report
      ? `${report.target.name} · single ${report.capture.subSeconds}s ${report.capture.filter} sub, auto-stretched`
      : "Single light frame, auto-stretched",
    credit: "Starfront Observatories · your light frame",
  };
  await adminDb.collection(COLLECTION).doc(id).set({ finalImage }, { merge: true });
  await raw.delete().catch(() => {});
  return def.src;
}

/** Firestore first, then the in-code demo fallback. */
export async function loadReport(id: string): Promise<SessionReport | null> {
  const snap = await adminDb.collection(COLLECTION).doc(id).get();
  if (snap.exists) return snap.data() as SessionReport;
  return getSessionReport(id);
}
