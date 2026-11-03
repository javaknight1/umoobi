import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Poster, posterColors } from "@/components/brand";
import { Shelf } from "@/components/film/film-card";
import { HideAiToggle } from "@/components/film/hide-ai-toggle";
import { sortOffers } from "@/lib/films/format";
import { getFilmCards, getPublicFilm, getStaffShelves, getTrending, listFilms, listGenres, type FilmCard } from "@/lib/films/queries";
import { formatCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { hideAiPreference } from "@/lib/viewer";

export const metadata: Metadata = {
  title: "Discover independent films",
  description: "Rent or buy independent films directly from the people who made them.",
};

export default function DiscoverPage() {
  return (
    <main className="mx-auto grid w-full max-w-[90rem] flex-1 gap-12 px-4 py-8 sm:px-8">
      <Suspense fallback={<ShelvesSkeleton />}>
        <Shelves />
      </Suspense>
    </main>
  );
}

async function Shelves() {
  await connection(); // "new this week" reads the clock
  const hideAi = await hideAiPreference();
  const [staff, trending, fresh, shorts, genres, because, following] = await Promise.all([
    getStaffShelves({ hideAi }),
    getTrending({ hideAi }),
    listFilms({ hideAi, publishedWithinDays: 7 }),
    listFilms({ hideAi, shortsOnly: true }),
    listGenres(),
    becauseYouWatched(hideAi),
    fromFollowing(hideAi),
  ]);
  const genreShelves = await Promise.all(genres.map(async (g) => ({ genre: g, films: await listFilms({ hideAi, genre: g }) })));
  const featured = trending[0] ?? staff[0]?.films[0];

  return (
    <>
      {featured ? <Hero film={featured} /> : null}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl">Discover</h1>
        <HideAiToggle on={hideAi} next="/discover" />
      </header>
      {because.length ? <Shelf title="Because you watched" films={because} /> : null}
      {staff.map((s) => (
        <Shelf key={s.slug} title={s.title} films={s.films} />
      ))}
      <Shelf title="Trending" films={trending} />
      <Shelf id="new" title="New this week" films={fresh} />
      <Shelf id="shorts" title="Shorts" note="Under 40 minutes" films={shorts} />
      <Shelf id="following" title="From people you follow" films={following} />
      {genreShelves.map((g) => (
        <Shelf key={g.genre} title={g.genre} films={g.films} />
      ))}
    </>
  );
}

/** "Trending this week" banner (mockup 14), colored like the film's poster. */
async function Hero({ film }: { film: FilmCard }) {
  const full = await getPublicFilm(film.slug);
  const first = sortOffers(film.offers)[0];
  const { bg, title } = posterColors(film.slug, film.title);
  const by = film.filmmaker_accounts?.display_name;
  return (
    <section className="relative grid overflow-hidden rounded-3xl md:grid-cols-[1.1fr_1fr]" style={{ background: bg, color: title }}>
      <div className="grid content-center gap-5 p-8 sm:p-12">
        <p className="font-semibold uppercase tracking-widest text-sm">Trending this week</p>
        <p className="font-display text-5xl leading-[0.95] sm:text-7xl">{film.title}</p>
        {full?.synopsis ? <p className="max-w-xl text-lg">{full.synopsis}</p> : null}
        <div className="flex flex-wrap gap-3">
          {first ? (
            <Link href={`/f/${film.slug}`} className="btn bg-accent px-6 py-3 text-base text-accent-fg">
              {first.price_cents === 0 ? "Watch free" : `${first.kind === "rent" ? "Rent" : "Buy"} ${formatCents(first.price_cents)}`}
            </Link>
          ) : null}
          <Link href={`/f/${film.slug}`} className="btn border border-current px-6 py-3 text-base">
            Watch trailer
          </Link>
        </div>
      </div>
      <div className="hidden items-center justify-end bg-black/10 p-6 pr-14 md:flex">
        <div className="w-60">
          <Poster title={film.title} url={film.poster_url} slug={film.slug} by={by} className="shadow-2xl" />
        </div>
      </div>
    </section>
  );
}

/** Films sharing people or genres with what the signed-in viewer has rented or bought. */
async function becauseYouWatched(hideAi: boolean) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase.rpc("because_you_watched", { p_limit: 12 });
  return getFilmCards((data ?? []).map((r) => r.film_id), { hideAi });
}

/** Published films by filmmakers the viewer follows, or crediting people they follow. */
async function fromFollowing(hideAi: boolean) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data: follows } = await supabase.from("follows").select("account_id, person_id").eq("follower_id", auth.user.id);
  const accounts = (follows ?? []).map((f) => f.account_id).filter((v): v is string => !!v);
  const people = (follows ?? []).map((f) => f.person_id).filter((v): v is string => !!v);
  const [byAccount, byPerson] = await Promise.all([
    accounts.length ? supabase.from("films").select("id").eq("status", "published").in("account_id", accounts).limit(24) : Promise.resolve({ data: [] }),
    people.length ? supabase.from("credits").select("film_id").in("person_id", people).limit(48) : Promise.resolve({ data: [] }),
  ]);
  const ids = [...new Set([...(byAccount.data ?? []).map((f: { id: string }) => f.id), ...(byPerson.data ?? []).map((c: { film_id: string }) => c.film_id)])];
  return getFilmCards(ids.slice(0, 24), { hideAi });
}

function ShelvesSkeleton() {
  return (
    <div className="grid gap-8" aria-busy>
      <div className="h-72 rounded-3xl bg-surface" />
      {[0, 1].map((i) => (
        <div key={i} className="grid gap-3">
          <div className="h-7 w-40 rounded bg-surface" />
          <div className="flex gap-5">
            {[0, 1, 2, 3, 4].map((j) => (
              <div key={j} className="aspect-[2/3] w-40 rounded-xl bg-surface" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
