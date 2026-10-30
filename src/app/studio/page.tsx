import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ColumnChart } from "@/components/charts/bars";
import { requireFilmmaker } from "@/lib/auth/filmmaker";
import { formatCents } from "@/lib/money";
import { dailyTotals, dayKey, nextPayoutDate, salesBetween } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Studio", robots: { index: false } };

export default function StudioHome() {
  return (
    <Suspense fallback={<div className="card h-64" />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const { account } = await requireFilmmaker("/studio");
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 86400_000);
  const lines = (await salesBetween(account.id, from, now)).filter((l) => l.status === "paid");
  const supabase = await createClient();
  const payoutDay = nextPayoutDate(now);
  const monthEnd = new Date(payoutDay.getTime() - 86400_000);
  const [{ data: nextPayout }, { data: films }] = await Promise.all([
    supabase.rpc("my_balance_cents", { a: account.id, on_date: dayKey(monthEnd) }),
    supabase.from("films").select("id, title, status").eq("account_id", account.id).order("created_at", { ascending: false }),
  ]);
  const sales = lines.reduce((s, l) => s + l.price_cents, 0);
  const earned = lines.reduce((s, l) => s + l.net_cents, 0);

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{account.display_name}</p>
          <h1 className="font-display text-4xl">Last 30 days</h1>
        </div>
        <Link href="/studio/films/new" className="btn-primary">
          Add a film
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Sales" value={formatCents(sales)} hint={`${lines.length} rentals and purchases`} />
        <Stat label="You earned" value={formatCents(earned)} hint="After Umoobi and card fees" />
        <Stat label="Next payout" value={formatCents(Math.max(0, nextPayout ?? 0))} hint={`On ${payoutDay.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`} />
        <Stat label="Films" value={String(films?.length ?? 0)} hint={`${films?.filter((f) => f.status === "published").length ?? 0} published`} />
      </div>
      <section className="card">
        <ColumnChart title="Daily sales" data={dailyTotals(lines, 30, now, (l) => l.price_cents)} format={formatCents} />
      </section>
      <section className="card grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Your films</h2>
          <Link href="/studio/films" className="text-sm text-muted hover:text-fg">
            All films →
          </Link>
        </div>
        {films?.length ? (
          <ul className="grid gap-2 text-sm">
            {films.slice(0, 5).map((f) => (
              <li key={f.id} className="flex justify-between">
                <Link href={`/studio/films/${f.id}`} className="hover:underline">
                  {f.title}
                </Link>
                <span className="text-muted">{f.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No films yet.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-3xl">{value}</p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}
