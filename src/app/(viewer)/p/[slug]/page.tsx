import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FilmCard } from "@/components/film/film-card";
import { FollowButton } from "@/components/social/follow-button";
import { getPerson } from "@/lib/films/queries";
import { isFollowing } from "@/lib/viewer";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPerson(slug);
  if (!page) return { title: "Not found" };
  return {
    title: page.person.name,
    description: page.person.bio ?? `${page.person.name} on Umoobi.`,
    openGraph: page.person.photo_url ? { images: [{ url: page.person.photo_url }] } : undefined,
  };
}

export default function PersonPage({ params }: PageProps<"/p/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-surface" />}>
        <Body params={params} />
      </Suspense>
    </main>
  );
}

async function Body({ params }: Pick<PageProps<"/p/[slug]">, "params">) {
  const { slug } = await params;
  const page = await getPerson(slug);
  if (!page) notFound();
  const { person, films } = page;
  const roles = [...new Set(films.flatMap((f) => f.roles))];

  return (
    <div className="grid gap-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        {person.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.photo_url} alt={person.name} className="h-32 w-32 rounded-full object-cover" />
        ) : (
          <div aria-hidden className="flex h-32 w-32 items-center justify-center rounded-full bg-surface font-display text-5xl">
            {person.name.slice(0, 1)}
          </div>
        )}
        <div className="grid gap-2">
          <h1 className="font-display text-5xl">{person.name}</h1>
          {roles.length ? <p className="text-muted">{roles.join(" · ")}</p> : null}
          {person.bio ? <p className="max-w-2xl">{person.bio}</p> : null}
          {!person.claimed_by ? <p className="text-xs text-muted">This page hasn&apos;t been claimed yet.</p> : null}
          <Suspense fallback={null}>
            <Follow personId={person.id} name={person.name.split(" ")[0]} slug={person.slug} />
          </Suspense>
        </div>
      </header>

      <section className="grid gap-4" aria-label="Films">
        <h2 className="font-display text-3xl">Films</h2>
        {films.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {films.map(({ film, roles }) => (
              <div key={film.id} className="grid content-start gap-1">
                <FilmCard film={film} />
                <p className="text-xs text-muted">{roles.join(", ")}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No published films yet.</p>
        )}
      </section>
    </div>
  );
}

async function Follow({ personId, name, slug }: { personId: string; name: string; slug: string }) {
  const following = await isFollowing({ personId });
  return (
    <div>
      <FollowButton target={{ personId }} following={following} label={name} next={`/p/${slug}`} />
    </div>
  );
}
