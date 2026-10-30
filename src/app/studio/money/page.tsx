import type { Metadata } from "next";
import { Suspense } from "react";
import { requireFilmmaker } from "@/lib/auth/filmmaker";
import { formatCents } from "@/lib/money";
import { payments } from "@/lib/payments";
import { monthBounds, salesBetween } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Money", robots: { index: false } };

export default function MoneyPage({ searchParams }: PageProps<"/studio/money">) {
  return (
    <Suspense fallback={<div className="card h-64" />}>
      <Money searchParams={searchParams} />
    </Suspense>
  );
}

async function Money({ searchParams }: Pick<PageProps<"/studio/money">, "searchParams">) {
  const { account } = await requireFilmmaker("/studio/money");
  const { month } = await searchParams;
  const now = new Date();
  const { from, to, label } = monthBounds(typeof month === "string" ? month : null, now);
  const lines = await salesBetween(account.id, from, to);
  const supabase = await createClient();
  const [{ data: payouts }, { data: balance }] = await Promise.all([
    supabase.from("payouts").select("id, period_start, amount_cents, status, paid_at").eq("account_id", account.id).order("period_start", { ascending: false }).limit(12),
    supabase.rpc("my_balance_cents", { a: account.id }),
  ]);
  const dashboard = account.stripe_account_id ? await payments().expressDashboardUrl(account.stripe_account_id).catch(() => null) : null;
  const paid = lines.filter((l) => l.status === "paid");
  const sum = (k: "price_cents" | "fee_cents" | "processing_cents" | "net_cents") => paid.reduce((s, l) => s + l[k], 0);
  const prev = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  const next = to <= now ? to.toISOString().slice(0, 7) : null;

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl">Money</h1>
        <div className="flex gap-2 text-sm">
          <a href={`/studio/money/export?month=${label}`} className="btn-ghost">
            Download CSV
          </a>
          {dashboard ? (
            <a href={dashboard} className="btn-ghost">
              Tax forms and bank details
            </a>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-5">
        <Stat label="Sales" value={formatCents(sum("price_cents"))} />
        <Stat label="Umoobi fee" value={`−${formatCents(sum("fee_cents"))}`} />
        <Stat label="Card fees" value={`−${formatCents(sum("processing_cents"))}`} />
        <Stat label="You earned" value={formatCents(sum("net_cents"))} />
        <Stat label="Available now" value={formatCents(balance ?? 0)} />
      </div>
      <section className="card overflow-x-auto p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-medium">Statement · {label}</h2>
          <nav className="flex gap-3 text-sm">
            <a href={`/studio/money?month=${prev}`} className="text-muted hover:text-fg">← {prev}</a>
            {next ? <a href={`/studio/money?month=${next}`} className="text-muted hover:text-fg">{next} →</a> : null}
          </nav>
        </div>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-muted">
            <tr className="border-y border-line">
              {["Date", "Film", "Type", "Price", "Umoobi fee", "Card fee", "You earn", ""].map((h) => (
                <th key={h} className={`px-4 py-2 font-medium ${["Price", "Umoobi fee", "Card fee", "You earn"].includes(h) ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {lines.map((l) => (
              <tr key={l.order_ref} className="border-b border-line">
                <td className="px-4 py-2 font-sans">{l.paid_at.slice(0, 10)}</td>
                <td className="px-4 py-2 font-sans">{l.film_title}</td>
                <td className="px-4 py-2 font-sans">{l.kind === "rent" ? "Rental" : "Purchase"}</td>
                <td className="px-4 py-2 text-right">{formatCents(l.price_cents)}</td>
                <td className="px-4 py-2 text-right">−{formatCents(l.fee_cents)}</td>
                <td className="px-4 py-2 text-right">−{formatCents(l.processing_cents)}</td>
                <td className="px-4 py-2 text-right">{formatCents(l.net_cents)}</td>
                <td className="px-4 py-2 font-sans text-xs text-muted">{l.status === "refunded" ? "Refunded" : ""}</td>
              </tr>
            ))}
            {lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center font-sans text-muted">No sales this month.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="px-4 py-3 text-xs text-muted">
          Sales tax is added on top of your price, collected by Umoobi and paid to each state, so it isn&apos;t part of your earnings.
        </p>
      </section>
      <section className="card">
        <h2 className="font-medium">Payouts</h2>
        <p className="text-xs text-muted">Monthly, on the 1st. 10% of purchase revenue is held for 30 days to cover refunds if a film is pulled.</p>
        <ul className="mt-3 grid gap-1 text-sm">
          {(payouts ?? []).map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{p.period_start.slice(0, 7)}</span>
              <span className="font-mono">{formatCents(p.amount_cents)}</span>
              <span className="text-muted">{p.status}</span>
            </li>
          ))}
          {payouts?.length ? null : <li className="text-muted">No payouts yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-2xl">{value}</p>
    </div>
  );
}
