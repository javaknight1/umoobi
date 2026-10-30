import { NextResponse } from "next/server";
import { cronAuthorized, enqueue } from "@/lib/jobs";

/**
 * Nightly (09:15 UTC, after US midnight): analytics roll-ups, ledger reconciliation and
 * tier upgrades. On the 1st of the month it also queues monthly payouts (D40).
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return new NextResponse("Unauthorized", { status: 401 });
  const today = new Date();
  const kinds = ["rollup_analytics", "reconcile", "upgrade_tiers", "takedown_restore"];
  if (today.getUTCDate() === 1) kinds.push("monthly_payouts");
  for (const kind of kinds) await enqueue(kind, { day: today.toISOString().slice(0, 10) });
  return NextResponse.json({ queued: kinds });
}
