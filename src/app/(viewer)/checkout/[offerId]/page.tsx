import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Poster } from "@/components/brand";
import { requireUser } from "@/lib/auth/session";
import { rentalWindowLabel } from "@/lib/library/format";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage({ params, searchParams }: PageProps<"/checkout/[offerId]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <Suspense fallback={<div className="card h-96" />}>
        <Checkout params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/**
 * Mockup 11, adapted to Stripe-hosted Checkout (D43): the summary and the license
 * acknowledgment live here; card, Apple Pay and Google Pay are on Stripe's page, which also
 * calculates the sales tax.
 */
async function Checkout({ params, searchParams }: Pick<PageProps<"/checkout/[offerId]">, "params" | "searchParams">) {
  const { offerId } = await params;
  const { canceled } = await searchParams;
  const user = await requireUser(`/checkout/${offerId}`);
  const supabase = await createClient();
  const { data: offer } = await supabase
    .from("offers")
    .select(
      "id, kind, price_cents, rental_hours, active, film:films!inner(slug, title, synopsis, runtime_seconds, release_year, poster_url, ai_generated, account:filmmaker_accounts(display_name))",
    )
    .eq("id", offerId)
    .maybeSingle();
  if (!offer || !offer.active) notFound();
  const film = offer.film;
  const kind = offer.kind as "rent" | "buy";
  const free = offer.price_cents === 0;
  const by = film.account?.display_name ?? null;
  const window = rentalWindowLabel(offer.rental_hours ?? 48);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.05fr]">
      <section className="card flex gap-6 p-6 sm:p-8">
        <div className="w-28 shrink-0 sm:w-40">
          <Poster title={film.title} url={film.poster_url} slug={film.slug} by={by} />
        </div>
        <div className="grid content-start gap-2">
          <p className="text-muted">{kind === "rent" ? "You're renting" : free ? "You're adding" : "You're buying a license to"}</p>
          <h1 className="font-display text-3xl sm:text-4xl">{film.title}</h1>
          <p className="text-muted">
            {[by, film.runtime_seconds ? `${Math.round(film.runtime_seconds / 60)} min` : null].filter(Boolean).join(" · ")}
          </p>
          {film.ai_generated ? <span className="pill w-fit border border-warn/60 text-warn">AI-generated</span> : null}
          <p className="mt-2 text-fg/90">
            {kind === "rent"
              ? `Start within 30 days. Once you press play you have ${window} to finish, on the web or your TV.`
              : "Stream it any time on the web or your TV, for as long as the filmmaker keeps it on Umoobi."}
          </p>
          <Link href={`/f/${film.slug}`} className="mt-2 text-sm text-muted hover:text-fg">
            ← Back to the film
          </Link>
        </div>
      </section>

      <section className="paper grid gap-5 rounded-3xl p-6 sm:p-10">
        <h2 className="font-display text-4xl">Checkout</h2>
        <dl className="grid">
          <div className="flex justify-between border-b border-line py-3">
            <dt>{kind === "rent" ? `Rent (${window})` : free ? "Free short" : "Buy (license)"}</dt>
            <dd>{free ? "Free" : formatCents(offer.price_cents)}</dd>
          </div>
          {!free ? (
            <div className="flex justify-between border-b border-line py-3">
              <dt>Sales tax</dt>
              <dd className="text-muted">Calculated at payment</dd>
            </div>
          ) : null}
          <div className="flex justify-between py-3 font-display text-2xl">
            <dt>Total</dt>
            <dd>{free ? "Free" : `${formatCents(offer.price_cents)} + tax`}</dd>
          </div>
        </dl>
        {canceled ? <p className="text-sm text-warn">Checkout was canceled. You haven&apos;t been charged.</p> : null}
        <CheckoutForm offerId={offer.id} kind={kind} free={free} />
        <p className="text-sm text-muted">Signed in as {user.displayName ?? user.email}.</p>
      </section>
    </div>
  );
}
