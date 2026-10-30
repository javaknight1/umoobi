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
    <div className="grid gap-4">
      <div>
        <h1 className="font-display text-4xl">Credits</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          List your cast and crew. Everyone gets a public page they can claim. Record each person&apos;s revenue share now;
          automatic split payouts start in a later release (D15). Shares must total 100%, or leave them all empty.
        </p>
      </div>
      <CreditsEditor filmId={film.id} initial={rows} />
    </div>
  );
}
