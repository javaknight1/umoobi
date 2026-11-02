import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FilmCard } from "@/components/film/film-card";
import { initials } from "@/components/brand";
import { FollowButton } from "@/components/social/follow-button";
import { ShareButton } from "@/components/social/share-button";
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
    <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-10 sm:px-8 sm:py-14">
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
    <div className="grid gap-14">
      <header className="flex flex-col gap-8 sm:flex-row sm:items-center sm:gap-14">
        {person.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.photo_url} alt={person.name} className="h-40 w-40 rounded-full object-cover sm:h-56 sm:w-56" />
        ) : (
          <div
            aria-hidden
            className="flex h-40 w-40 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#c8ecf8,#5ab6d6_75%)] font-display text-6xl text-[#123a4a] sm:h-56 sm:w-56 sm:text-8xl"
          >
            {initials(person.name)}
          </div>
        )}
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {roles.slice(0, 3).map((r) => (
              <span key={r} className="pill bg-surface-2 px-3 py-1 text-sm text-fg">
                {r}
              </span>
            ))}
            {person.claimed_by ? <span className="pill bg-ok/15 px-3 py-1 text-sm text-ok">✓ Claimed page</span> : null}
          </div>
          <h1 className="font-display text-5xl leading-none sm:text-7xl">{person.name}</h1>
          <p className="text-lg text-muted">
            {films.length} film{films.length === 1 ? "" : "s"} on Umoobi
          </p>
          {person.bio ? <p className="max-w-2xl text-lg">{person.bio}</p> : null}
          {!person.claimed_by ? <p className="text-sm text-muted">This page hasn&apos;t been claimed yet.</p> : null}
          <div className="flex flex-wrap gap-3">
            <Suspense fallback={null}>
              <Follow personId={person.id} name={person.name.split(" ")[0]} slug={person.slug} />
            </Suspense>
            <ShareButton title={person.name} />
          </div>
        </div>
      </header>

      <section className="grid gap-5" aria-label="Films">
        <h2 className="font-display text-3xl">Films</h2>
        {films.length ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-5">
            {films.map(({ film, roles }) => (
              <div key={film.id} className="grid content-start gap-1">
                <FilmCard film={film} />
                <p className="text-sm text-muted">{roles.join(", ")}</p>
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
