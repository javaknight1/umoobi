import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { retryJob } from "../actions";

export const metadata: Metadata = { title: "Jobs · Staff", robots: { index: false } };

export default function JobsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="font-display text-4xl">Background jobs</h1>
      <p className="mt-1 text-sm text-muted">Checks, refunds, payouts and emails. Failed jobs stop after 5 tries.</p>
      <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
        <Jobs />
      </Suspense>
    </main>
  );
}

async function Jobs() {
  await requireStaff("/staff/jobs");
  // jobs has no RLS policies (service role only); read it after the staff check.
  const db = createAdminClient();
  const [{ data: failed }, { data: recent }] = await Promise.all([
    db.from("jobs").select("*").eq("status", "failed").order("created_at", { ascending: false }).limit(50),
    db.from("jobs").select("*").neq("status", "failed").order("created_at", { ascending: false }).limit(50),
  ]);

  return (
    <div className="mt-8 grid gap-8">
      <section className="grid gap-3">
        <h2 className="font-display text-2xl">Failed ({failed?.length ?? 0})</h2>
        {failed?.length ? (
          <ul className="grid gap-2">
            {failed.map((j) => (
              <li key={j.id} className="card flex flex-wrap items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-mono">
                    #{j.id} {j.kind}
                  </p>
                  <p className="text-muted">{JSON.stringify(j.payload)}</p>
                  <p className="text-bad">{j.last_error}</p>
                </div>
                <form action={retryJob}>
                  <input type="hidden" name="job_id" value={j.id} />
                  <button className="btn-ghost">Retry</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">None.</p>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="font-display text-2xl">Recent</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                {["#", "Kind", "Status", "Tries", "Created"].map((h) => (
                  <th key={h} className="px-4 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recent ?? []).map((j) => (
                <tr key={j.id} className="border-b border-line">
                  <td className="px-4 py-2 font-mono">{j.id}</td>
                  <td className="px-4 py-2">{j.kind}</td>
                  <td className="px-4 py-2">{j.status}</td>
                  <td className="px-4 py-2">{j.attempts}</td>
                  <td className="px-4 py-2">{j.created_at.slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
