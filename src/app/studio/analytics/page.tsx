import type { Metadata } from "next";
import { Suspense } from "react";
import { BarList } from "@/components/charts/bars";
import { requireFilmmaker } from "@/lib/auth/filmmaker";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };

const pct = (n: number) => `${Math.round(n)}%`;

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

/** Totals only, from nightly session-keyed roll-ups. Never who watched (D38). */
async function Analytics({ searchParams }: Pick<PageProps<"/studio/analytics">, "searchParams">) {
  const { account } = await requireFilmmaker("/studio/analytics");
  const { film } = await searchParams;
  const supabase = await createClient();
  const { data: films } = await supabase.from("films").select("id, title").eq("account_id", account.id).order("title");
  const filmId = typeof film === "string" && films?.some((f) => f.id === film) ? film : films?.[0]?.id;
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 86400_000).toISOString().slice(0, 10);
  const { data: stats } = filmId
    ? await supabase.from("film_daily_stats").select("*").eq("film_id", filmId).gte("day", since)
    : { data: [] };
  const rows = stats ?? [];
  const total = (k: "views" | "trailer_plays" | "checkout_starts" | "purchases" | "plays" | "completions") => rows.reduce((s, r) => s + (r[k] as number), 0);
  const views = total("views");
  const sources = Object.entries(merge(rows, "sources")).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const regions = Object.entries(merge(rows, "regions")).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const drop = merge(rows, "dropoff");
  const plays = total("plays");
  // Share of sessions still watching at the start of each tenth of the runtime.
  let remaining = plays;
  const retention = Array.from({ length: 10 }, (_, i) => {
    const value = plays ? (remaining / plays) * 100 : 0;
    remaining -= drop[String(i)] ?? 0;
    return { label: `${i * 10}%`, value };
  });

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl">Analytics</h1>
        <form className="flex gap-2 text-sm">
          <select name="film" defaultValue={filmId} className="field">
            {films?.map((f) => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>
          <button className="btn-ghost">Show</button>
        </form>
      </div>
      <p className="text-sm text-muted">Last 30 days. Totals only: Umoobi never shows who visited or watched.</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <BarList
            title="From visit to sale"
            data={[
              { label: "Page visits", value: views },
              { label: "Trailer plays", value: total("trailer_plays") },
              { label: "Checkouts started", value: total("checkout_starts") },
              { label: "Sales", value: total("purchases") },
            ]}
          />
          <p className="mt-2 text-xs text-muted">Visit-to-sale rate: {views ? pct((total("purchases") / views) * 100) : "—"}</p>
        </section>
        <section className="card">
          <BarList title="Still watching, by point in the film" data={plays ? retention : []} format={pct} empty="No plays yet" />
          <p className="mt-2 text-xs text-muted">Completion rate: {plays ? pct((total("completions") / plays) * 100) : "—"}</p>
        </section>
        <section className="card">
          <BarList title="Where visitors came from" data={sources.map(([label, value]) => ({ label, value }))} />
        </section>
        <section className="card">
          <BarList title="Top states" data={regions.map(([label, value]) => ({ label, value }))} />
        </section>
      </div>
    </div>
  );
}
