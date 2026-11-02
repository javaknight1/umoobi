import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/app-shell";
import { Avatar } from "@/components/brand";
import { requireFilmmaker } from "@/lib/auth/filmmaker";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Credits & people", robots: { index: false } };

export default function PeoplePage() {
  return (
    <>
      <PageHeader eyebrow="Your page" title="Credits & people" />
      <Suspense fallback={<div className="card h-64" />}>
        <People />
      </Suspense>
    </>
  );
}

/** Everyone credited on this account's films, with claim status. Shares are edited per film. */
async function People() {
  const { account } = await requireFilmmaker("/studio/people");
  const supabase = await createClient();
  const { data: films } = await supabase.from("films").select("id, title").eq("account_id", account.id);
  const ids = (films ?? []).map((f) => f.id);
  const { data: credits } = ids.length
    ? await supabase.from("credits").select("film_id, role, people(id, slug, name, photo_url, claimed_by)").in("film_id", ids)
    : { data: [] };
  const titles = new Map((films ?? []).map((f) => [f.id, f.title]));
  const people = new Map<string, { slug: string; name: string; photo: string | null; claimed: boolean; credits: { filmId: string; role: string }[] }>();
  for (const c of credits ?? []) {
    const p = c.people as unknown as { id: string; slug: string; name: string; photo_url: string | null; claimed_by: string | null } | null;
    if (!p) continue;
    const row = people.get(p.id) ?? { slug: p.slug, name: p.name, photo: p.photo_url, claimed: !!p.claimed_by, credits: [] };
    row.credits.push({ filmId: c.film_id, role: c.role });
    people.set(p.id, row);
  }
  const rows = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
      <section className="card overflow-x-auto">
        {rows.length ? (
          <table className="w-full min-w-[560px] text-left">
            <thead className="text-sm text-muted">
              <tr className="border-b border-line">
                <th className="py-3 font-medium">Person</th>
                <th className="py-3 font-medium">Page</th>
                <th className="py-3 font-medium">Credited on</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.slug} className="border-b border-line last:border-0">
                  <td className="py-3">
                    <Link href={`/p/${p.slug}`} className="flex items-center gap-3 hover:underline">
                      <Avatar name={p.name} photo={p.photo} size={44} />
                      <span>
                        <span className="block font-semibold">{p.name}</span>
                        <span className="block text-sm text-muted">{[...new Set(p.credits.map((c) => c.role))].join(", ")}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="py-3">
                    <span className={`pill px-3 py-1 text-sm ${p.claimed ? "bg-ok/12 text-ok" : "bg-surface-2 text-muted"}`}>
                      {p.claimed ? "Claimed" : "Not claimed"}
                    </span>
                  </td>
                  <td className="py-3 text-sm">
                    {[...new Set(p.credits.map((c) => c.filmId))].map((id, i) => (
                      <span key={id}>
                        {i ? ", " : ""}
                        <Link href={`/studio/films/${id}/credits`} className="hover:underline">
                          {titles.get(id)}
                        </Link>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted">No credits yet. Add cast and crew from a film&apos;s Credits tab.</p>
        )}
      </section>
      <aside className="card grid content-start gap-3">
        <h2 className="font-display text-xl">How credit pages work</h2>
        <p className="text-muted">
          Each person gets a public page listing their films. When they claim it, they can add a photo and bio. Viewers
          can follow them. Revenue shares are set on each film&apos;s Credits tab.
        </p>
      </aside>
    </div>
  );
}
