import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Refresh } from "./refresh";

export const metadata: Metadata = { title: "Thanks", robots: { index: false } };

export default function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
      <Suspense fallback={<h1 className="font-display text-4xl">One moment…</h1>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Shows the order's state. Payment is confirmed by the webhook, so this only reads. */
async function Body({ searchParams }: Pick<PageProps<"/checkout/success">, "searchParams">) {
  const { order: orderId } = await searchParams;
  await requireUser("/library");
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, kind, status, film:films!inner(slug, title)")
    .eq("id", String(orderId ?? ""))
    .maybeSingle();
  if (!order) {
    return (
      <>
        <h1 className="font-display text-4xl">We couldn&apos;t find that order.</h1>
        <Link href="/library" className="btn-primary mt-6">
          Go to your library
        </Link>
      </>
    );
  }
  if (order.status === "pending") {
    return (
      <>
        <h1 className="font-display text-4xl">Confirming your payment…</h1>
        <p className="mt-2 text-muted">This usually takes a few seconds.</p>
        <Refresh />
      </>
    );
  }
  if (order.status !== "paid") {
    return (
      <>
        <h1 className="font-display text-4xl">That payment didn&apos;t go through.</h1>
        <Link href={`/f/${order.film.slug}`} className="btn-ghost mt-6">
          Back to the film
        </Link>
      </>
    );
  }
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-5xl">Enjoy the film.</h1>
      <p className="text-muted">
        {order.film.title} is in your library{order.kind === "rent" ? ". The rental starts when you press play." : "."} We&apos;ve
        emailed you a receipt.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/watch/${order.film.slug}`} className="btn-primary">
          Watch now
        </Link>
        <Link href="/library" className="btn-ghost">
          Your library
        </Link>
      </div>
    </div>
  );
}
