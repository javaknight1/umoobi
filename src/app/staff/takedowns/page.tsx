import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionNotice, closeNotice, recordCounterNotice } from "./actions";

export const metadata: Metadata = { title: "Takedowns · Staff", robots: { index: false } };

export default function TakedownsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="font-display text-4xl">Copyright takedowns</h1>
      <p className="mt-1 text-sm text-muted">
        Valid notice → take down and strike. Counter-notice → restore after 10 business days unless the claimant files suit.
      </p>
      <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </main>
  );
}

async function List() {
  await requireStaff("/staff/takedowns");
  const { data } = await createAdminClient()
    .from("takedowns")
    .select("*, films(title, slug)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!data?.length) return <p className="card mt-8 text-muted">No notices.</p>;
  return (
    <ul className="mt-8 grid gap-4">
      {data.map((t) => {
        const film = t.films as unknown as { title: string; slug: string } | null;
        return (
          <li key={t.id} className="card grid gap-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-medium">
                {film ? film.title : "Unmatched link"} <span className="text-muted">· {t.status}</span>
              </p>
              <p className="text-muted">{t.created_at.slice(0, 10)}</p>
            </div>
            <p>
              <span className="text-muted">From</span> {t.claimant_name} ({t.claimant_email}) ·{" "}
              <a href={t.infringing_url} className="underline">{t.infringing_url}</a>
            </p>
            <p className="text-muted">{t.work_described}</p>
            {t.restore_after ? <p>Restores on {t.restore_after} unless the claimant files suit.</p> : null}
            <div className="flex flex-wrap gap-2">
              {t.status === "received" ? (
                <>
                  <form action={actionNotice}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="btn-primary">Valid: take down and strike</button>
                  </form>
                  <form action={closeNotice}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="outcome" value="reject" />
                    <button className="btn-ghost">Invalid notice</button>
                  </form>
                </>
              ) : null}
              {t.status === "actioned" ? (
                <form action={recordCounterNotice} className="grid w-full gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <label className="label" htmlFor={`cn-${t.id}`}>Counter-notice received</label>
                  <textarea id={`cn-${t.id}`} name="counter_notice" rows={2} className="field" />
                  <button className="btn-ghost justify-self-start">Record counter-notice</button>
                </form>
              ) : null}
              {t.status === "counter_received" ? (
                <form action={closeNotice}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="btn-ghost">Claimant filed suit: keep down</button>
                </form>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
