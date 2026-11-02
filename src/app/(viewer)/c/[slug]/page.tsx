import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FilmGrid } from "@/components/film/film-card";
import { Avatar } from "@/components/brand";
import { FollowButton } from "@/components/social/follow-button";
import { ShareButton } from "@/components/social/share-button";
import { getFilmmakerPage } from "@/lib/films/queries";
import { hostOf } from "@/lib/vetting/account";
import { isFollowing } from "@/lib/viewer";

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getFilmmakerPage(slug);
  if (!page) return { title: "Not found" };
  return { title: page.account.display_name, description: `Films by ${page.account.display_name} on Umoobi.` };
}

export default function FilmmakerPage({ params }: PageProps<"/c/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-surface" />}>
        <Body params={params} />
      </Suspense>
    </main>
  );
}

async function Body({ params }: Pick<PageProps<"/c/[slug]">, "params">) {
  const { slug } = await params;
  const page = await getFilmmakerPage(slug);
  if (!page) notFound();
  const { account, films } = page;
  return (
    <div className="grid gap-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
        <Avatar name={account.display_name} size={144} />
        <div className="grid gap-3">
          <span className="pill w-fit bg-surface-2 px-3 py-1 text-sm">Filmmaker</span>
          <h1 className="font-display text-5xl leading-none sm:text-7xl">{account.display_name}</h1>
          <p className="text-lg text-muted">
            {films.length} film{films.length === 1 ? "" : "s"} on Umoobi
          </p>
          {account.website && hostOf(account.website) ? (
            <a href={account.website} rel="nofollow noopener" target="_blank" className="text-sm text-muted underline">
              {hostOf(account.website)}
            </a>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Suspense fallback={null}>
              <Follow accountId={account.id} name={account.display_name} slug={account.slug} />
            </Suspense>
            <ShareButton title={account.display_name} />
          </div>
        </div>
      </header>
      <FilmGrid films={films} empty="No published films yet." />
    </div>
  );
}

async function Follow({ accountId, name, slug }: { accountId: string; name: string; slug: string }) {
  const following = await isFollowing({ accountId });
  return (
    <div>
      <FollowButton target={{ accountId }} following={following} label={name} next={`/c/${slug}`} />
    </div>
  );
}
