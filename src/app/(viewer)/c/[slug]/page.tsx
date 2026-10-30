import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FilmGrid } from "@/components/film/film-card";
import { FollowButton } from "@/components/social/follow-button";
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
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
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
    <div className="grid gap-8">
      <header className="grid gap-3">
        <p className="text-xs uppercase tracking-widest text-muted">Filmmaker</p>
        <h1 className="font-display text-5xl">{account.display_name}</h1>
        {account.website && hostOf(account.website) ? (
          <a href={account.website} rel="nofollow noopener" target="_blank" className="text-sm text-muted underline">
            {hostOf(account.website)}
          </a>
        ) : null}
        <Suspense fallback={null}>
          <Follow accountId={account.id} name={account.display_name} slug={account.slug} />
        </Suspense>
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
