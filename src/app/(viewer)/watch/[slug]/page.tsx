import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { rentalState } from "@/lib/library/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { Player } from "./player";

export const metadata: Metadata = { title: "Watch", robots: { index: false } };

export default function WatchPage({ params }: PageProps<"/watch/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <Suspense fallback={<div className="aspect-video w-full rounded-2xl bg-surface" />}>
        <Watch params={params} />
      </Suspense>
    </main>
  );
}

async function Watch({ params }: Pick<PageProps<"/watch/[slug]">, "params">) {
  const { slug } = await params;
  const user = await requireUser(`/watch/${slug}`);
  const db = createAdminClient();
  const { data: film } = await db.from("films").select("id, slug, title, runtime_seconds, ai_generated, poster_url").eq("slug", slug).maybeSingle();
  if (!film) notFound();

  const now = new Date();
  const { data: ents } = await db
    .from("entitlements")
    .select("kind, rental_hours, first_played_at, expires_at")
    .eq("viewer_id", user.id)
    .eq("film_id", film.id)
    .is("revoked_at", null);
  const active = (ents ?? []).filter((e) => !e.expires_at || new Date(e.expires_at) > now);
  const ent = active.find((e) => e.kind === "buy") ?? active[0];

  if (!ent) {
    return (
      <div className="card mx-auto mt-10 grid max-w-lg gap-3">
        <h1 className="font-display text-3xl">{film.title}</h1>
        <p className="text-muted">You don&apos;t have an active rental or purchase for this film.</p>
        <Link href={`/f/${film.slug}`} className="btn-primary justify-self-start">
          Rent or buy
        </Link>
      </div>
    );
  }

  const state = ent.kind === "rent" ? rentalState(ent, now) : null;
  return (
    <div className="grid gap-4">
      <Player
        filmId={film.id}
        title={film.title}
        posterUrl={film.poster_url}
        rentalNotStarted={ent.kind === "rent" && !ent.first_played_at}
        rentalHours={ent.rental_hours}
      />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl">
          {film.title}
          {film.ai_generated ? <span className="ml-3 rounded-full border border-line px-2 py-0.5 align-middle text-xs">AI-generated</span> : null}
        </h1>
        <p className="text-sm text-muted">{state ? state.label : "Purchased · yours to stream"}</p>
      </div>
      <p className="text-sm text-muted">
        Cast to your TV with the Chromecast button in Chrome, or AirPlay in Safari. Your phone or browser tab stays the
        remote.
      </p>
    </div>
  );
}
