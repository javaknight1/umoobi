import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { addFilmToShelf, createShelf, removeFilmFromShelf, toggleShelf } from "./actions";

export const metadata: Metadata = { title: "Shelves · Staff", robots: { index: false } };

export default function StaffShelvesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="font-display text-4xl">Featured shelves</h1>
      <p className="mt-1 text-sm text-muted">Staff-curated rows on Discover. Trending, new, genre and shorts shelves fill themselves.</p>
      <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
        <Shelves />
      </Suspense>
    </main>
  );
}

async function Shelves() {
  await requireStaff("/staff/shelves");
  const { data: shelves } = await createAdminClient()
    .from("shelves")
    .select("id, title, active, position, shelf_items(position, films(id, slug, title))")
    .order("position");

  return (
    <div className="mt-8 grid gap-6">
      <form action={createShelf} className="card flex flex-wrap items-end gap-2">
        <div className="grid flex-1 gap-1">
          <label htmlFor="shelf-title" className="label">
            New shelf
          </label>
          <input id="shelf-title" name="title" required className="field" placeholder="Island stories" />
        </div>
        <button className="btn-primary">Create shelf</button>
      </form>

      {(shelves ?? []).map((s) => (
        <section key={s.id} className="card grid gap-3" aria-label={s.title}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl">
              {s.title} {!s.active ? <span className="text-sm text-muted">(hidden)</span> : null}
            </h2>
            <form action={toggleShelf}>
              <input type="hidden" name="shelf_id" value={s.id} />
              <input type="hidden" name="active" value={s.active ? "0" : "1"} />
              <button className="btn-ghost px-3 py-1">{s.active ? "Hide" : "Show"}</button>
            </form>
          </div>
          <ul className="grid gap-1 text-sm">
            {[...s.shelf_items]
              .sort((a, b) => a.position - b.position)
              .map((i) =>
                i.films ? (
                  <li key={i.films.id} className="flex items-center justify-between gap-2">
                    <span>{i.films.title}</span>
                    <form action={removeFilmFromShelf}>
                      <input type="hidden" name="shelf_id" value={s.id} />
                      <input type="hidden" name="film_id" value={i.films.id} />
                      <button className="text-bad" aria-label={`Remove ${i.films.title} from ${s.title}`}>
                        Remove
                      </button>
                    </form>
                  </li>
                ) : null,
              )}
          </ul>
          <form action={addFilmToShelf} className="flex flex-wrap gap-2">
            <input type="hidden" name="shelf_id" value={s.id} />
            <label htmlFor={`add-${s.id}`} className="sr-only">
              Film slug or link for {s.title}
            </label>
            <input id={`add-${s.id}`} name="film_slug" required className="field flex-1" placeholder="Film link or slug, e.g. tidepool" />
            <button className="btn-ghost">Add film</button>
          </form>
        </section>
      ))}
    </div>
  );
}
