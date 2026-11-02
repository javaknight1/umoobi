import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/app-shell";
import { Poster } from "@/components/brand";
import { requireFilmmaker } from "@/lib/auth/filmmaker";
import { createClient } from "@/lib/supabase/server";
import { FilmStatus, formatRuntime } from "./status";

export const metadata: Metadata = { title: "Films · Studio", robots: { index: false } };

export default function FilmsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Studio"
        title="Films"
        actions={
          <Link href="/studio/films/new" className="btn-primary px-6 py-3">
            Upload a film
          </Link>
        }
      />
      <Suspense fallback={<div className="card h-40" />}>
        <FilmList />
      </Suspense>
    </div>
  );
}

async function FilmList() {
  const { account } = await requireFilmmaker("/studio/films");
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const [{ data: films }, { data: features }, { data: shorts }, { data: featureCap }, { data: shortCap }] = await Promise.all([
    supabase
      .from("films")
      .select("id, slug, title, status, runtime_seconds, created_at, ai_generated, poster_url")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("my_films_used", { a: account.id, yr: year, kind: "feature" }),
    supabase.rpc("my_films_used", { a: account.id, yr: year, kind: "short" }),
    supabase.rpc("cap_for", { tier: account.tier, kind: "feature" }),
    supabase.rpc("cap_for", { tier: account.tier, kind: "short" }),
  ]);

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Cap label={`Features in ${year}`} used={features ?? 0} cap={featureCap ?? null} />
        <Cap label={`Shorts in ${year}`} used={shorts ?? 0} cap={shortCap ?? null} />
      </div>
      {films?.length ? (
        <ul className="card grid p-0">
          {films.map((f) => (
            <li key={f.id} className="border-b border-line last:border-0">
              <Link href={`/studio/films/${f.id}`} className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-surface-2">
                <span className="w-12 shrink-0">
                  <Poster title={f.title} url={f.poster_url} slug={f.slug} bare className="rounded-lg" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{f.title}</span>
                  <span className="block text-sm text-muted">
                    {formatRuntime(f.runtime_seconds)}
                    {f.ai_generated ? " · AI-generated" : ""}
                  </span>
                </span>
                <FilmStatus status={f.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card text-muted">No films yet. Add your first one to upload it and set a price.</p>
      )}
    </>
  );
}

/** Yearly cap with a progress bar (D13), as in mockup 03's "Your yearly limit". */
function Cap({ label, used, cap }: { label: string; used: number; cap: number | null }) {
  return (
    <div className="card grid gap-3">
      <div className="flex items-baseline justify-between">
        <p className="text-muted">{label}</p>
        <p className="font-display text-2xl">
          {used} <span className="text-base font-normal text-muted">of {cap ?? "unlimited"}</span>
        </p>
      </div>
      {cap ? (
        <div className="h-2.5 rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-chart" style={{ width: `${Math.min(100, (used / cap) * 100)}%` }} />
        </div>
      ) : null}
    </div>
  );
}
