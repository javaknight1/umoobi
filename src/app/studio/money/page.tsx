import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, StatCard } from "@/components/app/app-shell";
import { requireFilmmaker } from "@/lib/auth/filmmaker";
import { formatCents } from "@/lib/money";
import { payments } from "@/lib/payments";
import { monthBounds, salesBetween, type SaleLine } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Money", robots: { index: false } };

export default function MoneyPage({ searchParams }: PageProps<"/studio/money">) {
  return (
    <Suspense fallback={<div className="card h-64" />}>
      <Money searchParams={searchParams} />
    </Suspense>
  );
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" });

/** Payout status of one sale: refunded, 10% reserve still held (D37), or ready for the next monthly payout. */
function payoutState(l: SaleLine, now: Date): [string, string] {
  if (l.status === "refunded") return ["Refunded", "bg-bad/12 text-bad"];
  if (l.kind === "buy" && now.getTime() - new Date(l.paid_at).getTime() < 30 * 86400_000) return ["10% held", "bg-warn/12 text-warn"];
  return ["Ready", "bg-ok/12 text-ok"];
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
  const monthName = from.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Money"
        title="Every sale, line by line"
        actions={
          <>
            <a href={`/studio/money/export?month=${label}`} className="btn-ghost">
              Download CSV
            </a>
            {dashboard ? (
              <a href={dashboard} className="btn-ghost">
                Tax forms
              </a>
            ) : null}
          </>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross sales" value={formatCents(sum("price_cents"))} note={monthName} />
        <StatCard label="Umoobi fee" value={`−${formatCents(sum("fee_cents"))}`} note="10% of every sale (25¢ minimum)" />
        <StatCard label="Card processing" value={`−${formatCents(sum("processing_cents"))}`} note="2.9% + $0.30 per sale" />
        <StatCard label="You earned" value={formatCents(sum("net_cents"))} note={`Paid out monthly · ${formatCents(balance ?? 0)} available now`} />
      </div>
      <section className="card overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl">Statement · {monthName}</h2>
          <nav className="flex gap-4 text-sm">
            <a href={`/studio/money?month=${prev}`} className="text-muted hover:text-fg">
              ← {prev}
            </a>
            {next ? (
              <a href={`/studio/money?month=${next}`} className="text-muted hover:text-fg">
                {next} →
              </a>
            ) : null}
          </nav>
        </div>
        <table className="mt-4 w-full min-w-[760px] text-left">
          <thead className="text-sm text-muted">
            <tr className="border-b border-line">
              {["Date", "Film", "Type", "Price", "Umoobi fee", "Processing", "You get", "Payout"].map((h) => (
                <th key={h} className={`py-3 pr-3 font-medium ${["Price", "Umoobi fee", "Processing", "You get"].includes(h) ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {lines.map((l) => {
              const [state, tone] = payoutState(l, now);
              return (
                <tr key={l.order_ref} className="border-b border-line">
                  <td className="py-3.5 pr-3 text-muted">{when(l.paid_at)}</td>
                  <td className="py-3.5 pr-3 font-semibold">{l.film_title}</td>
                  <td className="py-3.5 pr-3">{l.kind === "rent" ? "Rental" : "Purchase"}</td>
                  <td className="py-3.5 pr-3 text-right">{formatCents(l.price_cents)}</td>
                  <td className="py-3.5 pr-3 text-right">−{formatCents(l.fee_cents)}</td>
                  <td className="py-3.5 pr-3 text-right">−{formatCents(l.processing_cents)}</td>
                  <td className="py-3.5 pr-3 text-right font-semibold">{formatCents(l.net_cents)}</td>
                  <td className="py-3.5">
                    <span className={`pill px-3 py-1 text-sm ${tone}`}>{state}</span>
                  </td>
                </tr>
              );
            })}
            {lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted">
                  No sales this month.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <p className="mt-4 text-sm text-muted">
          Sales tax is collected from buyers and paid to each state by Umoobi. It is never taken from your earnings. When
          you pull a film, anyone who bought it in the last 30 days is refunded from your share; card processing on the
          original sale isn&apos;t charged to you again.
        </p>
      </section>
      <section className="card">
        <h2 className="font-display text-xl">Payouts</h2>
        <p className="text-sm text-muted">Monthly, on the 1st. 10% of purchase revenue is held for 30 days to cover refunds if a film is pulled.</p>
        <ul className="mt-4 grid gap-2">
          {(payouts ?? []).map((p) => (
            <li key={p.id} className="flex justify-between border-b border-line pb-2 last:border-0">
              <span>{p.period_start.slice(0, 7)}</span>
              <span className="font-semibold tabular-nums">{formatCents(p.amount_cents)}</span>
              <span className="text-muted">{p.status}</span>
            </li>
          ))}
          {payouts?.length ? null : <li className="text-muted">No payouts yet.</li>}
        </ul>
      </section>
    </div>
  );
}
