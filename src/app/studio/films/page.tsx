import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireFilmmaker } from "@/lib/auth/filmmaker";
import { createClient } from "@/lib/supabase/server";
import { FilmStatus, formatRuntime } from "./status";

export const metadata: Metadata = { title: "Films · Studio", robots: { index: false } };

export default function FilmsPage() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Films</h1>
        <Link href="/studio/films/new" className="btn-primary">
          Add a film
        </Link>
      </div>
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
    supabase.from("films").select("id, title, status, runtime_seconds, created_at, ai_generated").eq("account_id", account.id).order("created_at", { ascending: false }),
    supabase.rpc("films_used", { a: account.id, yr: year, kind: "feature" }),
    supabase.rpc("films_used", { a: account.id, yr: year, kind: "short" }),
    supabase.rpc("cap_for", { tier: account.tier, kind: "feature" }),
    supabase.rpc("cap_for", { tier: account.tier, kind: "short" }),
  ]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Cap label={`Features in ${year}`} used={features ?? 0} cap={featureCap ?? null} />
        <Cap label={`Shorts in ${year}`} used={shorts ?? 0} cap={shortCap ?? null} />
      </div>
      {films?.length ? (
        <ul className="grid gap-3">
          {films.map((f) => (
            <li key={f.id}>
              <Link href={`/studio/films/${f.id}`} className="card flex flex-wrap items-center justify-between gap-3 hover:border-fg/40">
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-muted">
                    {formatRuntime(f.runtime_seconds)}
                    {f.ai_generated ? " · AI-generated" : ""}
                  </p>
                </div>
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

function Cap({ label, used, cap }: { label: string; used: number; cap: number | null }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-3xl">
        {used} <span className="text-lg text-muted">of {cap ?? "unlimited"}</span>
      </p>
    </div>
  );
}
