import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AiBadge, Poster } from "@/components/film/film-card";
import { PageView } from "@/components/film/page-view";
import { TrailerPlayer } from "@/components/film/trailer-player";
import { AddToList } from "@/components/social/add-to-list";
import { FollowButton } from "@/components/social/follow-button";
import { ReportForm } from "@/components/social/report-form";
import { ReviewForm } from "@/components/social/review-form";
import { formatRuntime, LICENSE_STATEMENT, offerLabel, sortOffers } from "@/lib/films/format";
import { getFilmReviews, getPublicFilm, type PublicFilm } from "@/lib/films/queries";
import { viewerFilmState } from "@/lib/viewer";

export async function generateMetadata({ params }: PageProps<"/f/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const film = await getPublicFilm(slug);
  if (!film) return { title: "Film not found" };
  const by = film.filmmaker_accounts?.display_name;
  const description = film.synopsis ?? `${film.title}${by ? ` by ${by}` : ""}. Rent or buy on Umoobi.`;
  return {
    title: film.title,
    description,
    alternates: { canonical: `/f/${film.slug}` },
    openGraph: {
      type: "video.movie",
      title: film.title,
      description,
      url: `/f/${film.slug}`,
      ...(film.poster_url ? { images: [{ url: film.poster_url }] } : {}),
    },
    twitter: { card: film.poster_url ? "summary_large_image" : "summary", title: film.title, description },
  };
}

export default function FilmPage({ params }: PageProps<"/f/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10">
      <Suspense fallback={<div className="aspect-video w-full animate-pulse rounded-2xl bg-surface" />}>
        <FilmBody params={params} />
      </Suspense>
    </main>
  );
}

async function FilmBody({ params }: Pick<PageProps<"/f/[slug]">, "params">) {
  const { slug } = await params;
  const film = await getPublicFilm(slug);
  if (!film) notFound();
  const trailer = film.trailers[0];
  const byline = [film.release_year, formatRuntime(film.runtime_seconds), film.content_rating, film.genre].filter(Boolean);

  return (
    <article className="grid gap-8">
      <PageView filmId={film.id} />
      <div className="grid gap-6 md:grid-cols-[1.6fr_1fr] md:gap-10">
        <div className="grid content-start gap-4">
          {trailer?.mux_playback_id ? (
            <TrailerPlayer filmId={film.id} playbackId={trailer.mux_playback_id} title={`${film.title} — trailer`} poster={film.poster_url} />
          ) : (
            <div className="mx-auto w-48 md:w-64">
              <Poster title={film.title} url={film.poster_url} />
            </div>
          )}
        </div>

        <div className="grid content-start gap-4">
          {film.filmmaker_accounts ? (
            <Link href={`/c/${film.filmmaker_accounts.slug}`} className="text-xs uppercase tracking-widest text-muted hover:text-fg">
              {film.filmmaker_accounts.display_name}
            </Link>
          ) : null}
          <h1 className="font-display text-5xl leading-none md:text-6xl">{film.title}</h1>
          <p className="text-sm text-muted">{byline.join(" · ")}</p>
          {film.ai_generated ? (
            <p className="flex items-center gap-2 text-sm">
              <AiBadge />
              <span className="text-muted">
                Contains AI-generated imagery. <Link href="/legal/ai-policy" className="underline">What this means</Link>
              </span>
            </p>
          ) : null}
          {film.rating.count ? (
            <p className="text-sm" aria-label={`Rated ${film.rating.average} out of 5 from ${film.rating.count} reviews`}>
              <span className="text-accent">★ {film.rating.average}</span>{" "}
              <span className="text-muted">
                ({film.rating.count} review{film.rating.count === 1 ? "" : "s"})
              </span>
            </p>
          ) : null}
          {film.synopsis ? <p className="text-fg/90">{film.synopsis}</p> : null}

          <Suspense fallback={<Offers film={film} entitled={false} />}>
            <ViewerOffers film={film} />
          </Suspense>
        </div>
      </div>

      <Credits film={film} />

      {film.clips.length ? (
        <section className="grid gap-3" aria-label="Clips">
          <h2 className="font-display text-3xl">Clips</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {film.clips.map((c) => (
              <figure key={c.id} className="grid gap-2">
                <TrailerPlayer filmId={film.id} playbackId={c.mux_playback_id!} title={c.label ?? `${film.title} clip`} />
                {c.label ? <figcaption className="text-sm text-muted">{c.label}</figcaption> : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4" aria-label="Reviews">
        <h2 className="font-display text-3xl">Reviews</h2>
        <Suspense fallback={null}>
          <ViewerReview film={film} />
        </Suspense>
        <Suspense fallback={<p className="text-sm text-muted">Loading reviews…</p>}>
          <Reviews filmId={film.id} />
        </Suspense>
      </section>

      <ReportForm filmId={film.id} />
    </article>
  );
}

function Offers({ film, entitled }: { film: PublicFilm; entitled: boolean }) {
  const offers = sortOffers(film.offers);
  const hasBuy = offers.some((o) => o.kind === "buy" && o.price_cents > 0);
  return (
    <div className="grid gap-3">
      {entitled ? (
        <Link href={`/watch/${film.slug}`} className="btn-primary text-base">
          ▶ Watch now
        </Link>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {offers.map((o) => (
          <Link
            key={o.id}
            href={`/checkout/${o.id}`}
            className={o.kind === "rent" || o.price_cents === 0 ? "btn-primary" : "btn-ghost"}
          >
            {offerLabel(o)}
          </Link>
        ))}
      </div>
      {!offers.length ? <p className="text-sm text-muted">Not available to rent or buy right now.</p> : null}
      {hasBuy ? (
        <p className="rounded-lg border border-line p-3 text-xs text-muted" data-testid="license-statement">
          {LICENSE_STATEMENT}{" "}
          <Link href="/legal/license" className="underline">
            License terms
          </Link>
        </p>
      ) : null}
      <p className="text-xs text-muted">Sales tax is added at checkout. Rentals start when you press play.</p>
    </div>
  );
}

async function ViewerOffers({ film }: { film: PublicFilm }) {
  const state = await viewerFilmState(film.id, film.account_id, []);
  return (
    <>
      <Offers film={film} entitled={state.entitled} />
      <div className="flex flex-wrap items-center gap-3">
        {film.filmmaker_accounts ? (
          <FollowButton
            target={{ accountId: film.account_id }}
            following={state.signedIn ? state.followsAccount : null}
            label={film.filmmaker_accounts.display_name}
            next={`/f/${film.slug}`}
          />
        ) : null}
        {state.signedIn ? <AddToList filmId={film.id} lists={state.lists} /> : null}
      </div>
    </>
  );
}

function Credits({ film }: { film: PublicFilm }) {
  if (!film.credits.length) return null;
  return (
    <section className="grid gap-3" aria-label="Cast and crew">
      <h2 className="font-display text-3xl">Cast and crew</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {film.credits.map((c) =>
          c.people ? (
            <li key={`${c.people.id}-${c.role}`}>
              <Link href={`/p/${c.people.slug}`} className="card grid gap-0.5 p-3 hover:border-fg/40">
                <span className="font-medium">{c.people.name}</span>
                <span className="text-xs text-muted">{c.role}</span>
              </Link>
            </li>
          ) : null,
        )}
      </ul>
    </section>
  );
}

async function ViewerReview({ film }: { film: PublicFilm }) {
  const state = await viewerFilmState(film.id, film.account_id, []);
  if (state.myReview || state.canReview) return <ReviewForm filmId={film.id} existing={state.myReview} />;
  return <p className="text-sm text-muted">Only people who rented or bought the film can review it.</p>;
}

async function Reviews({ filmId }: { filmId: string }) {
  const reviews = await getFilmReviews(filmId);
  if (!reviews.length) return <p className="text-sm text-muted">No reviews yet.</p>;
  return (
    <ul className="grid gap-3">
      {reviews.map((r) => (
        <li key={r.id} className="card grid gap-1">
          <p className="text-accent" aria-label={`${r.rating} out of 5`}>
            {"★".repeat(r.rating)}
            <span className="text-muted">{"★".repeat(5 - r.rating)}</span>
          </p>
          {r.body ? <p className="text-sm">{r.body}</p> : null}
          <p className="text-xs text-muted">Verified viewer · {r.created_at.slice(0, 10)}</p>
        </li>
      ))}
    </ul>
  );
}
