import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, StatCard } from "@/components/app/app-shell";
import { FilmStatus } from "./films/status";
import { Poster } from "@/components/brand";
import { ColumnChart } from "@/components/charts/bars";
import { requireFilmmaker } from "@/lib/auth/filmmaker";
import { priceLine } from "@/lib/films/format";
import { formatCents } from "@/lib/money";
import { dailyTotals, dayKey, nextPayoutDate, salesBetween } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Studio", robots: { index: false } };

export default function StudioHome() {
  return (
    <Suspense fallback={<div className="card h-64" />}>
      <Dashboard />
    </Suspense>
  );
}

const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

async function Dashboard() {
  const { account, userId } = await requireFilmmaker("/studio");
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 86400_000);
  const lines = (await salesBetween(account.id, from, now)).filter((l) => l.status === "paid");
  const supabase = await createClient();
  const payoutDay = nextPayoutDate(now);
  const monthEnd = new Date(payoutDay.getTime() - 86400_000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [{ data: nextPayout }, { data: films }, { data: paidOut }, { count: followers }, { data: profile }] = await Promise.all([
    supabase.rpc("my_balance_cents", { a: account.id, on_date: dayKey(monthEnd) }),
    supabase
      .from("films")
      .select("id, slug, title, status, poster_url, offers(kind, price_cents, rental_hours, active)")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false }),
    supabase.from("payouts").select("amount_cents").eq("account_id", account.id).eq("status", "paid").gte("paid_at", monthStart.toISOString()),
    // Follower total is an aggregate; follow rows themselves stay private to each viewer.
    createAdminClient().from("follows").select("*", { count: "exact", head: true }).eq("account_id", account.id),
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
  ]);

  const gross = lines.reduce((s, l) => s + l.price_cents, 0);
  const earned = lines.reduce((s, l) => s + l.net_cents, 0);
  const fees = lines.reduce((s, l) => s + l.fee_cents, 0);
  const processing = lines.reduce((s, l) => s + l.processing_cents, 0);
  const rentals = lines.filter((l) => l.kind === "rent").length;
  const purchases = lines.length - rentals;
  const firstName = (profile?.display_name ?? account.display_name).split(" ")[0];
  const perFilm = new Map<string, { rentals: number; purchases: number; gross: number; net: number }>();
  for (const l of lines) {
    const f = perFilm.get(l.film_id) ?? { rentals: 0, purchases: 0, gross: 0, net: 0 };
    if (l.kind === "rent") f.rentals++;
    else f.purchases++;
    f.gross += l.price_cents;
    f.net += l.net_cents;
    perFilm.set(l.film_id, f);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={`Last 30 days · ${fmtDay(from)} – ${fmtDay(now)}, ${now.getUTCFullYear()}`}
        title={`Welcome back, ${firstName}`}
        actions={
          <Link href="/studio/films/new" className="btn-primary px-6 py-3">
            Upload a film
          </Link>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross sales" value={formatCents(gross)} />
        <StatCard label="You earned" value={formatCents(earned)} note={`after ${formatCents(fees)} fee and ${formatCents(processing)} processing`} />
        <StatCard label="Rentals and purchases" value={lines.length} note={`${rentals} rentals · ${purchases} purchases`} />
        <StatCard label="Followers" value={followers ?? 0} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <section className="card">
          <ColumnChart
            title="Daily rentals and purchases"
            aside={`${lines.length} total`}
            data={dailyTotals(lines, 30, now, () => 1)}
            format={(n) => `${n} sale${n === 1 ? "" : "s"}`}
          />
        </section>
        <section className="card grid content-start gap-2">
          <h2 className="font-display text-xl">Next payout</h2>
          <p className="font-display text-5xl">{formatCents(Math.max(0, nextPayout ?? 0))}</p>
          <p className="text-muted">
            {payoutDay.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })} · monthly
          </p>
          <dl className="mt-4 grid gap-3 border-t border-line pt-4">
            <div className="flex justify-between">
              <dt className="text-muted">Paid out this month</dt>
              <dd className="font-semibold">{formatCents((paidOut ?? []).reduce((s, p) => s + p.amount_cents, 0))}</dd>
            </div>
            <div>
              <dt className="text-muted">Refund reserve</dt>
              <dd className="text-sm text-muted">10% of each purchase is held for 30 days, then paid out.</dd>
            </div>
          </dl>
        </section>
      </div>
      <section className="card overflow-x-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Your films</h2>
          <Link href="/studio/films" className="text-sm text-muted hover:text-fg">
            All films →
          </Link>
        </div>
        {films?.length ? (
          <table className="mt-4 w-full min-w-[640px] text-left">
            <thead className="text-sm text-muted">
              <tr className="border-b border-line">
                <th className="py-3 font-medium">Film</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 text-right font-medium">Rentals</th>
                <th className="py-3 text-right font-medium">Purchases</th>
                <th className="py-3 text-right font-medium">Gross</th>
                <th className="py-3 text-right font-medium">You earned</th>
              </tr>
            </thead>
            <tbody>
              {films.slice(0, 8).map((f) => {
                const s = perFilm.get(f.id);
                return (
                  <tr key={f.id} className="border-b border-line last:border-0">
                    <td className="py-3">
                      <Link href={`/studio/films/${f.id}`} className="flex items-center gap-4 hover:underline">
                        <span className="w-12 shrink-0">
                          <Poster title={f.title} url={f.poster_url} slug={f.slug} bare className="rounded-lg" />
                        </span>
                        <span>
                          <span className="block font-semibold">{f.title}</span>
                          <span className="block text-sm text-muted">{priceLine(f.offers.filter((o) => o.active)) ?? "No prices yet"}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-3">
                      <FilmStatus status={f.status} />
                    </td>
                    <td className="py-3 text-right tabular-nums">{s?.rentals ?? "—"}</td>
                    <td className="py-3 text-right tabular-nums">{s?.purchases || "—"}</td>
                    <td className="py-3 text-right tabular-nums">{s ? formatCents(s.gross) : "—"}</td>
                    <td className="py-3 text-right font-semibold tabular-nums">{s ? formatCents(s.net) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-muted">No films yet.</p>
        )}
      </section>
    </div>
  );
}
