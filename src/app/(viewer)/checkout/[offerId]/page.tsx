import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { rentalWindowLabel } from "@/lib/library/format";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage({ params, searchParams }: PageProps<"/checkout/[offerId]">) {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12">
      <Suspense fallback={<div className="card h-96" />}>
        <Checkout params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Checkout({ params, searchParams }: Pick<PageProps<"/checkout/[offerId]">, "params" | "searchParams">) {
  const { offerId } = await params;
  const { canceled } = await searchParams;
  await requireUser(`/checkout/${offerId}`);
  const supabase = await createClient();
  const { data: offer } = await supabase
    .from("offers")
    .select("id, kind, price_cents, rental_hours, active, film:films!inner(slug, title, runtime_seconds, release_year, poster_url, ai_generated, account:filmmaker_accounts(display_name))")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer || !offer.active) notFound();
  const film = offer.film;
  const kind = offer.kind as "rent" | "buy";
  const free = offer.price_cents === 0;
  const verb = kind === "rent" ? "Rent" : "Buy";

  return (
    <div className="grid gap-6">
      <Link href={`/f/${film.slug}`} className="text-sm text-muted hover:text-fg">
        ← Back to the film
      </Link>
      <div className="card grid gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">
            {film.account?.display_name}
            {film.release_year ? ` · ${film.release_year}` : ""}
            {film.runtime_seconds ? ` · ${Math.round(film.runtime_seconds / 60)} min` : ""}
          </p>
          <h1 className="font-display text-4xl">{film.title}</h1>
          {film.ai_generated ? (
            <span className="mt-2 inline-block rounded-full border border-line px-2 py-0.5 text-xs">AI-generated</span>
          ) : null}
        </div>
        <div className="grid gap-1 font-mono text-sm">
          <p className="flex justify-between">
            <span className="font-sans text-muted">{kind === "rent" ? `Rental · ${rentalWindowLabel(offer.rental_hours ?? 48)}` : "Purchase"}</span>
            <span>{free ? "Free" : formatCents(offer.price_cents)}</span>
          </p>
          {!free ? (
            <p className="flex justify-between text-muted">
              <span className="font-sans">Sales tax</span>
              <span className="font-sans">Added at checkout</span>
            </p>
          ) : null}
        </div>
        {kind === "rent" ? (
          <p className="text-sm text-muted">
            Start within 30 days. Once you press play you have {rentalWindowLabel(offer.rental_hours ?? 48)} to finish.
          </p>
        ) : null}
        {canceled ? <p className="text-sm text-warn">Checkout was canceled. You haven&apos;t been charged.</p> : null}
        <CheckoutForm offerId={offer.id} kind={kind} free={free} label={`${verb} for ${formatCents(offer.price_cents)}`} />
      </div>
    </div>
  );
}
