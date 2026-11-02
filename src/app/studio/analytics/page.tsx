import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, StatCard } from "@/components/app/app-shell";
import { BarList, RetentionChart } from "@/components/charts/bars";
import { requireFilmmaker } from "@/lib/auth/filmmaker";
import { stateName } from "@/lib/portal/states";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };

const pct = (n: number) => `${Math.round(n)}%`;
const PERIODS = [
  ["7", "7 days"],
  ["30", "30 days"],
  ["90", "90 days"],
  ["all", "All time"],
] as const;

export default function AnalyticsPage({ searchParams }: PageProps<"/studio/analytics">) {
  return (
    <Suspense fallback={<div className="card h-64" />}>
      <Analytics searchParams={searchParams} />
    </Suspense>
  );
}

function merge(rows: { [k: string]: unknown }[], key: "sources" | "regions" | "dropoff") {
  const out: Record<string, number> = {};
  for (const r of rows) for (const [k, v] of Object.entries((r[key] ?? {}) as Record<string, number>)) out[k] = (out[k] ?? 0) + v;
  return out;
}

function share(entries: [string, number][]) {
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return entries.map(([label, v]) => ({ label, value: (v / total) * 100 }));
}

/** Totals only, from nightly session-keyed roll-ups. Never who watched (D38). */
async function Analytics({ searchParams }: Pick<PageProps<"/studio/analytics">, "searchParams">) {
  const { account } = await requireFilmmaker("/studio/analytics");
  const { film, days } = await searchParams;
  const period = PERIODS.find(([k]) => k === days)?.[0] ?? "30";
  const supabase = await createClient();
  const { data: films } = await supabase.from("films").select("id, title").eq("account_id", account.id).order("title");
  const filmId = typeof film === "string" && films?.some((f) => f.id === film) ? film : films?.[0]?.id;
  const filmTitle = films?.find((f) => f.id === filmId)?.title;
  const now = new Date();
  const since = period === "all" ? null : new Date(now.getTime() - Number(period) * 86400_000).toISOString().slice(0, 10);
  let q = filmId ? supabase.from("film_daily_stats").select("*").eq("film_id", filmId) : null;
  if (q && since) q = q.gte("day", since);
  const [{ data: stats }, { data: reviews }] = await Promise.all([
    q ?? Promise.resolve({ data: [] as never[] }),
    filmId ? supabase.from("reviews").select("rating").eq("film_id", filmId) : Promise.resolve({ data: [] as { rating: number }[] }),
  ]);
  const rows = stats ?? [];
  const total = (k: "views" | "trailer_plays" | "checkout_starts" | "purchases" | "plays" | "completions") =>
    rows.reduce((s, r) => s + (r[k] as number), 0);
  const views = total("views");
  const sources = Object.entries(merge(rows, "sources")).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const regions = Object.entries(merge(rows, "regions")).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const drop = merge(rows, "dropoff");
  const plays = total("plays");
  // Share of sessions still watching at the start of each tenth of the runtime.
  let remaining = plays;
  const retention = Array.from({ length: 11 }, (_, i) => {
    const value = plays ? (remaining / plays) * 100 : 0;
    if (i < 10) remaining -= drop[String(i)] ?? 0;
    return { label: `${i * 10}%`, value };
  });
  const rating = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const href = (d: string) => `/studio/analytics?film=${filmId ?? ""}&days=${d}`;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={`${filmTitle ?? "No films yet"} · ${PERIODS.find(([k]) => k === period)?.[1]}`}
        title="Analytics"
        actions={
          <nav className="flex flex-wrap gap-2" aria-label="Period">
            {PERIODS.map(([k, label]) => (
              <Link
                key={k}
                href={href(k)}
                aria-current={k === period ? "page" : undefined}
                className={k === period ? "btn-dark px-4 py-2" : "btn-ghost bg-surface px-4 py-2"}
              >
                {label}
              </Link>
            ))}
          </nav>
        }
      />
      {films && films.length > 1 ? (
        <form className="-mt-4 flex gap-2 text-sm">
          <input type="hidden" name="days" value={period} />
          <select name="film" defaultValue={filmId} aria-label="Film" className="field w-auto">
            {films.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </select>
          <button className="btn-ghost bg-surface">Show</button>
        </form>
      ) : null}
      <p className="-mt-2 text-sm text-muted">Totals only: Umoobi never shows who visited or watched.</p>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Watched to the end" value={plays ? pct((total("completions") / plays) * 100) : "—"} />
        <StatCard label="Plays" value={plays} />
        <StatCard label="Visit-to-sale rate" value={views ? `${((total("purchases") / views) * 100).toFixed(1)}%` : "—"} />
        <StatCard label={`${reviews?.length ?? 0} verified reviews`} value={rating ? `${rating.toFixed(1)} ★` : "—"} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="card">
          <RetentionChart title="Where viewers stop watching" data={plays ? retention : []} />
        </section>
        <section className="card">
          <BarList
            layout="stacked"
            title="From visit to sale"
            data={[
              { label: "Page visits", value: views },
              { label: "Trailer plays", value: total("trailer_plays") },
              { label: "Started checkout", value: total("checkout_starts") },
              { label: "Rented or bought", value: total("purchases") },
            ]}
            format={(n) => n.toLocaleString("en-US")}
            note={(d) => (views ? `${((d.value / views) * 100).toFixed(1)}%` : null)}
          />
        </section>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="card">
          <BarList title="Where visitors came from" tone="accent" data={share(sources)} format={pct} />
        </section>
        <section className="card">
          <BarList title="Top states" tone="accent" data={share(regions).map((d) => ({ ...d, label: stateName(d.label) }))} format={pct} />
        </section>
      </div>
    </div>
  );
}
