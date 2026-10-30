import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Shelf } from "@/components/film/film-card";
import { HideAiToggle } from "@/components/film/hide-ai-toggle";
import { getFilmCards, getStaffShelves, getTrending, listFilms, listGenres } from "@/lib/films/queries";
import { createClient } from "@/lib/supabase/server";
import { hideAiPreference } from "@/lib/viewer";

export const metadata: Metadata = {
  title: "Discover independent films",
  description: "Rent or buy independent films directly from the people who made them.",
};

export default function DiscoverPage() {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-8">
      <Suspense fallback={<ShelvesSkeleton />}>
        <Shelves />
      </Suspense>
    </main>
  );
}

async function Shelves() {
  await connection(); // "new this week" reads the clock
  const hideAi = await hideAiPreference();
  const [staff, trending, fresh, shorts, genres, because] = await Promise.all([
    getStaffShelves({ hideAi }),
    getTrending({ hideAi }),
    listFilms({ hideAi, publishedWithinDays: 7 }),
    listFilms({ hideAi, shortsOnly: true }),
    listGenres(),
    becauseYouWatched(hideAi),
  ]);
  const genreShelves = await Promise.all(genres.map(async (g) => ({ genre: g, films: await listFilms({ hideAi, genre: g }) })));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">Discover</h1>
          <p className="text-muted">Independent films, straight from the people who made them.</p>
        </div>
        <HideAiToggle on={hideAi} next="/discover" />
      </header>
      {because.length ? <Shelf title="Because you watched" films={because} /> : null}
      {staff.map((s) => (
        <Shelf key={s.slug} title={s.title} films={s.films} />
      ))}
      <Shelf title="Trending" films={trending} />
      <Shelf title="New this week" films={fresh} />
      <Shelf title="Shorts" films={shorts} />
      {genreShelves.map((g) => (
        <Shelf key={g.genre} title={g.genre} films={g.films} />
      ))}
    </>
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

function ShelvesSkeleton() {
  return (
    <div className="grid gap-8" aria-busy>
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid gap-3">
          <div className="h-7 w-40 rounded bg-surface" />
          <div className="flex gap-4">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="aspect-[2/3] w-36 rounded-xl bg-surface" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
