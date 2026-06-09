import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { AdminError, requireAdmin, requirePermission } from "@/lib/admin/auth";
import { STATUS_TRANSITIONS, isBookingStatus, type BookingStatus } from "@/lib/bookings/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toSeconds = (v: unknown) => (v instanceof Timestamp ? { seconds: v.seconds } : null);

function serialize(id: string, d: FirebaseFirestore.DocumentData) {
  return {
    ...d,
    id,
    createdAt: toSeconds(d.createdAt),
    statusUpdatedAt: toSeconds(d.statusUpdatedAt),
    // Explicit nulls so the client clears these on release/unreview (a merge
    // wouldn't drop a stale value if the key were simply absent).
    assignedTo: d.assignedTo ?? null,
    assignedAt: toSeconds(d.assignedAt),
    reviewedBy: d.reviewedBy ?? null,
    reviewedAt: toSeconds(d.reviewedAt),
  };
}

type Body =
  | { action: "set-status"; status?: unknown }
  | { action: "claim" | "release" | "review" | "unreview" };

/**
 * PATCH /api/admin/orders/[id] — admin order actions. Body:
 *   { action: "set-status", status }  — move through the workflow (validated)
 *   { action: "claim" | "release" }   — take / release the order (assignedTo)
 *   { action: "review" | "unreview" } — mark / unmark as reviewed
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await requireAdmin(req);
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Body;

    const ref = adminDb.doc(`bookings/${id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new AdminError(404, "Booking not found");

    let update: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
    switch (body.action) {
      case "set-status": {
        requirePermission(identity, "orders.status");
        const next = (body as { status?: unknown }).status;
        if (!isBookingStatus(next)) throw new AdminError(400, "Invalid status");
        const current = (snap.data()?.status ?? "requested") as BookingStatus;
        if (next !== current && !STATUS_TRANSITIONS[current].includes(next)) {
          throw new AdminError(422, `Cannot move from ${current} to ${next}`);
        }
        update = { status: next, statusUpdatedAt: FieldValue.serverTimestamp(), statusUpdatedBy: identity.email };
        break;
      }
      case "claim":
        requirePermission(identity, "orders.claim");
        update = { assignedTo: identity.email, assignedAt: FieldValue.serverTimestamp() };
        break;
      case "release":
        requirePermission(identity, "orders.claim");
        update = { assignedTo: FieldValue.delete(), assignedAt: FieldValue.delete() };
        break;
      case "review":
        requirePermission(identity, "orders.review");
        update = { reviewedBy: identity.email, reviewedAt: FieldValue.serverTimestamp() };
        break;
      case "unreview":
        requirePermission(identity, "orders.review");
        update = { reviewedBy: FieldValue.delete(), reviewedAt: FieldValue.delete() };
        break;
      default:
        throw new AdminError(400, "Unknown action");
    }

    await ref.update(update);
    const updated = await ref.get();
    return NextResponse.json({ order: serialize(id, updated.data() ?? {}) });
  } catch (e) {
    if (e instanceof AdminError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[admin] PATCH order error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
