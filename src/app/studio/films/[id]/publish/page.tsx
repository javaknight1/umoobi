import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StatusForm } from "@/components/app/status-form";
import { requireOwnFilm } from "@/lib/auth/filmmaker";
import { createClient } from "@/lib/supabase/server";
import { addAiLabel, disputeAiFlag, publishFilm, pullFilm, rerunChecks } from "../../actions";
import { FilmStatus } from "../../status";

export const metadata: Metadata = { title: "Publish · Studio", robots: { index: false } };

export default function PublishPage({ params }: PageProps<"/studio/films/[id]/publish">) {
  return (
    <Suspense fallback={<div className="card h-64" />}>
      <Publish params={params} />
    </Suspense>
  );
}

async function Publish({ params }: Pick<PageProps<"/studio/films/[id]/publish">, "params">) {
  const { id } = await params;
  const { film } = await requireOwnFilm(id);
  const supabase = await createClient();
  const [{ data: blockers }, { data: disputes }] = await Promise.all([
    supabase.rpc("publish_blockers", { f: id }),
    supabase.from("review_items").select("id, status").eq("film_id", id).eq("kind", "ai_flag").eq("status", "open"),
  ]);
  const list = blockers ?? [];
  const live = film.status === "published";
  const undeclaredAiFlag = film.ai_flagged && !film.ai_generated && !film.staff_approved;

  return (
    <div className="grid gap-6">
      <section className="card grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl">Status</h2>
          <FilmStatus status={film.status} />
          {film.vetting_score !== null ? <span className="text-sm text-muted">Check score {film.vetting_score}</span> : null}
        </div>
        {film.status === "checking" ? <p className="text-sm text-muted">We&apos;re checking rights and content. This usually takes a few minutes.</p> : null}
        {film.status === "review" ? (
          <p className="text-sm text-muted">Our automatic checks weren&apos;t sure, so a person is looking. We answer within 24 hours.</p>
        ) : null}
        {film.status === "rejected" && film.rejection_reason ? <p className="text-sm text-bad">{film.rejection_reason}</p> : null}
        {film.status === "hidden" ? (
          <p className="text-sm text-bad">This film is hidden from sale while staff look at an AI-imagery report. We decide within 24 hours.</p>
        ) : null}
        {film.status === "pulled" ? (
          <p className="text-sm text-muted">
            Pulled{film.pulled_at ? ` on ${film.pulled_at.slice(0, 10)}` : ""}. New sales are off and recent purchases are being refunded.
          </p>
        ) : null}
        {live ? (
          <p className="text-sm">
            Live at{" "}
            <Link href={`/f/${film.slug}`} className="underline underline-offset-2">
              /f/{film.slug}
            </Link>
          </p>
        ) : null}
        {film.status === "rejected" ? (
          <form action={rerunChecks}>
            <input type="hidden" name="film_id" value={id} />
            <button className="btn-ghost">Run the checks again</button>
          </form>
        ) : null}
      </section>

      {undeclaredAiFlag ? (
        <section className="card grid gap-3 border-warn/60">
          <h2 className="font-display text-2xl">Our scan found AI-generated imagery</h2>
          <p className="text-sm text-muted">
            The film is declared as having no AI-generated imagery, but some sampled frames look generated. Add the
            label to publish, or ask a person to check (scanners do misfire).
          </p>
          <div className="flex flex-wrap gap-3">
            <form action={addAiLabel}>
              <input type="hidden" name="film_id" value={id} />
              <button className="btn-primary">Add the AI-generated label</button>
            </form>
            {disputes?.length ? (
              <p className="text-sm text-muted">Staff are reviewing your dispute.</p>
            ) : (
              <form action={disputeAiFlag}>
                <input type="hidden" name="film_id" value={id} />
                <button className="btn-ghost">Dispute the flag</button>
              </form>
            )}
          </div>
        </section>
      ) : null}

      {!live && film.status !== "pulled" && film.status !== "hidden" ? (
        <section className="card grid gap-3">
          <h2 className="font-display text-2xl">Publish</h2>
          {list.length ? (
            <>
              <p className="text-sm text-muted">Before you can publish:</p>
              <ul className="grid gap-1 text-sm" aria-label="Publish blockers">
                {list.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span aria-hidden className="text-warn">
                      •
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <StatusForm action={publishFilm} submit="Publish film" pendingLabel="Publishing…">
              <input type="hidden" name="film_id" value={id} />
              <p className="text-sm text-muted">Everything checks out. Publishing makes the film page public and opens sales.</p>
            </StatusForm>
          )}
        </section>
      ) : null}

      {live || film.status === "hidden" ? (
        <section className="card grid gap-3">
          <h2 className="font-display text-2xl">Pull this film</h2>
          <p className="text-sm text-muted">
            New sales stop right away. Purchases from the last 30 days are refunded automatically and taken from your
            share. Viewers with an active rental can finish watching.
          </p>
          <StatusForm action={pullFilm} submit="Pull film" pendingLabel="Pulling…" buttonClassName="btn border border-bad text-bad justify-self-start">
            <input type="hidden" name="film_id" value={id} />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="confirm" className="mt-1" />
              <span>I understand sales stop and recent buyers are refunded.</span>
            </label>
          </StatusForm>
        </section>
      ) : null}
    </div>
  );
}
