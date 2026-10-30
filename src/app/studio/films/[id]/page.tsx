import type { Metadata } from "next";
import { Suspense } from "react";
import { StatusForm } from "@/components/app/status-form";
import { requireOwnFilm } from "@/lib/auth/filmmaker";
import { confirmRights, declareAi, saveDetails, uploadPoster } from "../actions";
import { FilmStatus } from "../status";

export const metadata: Metadata = { title: "Film details · Studio", robots: { index: false } };

export default function FilmDetailsPage({ params }: PageProps<"/studio/films/[id]">) {
  return (
    <Suspense fallback={<div className="card h-96" />}>
      <Details params={params} />
    </Suspense>
  );
}

const GENRES = ["Drama", "Comedy", "Documentary", "Horror", "Thriller", "Romance", "Science fiction", "Animation", "Experimental", "Family", "Music", "Western"];
const RATINGS = ["G", "PG", "PG-13", "R", "NC-17", "Not rated"];

async function Details({ params }: Pick<PageProps<"/studio/films/[id]">, "params">) {
  const { id } = await params;
  const { film } = await requireOwnFilm(id);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl">{film.title}</h1>
        <FilmStatus status={film.status} />
      </div>

      <section className="card grid gap-4">
        <h2 className="font-display text-2xl">Details</h2>
        <StatusForm action={saveDetails} submit="Save details">
          <input type="hidden" name="film_id" value={film.id} />
          <Field id="title" label="Title" defaultValue={film.title} />
          <div className="grid gap-1">
            <label htmlFor="synopsis" className="label">
              Synopsis
            </label>
            <textarea id="synopsis" name="synopsis" rows={4} defaultValue={film.synopsis ?? ""} className="field" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label htmlFor="genre" className="label">
                Genre
              </label>
              <select id="genre" name="genre" defaultValue={film.genre ?? ""} className="field">
                <option value="">Choose…</option>
                {GENRES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <label htmlFor="content_rating" className="label">
                Rating
              </label>
              <select id="content_rating" name="content_rating" defaultValue={film.content_rating ?? ""} className="field">
                <option value="">Choose…</option>
                {RATINGS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <Field id="release_year" label="Year" defaultValue={film.release_year?.toString() ?? ""} inputMode="numeric" />
            <Field id="runtime_minutes" label="Runtime (minutes)" defaultValue={film.runtime_seconds ? String(Math.round(film.runtime_seconds / 60)) : ""} inputMode="decimal" />
          </div>
        </StatusForm>
      </section>

      <section className="card grid gap-4">
        <h2 className="font-display text-2xl">Poster</h2>
        <div className="flex flex-wrap items-start gap-4">
          {film.poster_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={film.poster_url} alt={`${film.title} poster`} className="h-48 w-32 rounded-lg object-cover" />
          ) : (
            <div className="grid h-48 w-32 place-items-center rounded-lg border border-dashed border-line text-xs text-muted">No poster</div>
          )}
          <StatusForm action={uploadPoster} submit="Upload poster" pendingLabel="Uploading…">
            <input type="hidden" name="film_id" value={film.id} />
            <label htmlFor="poster" className="label">
              Poster image (JPG, PNG or WebP, 2:3, up to 5 MB)
            </label>
            <input id="poster" name="poster" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
          </StatusForm>
        </div>
      </section>

      <section className="card grid gap-4" id="ai">
        <h2 className="font-display text-2xl">AI-generated imagery</h2>
        <p className="text-sm text-muted">
          Films made with generative AI are welcome, but they&apos;re labeled. If even one frame, shot or scene is clearly
          AI-generated, the film page shows an &ldquo;AI-generated&rdquo; label.
        </p>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-line p-4">
            <p className="font-medium">Counts as AI-generated</p>
            <ul className="mt-2 list-disc pl-5 text-muted">
              <li>Any frame, shot or scene whose picture was created by a generative model</li>
              <li>Text-to-video or image-to-video</li>
              <li>Generated characters, sets or backgrounds</li>
              <li>Generative face or body swaps and de-aging</li>
            </ul>
          </div>
          <div className="rounded-xl border border-line p-4">
            <p className="font-medium">Doesn&apos;t count</p>
            <ul className="mt-2 list-disc pl-5 text-muted">
              <li>Upscaling and noise reduction</li>
              <li>Stabilization and color</li>
              <li>Rotoscope masks</li>
              <li>Auto-captions</li>
            </ul>
          </div>
        </div>
        <StatusForm action={declareAi} submit="Save declaration">
          <input type="hidden" name="film_id" value={film.id} />
          <fieldset className="grid gap-2 text-sm">
            <legend className="label mb-1">Does this film contain AI-generated imagery?</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="ai_generated" value="no" defaultChecked={!!film.ai_declared_at && !film.ai_generated} />
              No, none of the picture was made by a generative model
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="ai_generated" value="yes" defaultChecked={!!film.ai_declared_at && film.ai_generated} />
              Yes, label it &ldquo;AI-generated&rdquo;
            </label>
          </fieldset>
          <p className="text-xs text-muted">
            We scan sampled frames for AI imagery. Undeclared AI found before publishing blocks the film until it&apos;s
            labeled; found after publishing, the film is hidden while staff confirm, then removed with a strike.
          </p>
        </StatusForm>
      </section>

      <section className="card grid gap-4">
        <h2 className="font-display text-2xl">Rights</h2>
        {film.rights_statement_at ? (
          <p className="text-sm text-ok">You confirmed the rights statement on {film.rights_statement_at.slice(0, 10)}.</p>
        ) : null}
        <StatusForm action={confirmRights} submit="Confirm">
          <input type="hidden" name="film_id" value={film.id} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="rights" className="mt-1" defaultChecked={!!film.rights_statement_at} />
            <span>
              I own or have licensed every right needed to sell this film in the US, including the music, footage and
              performances in it, and it contains no sexually explicit content.
            </span>
          </label>
        </StatusForm>
      </section>
    </div>
  );
}

function Field({ id, label, defaultValue, inputMode }: { id: string; label: string; defaultValue?: string; inputMode?: "numeric" | "decimal" }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} name={id} defaultValue={defaultValue} inputMode={inputMode} className="field" />
    </div>
  );
}
