import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { formatPosition, rentalState } from "@/lib/library/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Your library", robots: { index: false } };

export default function LibraryPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="font-display text-5xl">Your library</h1>
      <Suspense fallback={<div className="mt-8 h-64 rounded-2xl bg-surface" />}>
        <Library />
      </Suspense>
    </main>
  );
}

interface FilmRef {
  id: string;
  slug: string;
  title: string;
  runtime_seconds: number | null;
  poster_url: string | null;
}

async function Library() {
  const user = await requireUser("/library");
  // Admin client, scoped to this viewer: pulled films stay visible while rentals run (D27).
  const db = createAdminClient();
  const [{ data: ents }, { data: progress }] = await Promise.all([
    db
      .from("entitlements")
      .select("id, kind, rental_hours, first_played_at, expires_at, created_at, film:films!inner(id, slug, title, runtime_seconds, poster_url)")
      .eq("viewer_id", user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    db
      .from("watch_progress")
      .select("position_seconds, updated_at, film:films!inner(id, slug, title, runtime_seconds, poster_url)")
      .eq("viewer_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);
  const now = new Date();
  const rentals = (ents ?? []).filter((e) => e.kind === "rent");
  const purchases = (ents ?? []).filter((e) => e.kind === "buy");
  const resume = new Map((progress ?? []).map((p) => [p.film.id, p.position_seconds]));

  if (!ents?.length && !progress?.length) {
    return (
      <div className="card mt-8 grid gap-3">
        <p>Nothing here yet. Films you rent or buy show up here, with your place in each one.</p>
        <Link href="/discover" className="btn-primary justify-self-start">
          Discover films
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-10">
      <Section title="Rentals" empty="No rentals.">
        {rentals.map((e) => {
          const s = rentalState(e, now);
          return <FilmRow key={e.id} film={e.film} note={s.label} watchable={s.watchable} resume={resume.get(e.film.id)} />;
        })}
      </Section>
      <Section title="Purchases" empty="No purchases.">
        {purchases.map((e) => (
          <FilmRow key={e.id} film={e.film} note="Yours to stream" watchable resume={resume.get(e.film.id)} />
        ))}
      </Section>
      <Section title="History" empty="Nothing watched yet.">
        {(progress ?? []).map((p) => (
          <FilmRow
            key={p.film.id}
            film={p.film}
            note={`Watched ${new Date(p.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            watchable={(ents ?? []).some((e) => e.film.id === p.film.id && rentalState(e, now).watchable)}
            resume={p.position_seconds}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section aria-labelledby={`lib-${title}`}>
      <h2 id={`lib-${title}`} className="font-display text-3xl">
        {title}
      </h2>
      {children.length ? <ul className="mt-4 grid gap-3">{children}</ul> : <p className="mt-2 text-muted">{empty}</p>}
    </section>
  );
}

function FilmRow({ film, note, watchable, resume }: { film: FilmRef; note: string; watchable: boolean; resume?: number }) {
  const pct = resume && film.runtime_seconds ? Math.min(100, Math.round((resume / film.runtime_seconds) * 100)) : 0;
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3">
      <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-[radial-gradient(circle_at_30%_30%,#3b2f22,#0f0e0c_70%)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {film.poster_url ? <img src={film.poster_url} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="grid min-w-0 flex-1 gap-1">
        <Link href={`/f/${film.slug}`} className="truncate font-medium hover:underline">
          {film.title}
        </Link>
        <p className="text-sm text-muted">
          {note}
          {resume ? ` · Resume at ${formatPosition(resume)}` : ""}
        </p>
        {pct ? (
          <div className="h-1 w-full max-w-xs overflow-hidden rounded bg-line" aria-hidden>
            <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>
      {watchable ? (
        <Link href={`/watch/${film.slug}`} className="btn-primary px-4 py-2" aria-label={`Watch ${film.title}`}>
          {resume ? "Resume" : "Watch"}
        </Link>
      ) : null}
    </li>
  );
}
