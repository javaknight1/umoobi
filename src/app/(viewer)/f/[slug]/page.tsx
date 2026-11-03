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
import { LICENSE_STATEMENT, sortOffers } from "@/lib/films/format";
import { formatCents } from "@/lib/money";
import { Avatar } from "@/components/brand";
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
    },
    twitter: { card: film.poster_url ? "summary_large_image" : "summary", title: film.title, description },
  };
}

export default function FilmPage({ params }: PageProps<"/f/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 pb-16 sm:px-8 sm:pt-10">
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
  const minutes = film.runtime_seconds ? `${Math.round(film.runtime_seconds / 60)} min` : null;
  const meta = [film.genre, film.release_year, minutes, film.content_rating].filter(Boolean);
  const by = film.filmmaker_accounts?.display_name;

  return (
    <article className="grid gap-12">
      <PageView filmId={film.id} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,22rem)] lg:gap-12">
        <div className="hidden lg:block">
          <Poster title={film.title} url={film.poster_url} slug={film.slug} by={by} className="shadow-2xl" />
        </div>

        <div className="grid content-start gap-5">
          <div className="-mx-4 order-first sm:mx-0 lg:order-none">
            {trailer?.mux_playback_id ? (
              <div className="overflow-hidden sm:rounded-2xl">
                <TrailerPlayer filmId={film.id} playbackId={trailer.mux_playback_id} title={`${film.title} — trailer`} poster={film.poster_url} />
              </div>
            ) : (
              <div className="mx-auto w-48 lg:hidden">
                <Poster title={film.title} url={film.poster_url} slug={film.slug} by={by} />
              </div>
            )}
            {trailer ? (
              <p className="mt-2 px-4 text-sm font-semibold sm:px-0">
                Official trailer · free{film.trailers.length + film.clips.length > 1 ? <span className="font-normal text-muted"> · + {film.trailers.length - 1 + film.clips.length} more below</span> : null}
              </p>
            ) : null}
          </div>
          <p className="font-semibold text-muted">{meta.join(" · ")}</p>
          <h1 className="font-display text-5xl leading-[0.95] sm:text-7xl">{film.title}</h1>
          {film.filmmaker_accounts ? (
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={film.filmmaker_accounts.display_name} size={44} />
              <p>
                A film by{" "}
                <Link href={`/c/${film.filmmaker_accounts.slug}`} className="font-semibold hover:underline">
                  {film.filmmaker_accounts.display_name}
                </Link>
                {film.rating.count ? (
                  <span className="text-muted">
                    {" "}
                    · {film.rating.average} ★ ({film.rating.count})
                  </span>
                ) : null}
              </p>
              <Suspense fallback={null}>
                <FollowFilmmaker film={film} />
              </Suspense>
            </div>
          ) : null}
          {film.ai_generated ? (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <AiBadge />
              <span className="text-muted">
                Contains AI-generated imagery.{" "}
                <Link href="/legal/ai-policy" className="underline">
                  What this means
                </Link>
              </span>
            </p>
          ) : null}
          {film.synopsis ? <p className="max-w-2xl text-lg text-muted sm:text-xl">{film.synopsis}</p> : null}
        </div>

        <aside className="grid content-start gap-5">
          <Suspense fallback={<Offers film={film} entitled={false} />}>
            <ViewerOffers film={film} />
          </Suspense>
          {film.rating.count ? (
            <div className="card flex items-end justify-between">
              <div>
                <p className="font-display text-4xl">{film.rating.average} ★</p>
                <p className="text-sm text-muted">
                  {film.rating.count} verified review{film.rating.count === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      <Credits film={film} />

      {film.clips.length ? (
        <section className="grid gap-4" aria-label="Clips">
          <h2 className="font-display text-3xl">Clips</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {film.clips.map((c) => (
              <figure key={c.id} className="grid gap-2">
                <div className="overflow-hidden rounded-2xl">
                  <TrailerPlayer filmId={film.id} playbackId={c.mux_playback_id!} title={c.label ?? `${film.title} clip`} />
                </div>
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

/** "Rent for 48 hours" / "Buy (license)" / "Watch free" (mockups 09–10). */
function offerTitle(o: { kind: string; price_cents: number; rental_hours: number | null }) {
  if (o.price_cents === 0) return "Watch free";
  if (o.kind === "buy") return "Buy (license)";
  const h = o.rental_hours ?? 48;
  return `Rent for ${h % 24 === 0 && h > 48 ? `${h / 24} days` : `${h} hours`}`;
}

function Offers({ film, entitled }: { film: PublicFilm; entitled: boolean }) {
  const offers = sortOffers(film.offers);
  const hasBuy = offers.some((o) => o.kind === "buy" && o.price_cents > 0);
  return (
    <div className="card grid gap-3 p-6">
      {entitled ? (
        <Link href={`/watch/${film.slug}`} className="btn-primary justify-center py-4 text-lg">
          ▶ Watch now
        </Link>
      ) : null}
      {offers.map((o, i) => (
        <Link
          key={o.id}
          href={`/checkout/${o.id}`}
          className={`flex items-center justify-between rounded-full px-6 py-4 text-lg font-semibold transition ${
            i === 0 && !entitled ? "bg-accent text-accent-fg hover:brightness-105" : "border border-fg/40 hover:border-fg"
          }`}
        >
          <span>{offerTitle(o)}</span>
          <span>{o.price_cents === 0 ? "Free" : formatCents(o.price_cents)}</span>
        </Link>
      ))}
      {!offers.length ? <p className="text-sm text-muted">Not available to rent or buy right now.</p> : null}
      {hasBuy ? (
        <p className="rounded-2xl border border-accent/80 bg-accent/5 p-4 text-sm" data-testid="license-statement">
          {LICENSE_STATEMENT}{" "}
          <Link href="/legal/license" className="underline">
            License terms
          </Link>
        </p>
      ) : null}
      <p className="text-sm text-muted">Prices plus sales tax. Watch on the web, or cast to your TV. Rentals start when you press play.</p>
    </div>
  );
}

async function FollowFilmmaker({ film }: { film: PublicFilm }) {
  const state = await viewerFilmState(film.id, film.account_id, []);
  if (!film.filmmaker_accounts) return null;
  return (
    <FollowButton
      target={{ accountId: film.account_id }}
      following={state.signedIn ? state.followsAccount : null}
      label={film.filmmaker_accounts.display_name}
      next={`/f/${film.slug}`}
    />
  );
}

async function ViewerOffers({ film }: { film: PublicFilm }) {
  const state = await viewerFilmState(film.id, film.account_id, []);
  return (
    <>
      <Offers film={film} entitled={state.entitled} />
      {state.signedIn ? <AddToList filmId={film.id} lists={state.lists} /> : null}
    </>
  );
}

function Credits({ film }: { film: PublicFilm }) {
  if (!film.credits.length) return null;
  return (
    <section className="grid gap-5" aria-label="Cast and crew">
      <h2 className="font-display text-3xl">Cast and crew</h2>
      <ul className="flex flex-wrap gap-x-10 gap-y-5">
        {film.credits.map((c) =>
          c.people ? (
            <li key={`${c.people.id}-${c.role}`}>
              <Link href={`/p/${c.people.slug}`} className="group flex items-center gap-3">
                <Avatar name={c.people.name} photo={c.people.photo_url ?? null} size={56} />
                <span className="grid">
                  <span className="font-semibold group-hover:underline">{c.people.name}</span>
                  <span className="text-sm text-muted">{c.role}</span>
                </span>
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
