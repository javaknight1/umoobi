import Link from "next/link";
import { Suspense } from "react";
import { requireOwnFilm } from "@/lib/auth/filmmaker";
import { createClient } from "@/lib/supabase/server";
import { FilmTabs } from "./film-tabs";

/** One film's editor (mockup 03): breadcrumb, title, Save draft / Publish, five-step stepper. */
export default function FilmLayout({ children, params }: LayoutProps<"/studio/films/[id]">) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Suspense fallback={<div className="h-24" />}>
        <FilmHeader params={params} />
      </Suspense>
      <Suspense fallback={<div className="h-10" />}>
        <FilmTabs />
      </Suspense>
      {children}
    </div>
  );
}

async function FilmHeader({ params }: Pick<LayoutProps<"/studio/films/[id]">, "params">) {
  const { id } = await params;
  const { film } = await requireOwnFilm(id);
  const supabase = await createClient();
  const { data: blockers } = await supabase.rpc("publish_blockers", { f: id });
  const live = film.status === "published";
  const blocked = (blockers ?? []).length > 0;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow">
          <Link href="/studio/films" className="hover:text-fg">
            Films
          </Link>{" "}
          / {film.status === "draft" ? "New film" : film.title}
        </p>
        <h1 className="truncate font-display text-4xl sm:text-5xl">{film.title}</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {live ? (
          <Link href={`/f/${film.slug}`} className="btn-ghost">
            View film page
          </Link>
        ) : (
          <Link href="/studio/films" className="btn-ghost" title="Changes save as you go">
            Save draft
          </Link>
        )}
        {live || film.status === "pulled" ? (
          <Link href={`/studio/films/${id}/publish`} className="btn-dark">
            Status
          </Link>
        ) : blocked ? (
          <span className="flex items-center gap-2">
            <Link href={`/studio/films/${id}/publish`} className="text-sm text-muted underline underline-offset-2">
              {blockers!.length} to do
            </Link>
            <button disabled aria-disabled className="btn bg-muted/40 text-white" title={blockers!.join("\n")}>
              Publish
            </button>
          </span>
        ) : (
          <Link href={`/studio/films/${id}/publish`} className="btn-dark">
            Publish
          </Link>
        )}
      </div>
    </div>
  );
}
