import type { Metadata } from "next";
import { Suspense } from "react";
import { StatusForm } from "@/components/app/status-form";
import { requireOwnFilm } from "@/lib/auth/filmmaker";
import { createClient } from "@/lib/supabase/server";
import { deleteAsset, uploadSubtitle } from "../../actions";
import { formatRuntime } from "../../status";
import { Uploader } from "./uploader";

export const metadata: Metadata = { title: "Uploads · Studio", robots: { index: false } };

export default function UploadsPage({ params }: PageProps<"/studio/films/[id]/uploads">) {
  return (
    <Suspense fallback={<div className="card h-96" />}>
      <Uploads params={params} />
    </Suspense>
  );
}

const STATUS: Record<string, string> = {
  waiting: "Waiting",
  uploading: "Uploading",
  processing: "Encoding",
  ready: "Ready",
  errored: "Error",
};

async function Uploads({ params }: Pick<PageProps<"/studio/films/[id]/uploads">, "params">) {
  const { id } = await params;
  const { film } = await requireOwnFilm(id);
  const supabase = await createClient();
  const { data: assets } = await supabase.from("film_assets").select("*").eq("film_id", id).order("created_at");
  const list = assets ?? [];
  const master = list.find((a) => a.kind === "master");
  const trailers = list.filter((a) => a.kind === "trailer");
  const clips = list.filter((a) => a.kind === "clip");
  const subtitles = list.filter((a) => a.kind === "subtitle");
  const freeUsed = [...trailers, ...clips].reduce((s, a) => s + Number(a.duration_seconds ?? 0), 0);
  const freeMax = film.runtime_seconds ? Math.floor(film.runtime_seconds * 0.15) : null;

  const gate = !film.ai_declared_at || !film.rights_statement_at
    ? "Before uploading the master, declare whether the film uses AI-generated imagery and confirm the rights statement on the Details tab."
    : ["published", "hidden"].includes(film.status)
      ? "Pull the film before replacing its master."
      : undefined;

  return (
    <div className="grid gap-6">
      <section className="card grid gap-4">
        <h2 className="font-display text-2xl">Master file</h2>
        {master ? <AssetRow asset={master} filmId={id} removable={false} /> : <p className="text-sm text-muted">No master yet.</p>}
        <Uploader
          filmId={id}
          kind="master"
          label={master ? "Replace master" : "Upload master"}
          hint="Upload the highest-quality file you have (ProRes, DNxHR or H.264). It goes straight to our video host; large files resume if your connection drops."
          disabled={gate}
        />
      </section>

      <section className="card grid gap-4">
        <h2 className="font-display text-2xl">Free trailers and clips</h2>
        <p className="text-sm text-muted">
          Up to 3 trailers of 3 minutes and 5 clips of 2 minutes. All free footage together can be at most 15% of the
          runtime{freeMax ? ` (${formatRuntime(freeMax)} for this film)` : ""}. Used so far: {freeUsed ? formatRuntime(freeUsed) : "0 min"}.
        </p>
        {[...trailers, ...clips].map((a) => (
          <AssetRow key={a.id} asset={a} filmId={id} removable />
        ))}
        <div className="grid gap-3 md:grid-cols-2">
          <Uploader filmId={id} kind="trailer" label={`Add a trailer (${trailers.length} of 3)`} disabled={trailers.length >= 3 ? "You have 3 trailers. Remove one to add another." : undefined} />
          <Uploader filmId={id} kind="clip" label={`Add a clip (${clips.length} of 5)`} disabled={clips.length >= 5 ? "You have 5 clips. Remove one to add another." : undefined} />
        </div>
      </section>

      <section className="card grid gap-4">
        <h2 className="font-display text-2xl">Subtitles</h2>
        {subtitles.map((a) => (
          <AssetRow key={a.id} asset={a} filmId={id} removable />
        ))}
        <StatusForm action={uploadSubtitle} submit="Add subtitles" pendingLabel="Uploading…">
          <input type="hidden" name="film_id" value={id} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1">
              <label htmlFor="language" className="label">
                Language code
              </label>
              <input id="language" name="language" placeholder="en" className="field" />
            </div>
            <div className="grid gap-1">
              <label htmlFor="sub-label" className="label">
                Label <span className="font-normal text-muted">(optional)</span>
              </label>
              <input id="sub-label" name="label" placeholder="English (SDH)" className="field" />
            </div>
            <div className="grid gap-1">
              <label htmlFor="subtitle" className="label">
                WebVTT file
              </label>
              <input id="subtitle" name="subtitle" type="file" accept=".vtt,text/vtt" className="text-sm" />
            </div>
          </div>
        </StatusForm>
      </section>
    </div>
  );
}

type Asset = {
  id: string;
  kind: string;
  label: string | null;
  language: string | null;
  status: string;
  duration_seconds: number | null;
  error_message: string | null;
};

function AssetRow({ asset, filmId, removable }: { asset: Asset; filmId: string; removable: boolean }) {
  const name =
    asset.kind === "subtitle"
      ? `${asset.label ?? "Subtitles"} (${asset.language})`
      : asset.label ?? (asset.kind === "master" ? "Master" : asset.kind === "trailer" ? "Trailer" : "Clip");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm">
      <div>
        <p className="font-medium">{name}</p>
        <p className={asset.status === "errored" ? "text-bad" : "text-muted"}>
          {STATUS[asset.status] ?? asset.status}
          {asset.duration_seconds ? ` · ${formatRuntime(Number(asset.duration_seconds))}` : ""}
          {asset.error_message ? ` · ${asset.error_message}` : ""}
        </p>
      </div>
      {removable ? (
        <form action={deleteAsset}>
          <input type="hidden" name="film_id" value={filmId} />
          <input type="hidden" name="asset_id" value={asset.id} />
          <button className="text-muted hover:text-bad">Remove</button>
        </form>
      ) : null}
    </div>
  );
}
