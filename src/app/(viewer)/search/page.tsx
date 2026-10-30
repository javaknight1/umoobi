import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilmGrid } from "@/components/film/film-card";
import { HideAiToggle } from "@/components/film/hide-ai-toggle";
import { searchCatalog } from "@/lib/films/queries";
import { hideAiPreference } from "@/lib/viewer";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-8 px-4 py-8">
      <h1 className="font-display text-5xl">Search</h1>
      <Suspense fallback={<div className="h-12 rounded-lg bg-surface" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const { q: raw } = await searchParams;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 100);
  const hideAi = await hideAiPreference();
  const results = q ? await searchCatalog(q, { hideAi }) : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <form action="/search" className="flex flex-1 gap-2" role="search">
          <label htmlFor="q" className="sr-only">
            Search films and people
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Films, actors, directors…" className="field flex-1" />
          <button className="btn-primary">Search</button>
        </form>
        <HideAiToggle on={hideAi} next={q ? `/search?q=${encodeURIComponent(q)}` : "/search"} />
      </div>

      {results ? (
        <>
          {results.people.length ? (
            <section className="grid gap-3" aria-label="People">
              <h2 className="font-display text-2xl">People</h2>
              <ul className="flex flex-wrap gap-2">
                {results.people.map((p) => (
                  <li key={p!.id}>
                    <Link href={`/p/${p!.slug}`} className="card block px-4 py-2 hover:border-fg/40">
                      {p!.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="grid gap-3" aria-label="Films">
            <h2 className="font-display text-2xl">Films</h2>
            <FilmGrid films={results.films} empty={`No films match “${q}”.`} />
          </section>
        </>
      ) : (
        <p className="text-muted">Search by title, genre, story or name.</p>
      )}
    </>
  );
}
