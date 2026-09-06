import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { listSubscribers } from "@/lib/newsletter/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/newsletter/subscribers — the full newsletter subscriber list. */
export const GET = withAdmin(async () => {
  const subscribers = await listSubscribers();
  return NextResponse.json({ subscribers });
}, "newsletter.manage");
