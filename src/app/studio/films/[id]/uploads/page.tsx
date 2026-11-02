import type { Metadata } from "next";
import { Suspense } from "react";
import { StatusForm } from "@/components/app/status-form";
import { requireOwnFilm } from "@/lib/auth/filmmaker";
import { createClient } from "@/lib/supabase/server";
import { deleteAsset, uploadSubtitle } from "../../actions";
import { formatRuntime } from "../../status";
import { Poster } from "@/components/brand";
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

type Check = { title: string; detail: string; tone: "ok" | "warn" | "bad" | "idle" };

const ICON: Record<Check["tone"], [string, string]> = {
  ok: ["✓", "bg-ok text-white"],
  warn: ["…", "bg-warn text-white"],
  bad: ["!", "bg-bad text-white"],
  idle: ["", "border-2 border-line"],
};

type Signals = {
  scan?: { framesScanned?: number; maxExplicit?: number; maxAiGenerated?: number };
  rights?: { strength?: "strong" | "weak" | "none" | "unavailable"; matchedTitle?: string | null };
};

/** One row per automatic check, from the master asset, the last verification and the film flags. */
function checks(
  film: { status: string; rights_statement_at: string | null; ai_declared_at: string | null; ai_generated: boolean; ai_flagged: boolean },
  master: { status: string; duration_seconds: number | null; error_message: string | null } | undefined,
  signals: Signals | null,
): Check[] {
  const upload: Check = !master
    ? { title: "Upload the master file", detail: "Waiting for your file", tone: "idle" }
    : ["waiting", "uploading"].includes(master.status)
      ? { title: "Uploading", detail: "Large files resume if your connection drops", tone: "warn" }
      : {
          title: "Upload complete",
          detail: master.duration_seconds ? `Master · ${formatRuntime(Number(master.duration_seconds))}` : "Master received",
          tone: "ok",
        };
  const encoding: Check = !master
    ? { title: "Encoding for streaming", detail: "Starts when the upload finishes", tone: "idle" }
    : master.status === "ready"
      ? { title: "Encoded for streaming", detail: "Streaming versions are ready", tone: "ok" }
      : master.status === "errored"
        ? { title: "Encoding failed", detail: master.error_message ?? "Try uploading again", tone: "bad" }
        : { title: "Encoding for streaming", detail: "This can take a while for long films", tone: "warn" };
  const r = signals?.rights?.strength;
  const rights: Check = !film.rights_statement_at
    ? { title: "Rights check", detail: "Confirm the rights statement on the Details step", tone: "idle" }
    : !signals
      ? { title: "Rights check", detail: "Runs after encoding · rights statement signed", tone: film.status === "checking" ? "warn" : "idle" }
      : r === "strong"
        ? {
            title: "Rights check",
            detail: `Matches a known release${signals.rights?.matchedTitle ? ` (${signals.rights.matchedTitle})` : ""} · staff will review`,
            tone: "bad",
          }
        : r === "weak"
          ? { title: "Rights check", detail: "A similar title exists · rights statement signed", tone: "warn" }
          : r === "unavailable"
            ? { title: "Rights check", detail: "Film database unavailable · rights statement signed", tone: "warn" }
            : { title: "Rights check", detail: "Title, runtime and credits match no known commercial release · rights statement signed", tone: "ok" };
  const explicit = signals?.scan?.maxExplicit ?? 0;
  const content: Check = !signals
    ? { title: "Content check", detail: "Runs after encoding", tone: "idle" }
    : explicit >= 0.85
      ? { title: "Content check", detail: "Sexually explicit content found", tone: "bad" }
      : explicit >= 0.5
        ? { title: "Content check", detail: "Uncertain frames · a person will look", tone: "warn" }
        : {
            title: "Content check",
            detail: `No sexually explicit content found${signals.scan?.framesScanned ? ` · ${signals.scan.framesScanned} frames scanned` : ""}`,
            tone: "ok",
          };
  const ai: Check = !film.ai_declared_at
    ? { title: "AI imagery", detail: "Declare AI use on the Details step", tone: "idle" }
    : film.ai_generated
      ? { title: "AI imagery", detail: "Declared · the film will carry the AI-generated label", tone: "ok" }
      : film.ai_flagged
        ? { title: "AI imagery", detail: "Sampled frames look AI-generated · add the label or dispute it on Publish", tone: "bad" }
        : signals
          ? { title: "AI imagery", detail: "No undeclared AI imagery found", tone: "ok" }
          : { title: "AI imagery", detail: "Declared none · checked after encoding", tone: "idle" };
  return [upload, encoding, rights, content, ai];
}

async function Uploads({ params }: Pick<PageProps<"/studio/films/[id]/uploads">, "params">) {
  const { id } = await params;
  const { film, account } = await requireOwnFilm(id);
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const [{ data: assets }, { data: verification }, { data: features }, { data: shorts }, { data: featureCap }, { data: shortCap }] =
    await Promise.all([
      supabase.from("film_assets").select("*").eq("film_id", id).order("created_at"),
      supabase.from("verifications").select("signals").eq("film_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.rpc("my_films_used", { a: account.id, yr: year, kind: "feature" }),
      supabase.rpc("my_films_used", { a: account.id, yr: year, kind: "short" }),
      supabase.rpc("cap_for", { tier: account.tier, kind: "feature" }),
      supabase.rpc("cap_for", { tier: account.tier, kind: "short" }),
    ]);
  const list = assets ?? [];
  const master = list.find((a) => a.kind === "master");
  const trailers = list.filter((a) => a.kind === "trailer");
  const clips = list.filter((a) => a.kind === "clip");
  const subtitles = list.filter((a) => a.kind === "subtitle");
  const freeUsed = [...trailers, ...clips].reduce((s, a) => s + Number(a.duration_seconds ?? 0), 0);
  const freeMax = film.runtime_seconds ? Math.floor(film.runtime_seconds * 0.15) : null;
  const rows = checks(film, master, (verification?.signals as Signals | undefined) ?? null);
  const score = film.vetting_score;
  const isFeature = (film.runtime_seconds ?? 0) >= 2400;

  const gate =
    !film.ai_declared_at || !film.rights_statement_at
      ? "Before uploading the master, declare whether the film uses AI-generated imagery and confirm the rights statement on the Details tab."
      : ["published", "hidden"].includes(film.status)
        ? "Pull the film before replacing its master."
        : undefined;

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-6">
          <section className="card grid gap-1">
            <h2 className="font-display text-2xl">Automatic checks</h2>
            <p className="text-muted">Every upload is checked before it can go live. Most films clear in under an hour.</p>
            <ul className="mt-3 grid">
              {rows.map((c) => (
                <li key={c.title} className="flex gap-4 border-b border-line py-4 last:border-0">
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ICON[c.tone][1]}`}
                  >
                    {ICON[c.tone][0]}
                  </span>
                  <span>
                    <span className="block font-semibold">{c.title}</span>
                    <span className="block text-muted">{c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            {score !== null ? (
              <p className={`mt-3 flex items-center gap-4 rounded-2xl px-5 py-4 ${score >= 80 ? "bg-ok/10" : score >= 50 ? "bg-warn/10" : "bg-bad/10"}`}>
                <span className={`font-display text-4xl ${score >= 80 ? "text-ok" : score >= 50 ? "text-warn" : "text-bad"}`}>{score}</span>
                <span>
                  <strong>Confidence {score} of 100.</strong>{" "}
                  {score >= 80
                    ? "This film can publish without review."
                    : score >= 50
                      ? "A person at Umoobi will review it within 24 hours."
                      : "The checks couldn't approve this film; see Publish for the reason."}
                </span>
              </p>
            ) : null}
          </section>

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
        </div>

        <aside className="grid content-start gap-6">
          <section className="card overflow-hidden p-0">
            <div className="flex gap-5 bg-[#1f6f74] p-6 text-white">
              <span className="w-28 shrink-0">
                <Poster title={film.title} url={film.poster_url} slug={film.slug} by={account.display_name} className="shadow-xl" />
              </span>
              <span>
                <span className="block font-display text-xl">Poster</span>
                <span className="block text-white/80">{film.poster_url ? "Added" : "Using a generated poster · add yours on Details"}</span>
              </span>
            </div>
            <dl className="grid gap-2 p-6">
              <Row k="Runtime" v={formatRuntime(film.runtime_seconds)} />
              <Row k="Type" v={isFeature ? "Feature film" : "Short"} />
              <Row k="Subtitles" v={subtitles.length ? `${subtitles.map((s) => s.label ?? s.language).join(", ")} added` : "None yet"} />
            </dl>
          </section>
          <section className="card grid gap-3">
            <h2 className="font-display text-xl">Your yearly limit</h2>
            <Limit label="Feature films" used={features ?? 0} cap={featureCap ?? null} />
            <Limit label="Shorts" used={shorts ?? 0} cap={shortCap ?? null} />
          </section>
        </aside>
      </div>

      <section id="clips" className="card grid scroll-mt-24 gap-4">
        <h2 className="font-display text-2xl">Trailers and clips</h2>
        <p className="text-muted">
          Free to watch for everyone. Up to 3 trailers (3 min each) and 5 clips (2 min each). All free footage together can
          be at most 15% of the runtime{freeMax ? ` (${formatRuntime(freeMax)} for this film)` : ""}. Used so far:{" "}
          {freeUsed ? formatRuntime(freeUsed) : "0 min"}.
        </p>
        {freeMax ? (
          <div className="h-2.5 rounded-full bg-surface-2" aria-hidden>
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (freeUsed / freeMax) * 100)}%` }} />
          </div>
        ) : null}
        {[...trailers, ...clips].map((a) => (
          <AssetRow key={a.id} asset={a} filmId={id} removable />
        ))}
        <div className="grid gap-3 md:grid-cols-2">
          <Uploader
            filmId={id}
            kind="trailer"
            label={`Add a trailer (${trailers.length} of 3)`}
            disabled={trailers.length >= 3 ? "You have 3 trailers. Remove one to add another." : undefined}
          />
          <Uploader
            filmId={id}
            kind="clip"
            label={`Add a clip (${clips.length} of 5)`}
            disabled={clips.length >= 5 ? "You have 5 clips. Remove one to add another." : undefined}
          />
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </div>
  );
}

function Limit({ label, used, cap }: { label: string; used: number; cap: number | null }) {
  return (
    <div className="grid gap-2">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="font-semibold">{cap ? `${used} of ${cap}` : `${used} · no limit`}</span>
      </div>
      {cap ? (
        <div className="h-2.5 rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-chart" style={{ width: `${Math.min(100, (used / cap) * 100)}%` }} />
        </div>
      ) : null}
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
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
