import type { Metadata } from "next";
import { Suspense } from "react";
import { requireOwnFilm } from "@/lib/auth/filmmaker";
import { bpsToPercent } from "@/lib/credits/shares";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreditsEditor } from "./credits-editor";

export const metadata: Metadata = { title: "Credits · Studio" };

export default function CreditsPage({ params }: PageProps<"/studio/films/[id]/credits">) {
  return (
    <Suspense fallback={<div className="card h-64" />}>
      <Body params={params} />
    </Suspense>
  );
}

async function Body({ params }: Pick<PageProps<"/studio/films/[id]/credits">, "params">) {
  const { id } = await params;
  const { account, film } = await requireOwnFilm(id);
  // People columns like created_by_account and claim state come from the admin client:
  // the editor needs them to decide who can be invited.
  const { data: credits } = await createAdminClient()
    .from("credits")
    .select("role, billing_order, share_bps, people(id, name, slug, claimed_by, created_by_account)")
    .eq("film_id", film.id)
    .order("billing_order");

  const rows = (credits ?? [])
    .filter((c) => c.people)
    .map((c) => ({
      person: {
        id: c.people!.id,
        name: c.people!.name,
        slug: c.people!.slug,
        claimed: !!c.people!.claimed_by,
        canInvite: !c.people!.claimed_by && c.people!.created_by_account === account.id,
      },
      role: c.role,
      share: c.share_bps ? bpsToPercent(c.share_bps) : "",
    }));

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div className="grid gap-4">
        <div>
          <h2 className="font-display text-3xl">Credits</h2>
          <p className="mt-1 max-w-2xl text-muted">List your cast and crew. Shares must total 100%, or leave them all empty.</p>
        </div>
        <CreditsEditor filmId={film.id} initial={rows} />
      </div>
      <aside className="grid gap-5">
        <section className="sidebar rounded-2xl p-7">
          <h2 className="font-display text-2xl">Revenue splits are saved, not paid yet</h2>
          <p className="mt-3 text-fg/85">
            Shares you set here are stored with the film. Automatic payouts to your cast and crew switch on in a later
            release, and everyone with a share will be asked to connect a payout account.
          </p>
        </section>
        <section className="card grid gap-3">
          <h2 className="font-display text-xl">How credit pages work</h2>
          <p className="text-muted">
            Each person gets a public page listing their films. When they claim it, they can add a photo and bio. Viewers can
            follow them.
          </p>
          {rows.some((r) => !r.person.claimed) ? (
            <p className="rounded-xl bg-surface-2 p-3 text-sm">
              {rows.filter((r) => !r.person.claimed).length} credited{" "}
              {rows.filter((r) => !r.person.claimed).length === 1 ? "person hasn't" : "people haven't"} claimed their page yet. Use
              &ldquo;Invite to claim&rdquo; in the list.
            </p>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
