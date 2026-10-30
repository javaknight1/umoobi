import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { handlers } from "./handlers";

export type JobPayload = Record<string, unknown>;
export type Handler = (payload: JobPayload) => Promise<void>;

export async function enqueue(kind: string, payload: JobPayload = {}, runAfter?: Date) {
  const { error } = await createAdminClient()
    .from("jobs")
    .insert({ kind, payload: payload as never, ...(runAfter ? { run_after: runAfter.toISOString() } : {}) });
  if (error) throw new Error(`enqueue ${kind}: ${error.message}`);
}

/**
 * Claims and runs up to `limit` jobs, optionally only some kinds. Unknown kinds fail so they
 * show up in staff tools.
 */
export async function runJobs(limit = 10, kinds?: string[]): Promise<{ ran: number; failed: number }> {
  const db = createAdminClient();
  await db.rpc("requeue_stale_jobs");
  const { data: jobs, error } = kinds?.length
    ? await db.rpc("claim_jobs_of", { p_kinds: kinds, p_limit: limit })
    : await db.rpc("claim_jobs", { p_limit: limit });
  if (error) throw new Error(`claim_jobs: ${error.message}`);
  let failed = 0;
  for (const job of jobs ?? []) {
    const handler = handlers[job.kind];
    try {
      if (!handler) throw new Error(`No handler for job kind "${job.kind}"`);
      await handler((job.payload ?? {}) as JobPayload);
      await db.rpc("finish_job", { p_id: job.id });
    } catch (err) {
      failed++;
      await db.rpc("finish_job", { p_id: job.id, p_error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { ran: jobs?.length ?? 0, failed };
}

/** Cron routes authenticate with `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this). */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}
