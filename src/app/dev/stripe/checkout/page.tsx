import { Suspense } from "react";
import { formatCents } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeCheckout } from "../actions";
import { DevShell } from "../shell";

export default function DevCheckout({ searchParams }: PageProps<"/dev/stripe/checkout">) {
  return (
    <DevShell title="Checkout (dev)">
      <Suspense>
        <Body searchParams={searchParams} />
      </Suspense>
    </DevShell>
  );
}

async function Body({ searchParams }: Pick<PageProps<"/dev/stripe/checkout">, "searchParams">) {
  const { order, success, cancel } = await searchParams;
  const { data } = await createAdminClient()
    .from("orders")
    .select("subtotal_cents, kind, film:films!inner(title)")
    .eq("id", String(order ?? ""))
    .maybeSingle();
  const tax = data ? Math.round(data.subtotal_cents * 0.07) : 0;
  return (
    <form action={completeCheckout} className="grid gap-3">
      <input type="hidden" name="order" value={String(order ?? "")} />
      <input type="hidden" name="success" value={String(success ?? "")} />
      <input type="hidden" name="cancel" value={String(cancel ?? "")} />
      <p className="text-sm text-muted">Stands in for Stripe Checkout. Tax is a flat 7% in dev.</p>
      {data ? (
        <div className="grid gap-1 font-mono text-sm">
          <p className="font-sans font-medium">
            {data.kind === "rent" ? "Rent" : "Buy"}: {data.film.title}
          </p>
          <p className="flex justify-between">
            <span>Price</span>
            <span>{formatCents(data.subtotal_cents)}</span>
          </p>
          <p className="flex justify-between">
            <span>Tax</span>
            <span>{formatCents(tax)}</span>
          </p>
          <p className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCents(data.subtotal_cents + tax)}</span>
          </p>
        </div>
      ) : null}
      <div className="flex gap-2">
        <button name="outcome" value="pay" className="btn-primary">
          Pay
        </button>
        <button name="outcome" value="cancel" className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
