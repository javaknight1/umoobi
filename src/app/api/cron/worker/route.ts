import { NextResponse } from "next/server";
import { cronAuthorized, runJobs } from "@/lib/jobs";

/**
 * Drains the job queue (D48). Called every minute by Vercel Cron, or by `pnpm worker` locally.
 * `?kind=check_film` (repeatable) limits the run to some job kinds.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return new NextResponse("Unauthorized", { status: 401 });
  const kinds = new URL(request.url).searchParams.getAll("kind");
  let total = 0;
  let failed = 0;
  const started = Date.now();
  // Keep draining for up to ~45 s so one invocation clears bursts.
  while (Date.now() - started < 45_000) {
    const r = await runJobs(10, kinds);
    total += r.ran;
    failed += r.failed;
    if (r.ran === 0) break;
  }
  return NextResponse.json({ ran: total, failed });
}
