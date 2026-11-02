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
    <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 sm:px-8 sm:py-8">
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
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">
            {film.title}
            {film.ai_generated ? <span className="pill ml-3 border border-warn/60 align-middle text-warn">AI-generated</span> : null}
          </h1>
          <p className="text-muted">{state ? state.label : "Purchased · yours to stream"}</p>
        </div>
        <p className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm text-muted">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-ok" />
          Cast with Chromecast (Chrome) or AirPlay (Safari)
        </p>
      </div>
      <Player
        filmId={film.id}
        title={film.title}
        posterUrl={film.poster_url}
        rentalNotStarted={ent.kind === "rent" && !ent.first_played_at}
        rentalHours={ent.rental_hours}
      />
      <p className="text-sm text-muted">Your phone or this browser tab stays the remote while you cast.</p>
    </div>
  );
}
