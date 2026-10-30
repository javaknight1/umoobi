import type { Metadata } from "next";
import { Suspense } from "react";
import { requireOwnFilm } from "@/lib/auth/filmmaker";
import { DEFAULT_FEE_BPS, FOUNDING_FEE_BPS } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { PricingForm } from "./pricing-form";

export const metadata: Metadata = { title: "Pricing", robots: { index: false } };

export default function PricingPage({ params }: PageProps<"/studio/films/[id]/pricing">) {
  return (
    <Suspense fallback={<div className="card h-96" />}>
      <Pricing params={params} />
    </Suspense>
  );
}

async function Pricing({ params }: Pick<PageProps<"/studio/films/[id]/pricing">, "params">) {
  const { id } = await params;
  const { account, film } = await requireOwnFilm(id);
  const supabase = await createClient();
  const { data: offers } = await supabase.from("offers").select("kind, price_cents, rental_hours").eq("film_id", id).eq("active", true);
  const rent = offers?.find((o) => o.kind === "rent") ?? null;
  const buy = offers?.find((o) => o.kind === "buy") ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const founding = !!account.founding_rate_until && today <= account.founding_rate_until;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-4xl">Pricing</h1>
        <p className="mt-1 text-muted">
          {film.title}. Turn on rent, buy or both. Buyers pay your price plus sales tax, which Umoobi collects and pays.
        </p>
      </div>
      <PricingForm
        filmId={id}
        runtimeSeconds={film.runtime_seconds}
        feeBps={founding ? FOUNDING_FEE_BPS : account.fee_bps || DEFAULT_FEE_BPS}
        founding={founding}
        initial={{
          rent: rent ? { priceCents: rent.price_cents, hours: rent.rental_hours ?? 48 } : null,
          buy: buy ? { priceCents: buy.price_cents } : null,
        }}
      />
    </div>
  );
}
