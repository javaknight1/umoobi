import Link from "next/link";
import { formatRuntime, fromPrice } from "@/lib/films/format";
import type { FilmCard as Card } from "@/lib/films/queries";

export function AiBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Contains AI-generated imagery"
      className={`inline-flex items-center rounded-full border border-warn/60 bg-warn/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-warn ${className}`}
    >
      AI-generated
    </span>
  );
}

/** Poster, or a warm gradient with the title when there's no poster yet. */
export function Poster({ title, url, className = "" }: { title: string; url: string | null; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`${title} poster`} className={`aspect-[2/3] w-full rounded-xl object-cover ${className}`} />;
  }
  return (
    <div
      aria-hidden
      className={`flex aspect-[2/3] w-full items-end rounded-xl bg-[radial-gradient(circle_at_30%_20%,#4a3726,#14110e_75%)] p-3 ${className}`}
    >
      <span className="font-display text-xl leading-tight text-fg/90">{title}</span>
    </div>
  );
}

export function FilmCard({ film }: { film: Card }) {
  const price = fromPrice(film.offers);
  return (
    <Link href={`/f/${film.slug}`} className="group grid content-start gap-2" data-testid="film-card">
      <div className="relative">
        <Poster title={film.title} url={film.poster_url} className="transition group-hover:brightness-110" />
        {film.ai_generated ? <AiBadge className="absolute left-2 top-2 bg-bg/80" /> : null}
      </div>
      <div>
        <p className="font-medium leading-snug">{film.title}</p>
        <p className="text-xs text-muted">
          {[film.filmmaker_accounts?.display_name, film.release_year, formatRuntime(film.runtime_seconds)].filter(Boolean).join(" · ")}
        </p>
        {price ? <p className="mt-1 text-sm text-accent">{price}</p> : null}
      </div>
    </Link>
  );
}

export function FilmGrid({ films, empty = "No films here yet." }: { films: Card[]; empty?: string }) {
  if (!films.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {films.map((f) => (
        <FilmCard key={f.id} film={f} />
      ))}
    </div>
  );
}

/** A titled, horizontally scrolling row of films. Renders nothing when empty. */
export function Shelf({ title, films, href }: { title: string; films: Card[]; href?: string }) {
  if (!films.length) return null;
  return (
    <section className="grid gap-3" aria-label={title}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl">{title}</h2>
        {href ? (
          <Link href={href} className="text-sm text-muted hover:text-fg">
            See all
          </Link>
        ) : null}
      </div>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {films.map((f) => (
          <div key={f.id} className="w-36 shrink-0 snap-start sm:w-44">
            <FilmCard film={f} />
          </div>
        ))}
      </div>
    </section>
  );
}
