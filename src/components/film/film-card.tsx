import Link from "next/link";
import { Poster as BrandPoster } from "@/components/brand";
import { priceLine } from "@/lib/films/format";
import type { FilmCard as Card } from "@/lib/films/queries";

export function AiBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Contains AI-generated imagery"
      className={`inline-flex items-center rounded-full border border-warn/60 bg-bg/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-warn ${className}`}
    >
      AI-generated
    </span>
  );
}

/** Poster image, or a generated geometric poster (see components/brand). */
export function Poster({
  title,
  url,
  slug,
  by,
  className = "",
}: {
  title: string;
  url: string | null;
  slug?: string;
  by?: string | null;
  className?: string;
}) {
  return <BrandPoster title={title} url={url} slug={slug} by={by} className={className} />;
}

/** "Drama · 94 min", or "Short · 4 min" when there's no genre. */
function metaLine(film: Card) {
  const mins = film.runtime_seconds ? Math.round(film.runtime_seconds / 60) : null;
  const kind = film.genre ?? (mins !== null && mins < 40 ? "Short" : null);
  return [kind, mins !== null ? `${mins} min` : null].filter(Boolean).join(" · ");
}

export function FilmCard({ film }: { film: Card }) {
  const price = priceLine(film.offers);
  return (
    <Link href={`/f/${film.slug}`} className="group grid content-start gap-2.5" data-testid="film-card">
      <div className="relative">
        <Poster
          title={film.title}
          url={film.poster_url}
          slug={film.slug}
          by={film.filmmaker_accounts?.display_name}
          className="transition duration-200 group-hover:-translate-y-0.5 group-hover:brightness-110"
        />
        {film.ai_generated ? <AiBadge className="absolute bottom-2 right-2" /> : null}
      </div>
      <div className="grid gap-0.5">
        <p className="font-semibold leading-snug">{film.title}</p>
        <p className="text-sm text-muted">{metaLine(film)}</p>
        {price ? <p className="mt-1 text-sm font-semibold text-accent">{price}</p> : null}
      </div>
    </Link>
  );
}

export function FilmGrid({ films, empty = "No films here yet." }: { films: Card[]; empty?: string }) {
  if (!films.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {films.map((f) => (
        <FilmCard key={f.id} film={f} />
      ))}
    </div>
  );
}

/** A titled, horizontally scrolling row of films. Renders nothing when empty. */
export function Shelf({ title, films, href, note, id }: { title: string; films: Card[]; href?: string; note?: string; id?: string }) {
  if (!films.length) return null;
  return (
    <section id={id} className="grid scroll-mt-24 gap-4" aria-label={title}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl sm:text-3xl">{title}</h2>
        {note ? <span className="text-sm text-muted">{note}</span> : null}
        {href ? (
          <Link href={href} className="text-sm text-muted hover:text-fg">
            See all
          </Link>
        ) : null}
      </div>
      <div className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-2">
        {films.map((f) => (
          <div key={f.id} className="w-40 shrink-0 snap-start sm:w-48">
            <FilmCard film={f} />
          </div>
        ))}
      </div>
    </section>
  );
}
