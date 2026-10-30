import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FilmGrid } from "@/components/film/film-card";
import { getFilmCards } from "@/lib/films/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "List" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ListPage({ params }: PageProps<"/lists/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-surface" />}>
        <Body params={params} />
      </Suspense>
    </main>
  );
}

/** Public lists are visible to anyone; private ones only to their owner (RLS). */
async function Body({ params }: Pick<PageProps<"/lists/[id]">, "params">) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("lists")
    .select("id, title, description, is_public, list_items(film_id, position)")
    .eq("id", id)
    .maybeSingle();
  if (!list) notFound();
  const films = await getFilmCards([...list.list_items].sort((a, b) => a.position - b.position).map((i) => i.film_id));
  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <p className="text-xs uppercase tracking-widest text-muted">{list.is_public ? "Public list" : "Private list"}</p>
        <h1 className="font-display text-5xl">{list.title}</h1>
        {list.description ? <p className="max-w-2xl text-muted">{list.description}</p> : null}
      </header>
      <FilmGrid films={films} empty="No films on this list yet." />
    </div>
  );
}
