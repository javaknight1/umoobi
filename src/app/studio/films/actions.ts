"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFilmmaker, requireOwnFilm } from "@/lib/auth/filmmaker";
import { enqueue } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { uniqueSlug } from "@/lib/util/slug";
import { video } from "@/lib/video";

export interface FormState {
  status: "idle" | "ok" | "error";
  message: string;
}

const FEATURE_SECONDS = 2400; // D13: 40 minutes or more

/** Postgres check errors carry the rule in plain words; show those, hide anything else. */
function friendly(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  const rule = message.match(
    /(Yearly limit reached[^.]*|Free is only allowed[^.]*|The lowest paid price[^.]*|A film can have at most[^.]*|(Trailers|Clips) can be at most[^.]*|Free trailers and clips[^.]*|Cannot publish:.*)/,
  );
  return rule ? rule[0].replace(/^Cannot publish: /, "") : fallback;
}

function minutesToSeconds(v: FormDataEntryValue | null): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 60) : null;
}

export async function createFilm(_prev: FormState, form: FormData): Promise<FormState> {
  const { account } = await requireFilmmaker("/studio/films/new");
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  const runtime = minutesToSeconds(form.get("runtime_minutes"));
  const kind = String(form.get("kind") ?? "");
  if (!title) return { status: "error", message: "Add a title." };
  if (!runtime) return { status: "error", message: "Add the runtime in minutes." };
  if (kind === "feature" && runtime < FEATURE_SECONDS) return { status: "error", message: "Features run 40 minutes or more. Choose short instead." };
  if (kind === "short" && runtime >= FEATURE_SECONDS) return { status: "error", message: "Films of 40 minutes or more count as features." };

  const supabase = await createClient();
  const admin = createAdminClient();
  const taken = async (s: string) => !!(await admin.from("films").select("id").eq("slug", s).maybeSingle()).data;
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = await uniqueSlug(title, taken);
    const { data, error } = await supabase
      .from("films")
      .insert({ account_id: account.id, title, runtime_seconds: runtime, slug })
      .select("id")
      .single();
    if (data) redirect(`/studio/films/${data.id}`);
    if (error?.code !== "23505") return { status: "error", message: friendly(error?.message, "Couldn't create the film.") };
  }
  return { status: "error", message: "Couldn't create the film. Try again." };
}

export async function saveDetails(_prev: FormState, form: FormData): Promise<FormState> {
  const filmId = String(form.get("film_id"));
  await requireOwnFilm(filmId);
  const year = Number(form.get("release_year")) || null;
  const update = {
    title: String(form.get("title") ?? "").trim().slice(0, 200),
    synopsis: String(form.get("synopsis") ?? "").trim().slice(0, 2000) || null,
    genre: String(form.get("genre") ?? "").trim().slice(0, 60) || null,
    content_rating: String(form.get("content_rating") ?? "").trim().slice(0, 20) || null,
    release_year: year && year >= 1888 && year <= 2100 ? year : null,
    runtime_seconds: minutesToSeconds(form.get("runtime_minutes")),
  };
  if (!update.title) return { status: "error", message: "Add a title." };
  if (!update.runtime_seconds) return { status: "error", message: "Add the runtime in minutes." };
  const supabase = await createClient();
  const { error } = await supabase.from("films").update(update).eq("id", filmId);
  if (error) return { status: "error", message: friendly(error.message, "Couldn't save.") };
  revalidatePath(`/studio/films/${filmId}`);
  return { status: "ok", message: "Saved." };
}

/** D42/D46: the AI declaration. A film flagged by the scan can't drop its label without staff. */
export async function declareAi(_prev: FormState, form: FormData): Promise<FormState> {
  const filmId = String(form.get("film_id"));
  const { film } = await requireOwnFilm(filmId);
  const choice = form.get("ai_generated");
  if (choice !== "yes" && choice !== "no") return { status: "error", message: "Choose one." };
  if (choice === "no" && film.ai_flagged && !film.staff_approved) {
    return { status: "error", message: "Our scan found AI-generated imagery. Keep the label, or dispute the flag on the Publish tab." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("films")
    .update({ ai_generated: choice === "yes", ai_declared_at: new Date().toISOString() })
    .eq("id", filmId);
  if (error) return { status: "error", message: "Couldn't save." };
  revalidatePath(`/studio/films/${filmId}`);
  return { status: "ok", message: "Saved." };
}

export async function confirmRights(_prev: FormState, form: FormData): Promise<FormState> {
  const filmId = String(form.get("film_id"));
  await requireOwnFilm(filmId);
  if (form.get("rights") !== "on") return { status: "error", message: "Tick the box to confirm." };
  const supabase = await createClient();
  const { error } = await supabase.from("films").update({ rights_statement_at: new Date().toISOString() }).eq("id", filmId);
  if (error) return { status: "error", message: "Couldn't save." };
  revalidatePath(`/studio/films/${filmId}`);
  return { status: "ok", message: "Confirmed." };
}

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function uploadPoster(_prev: FormState, form: FormData): Promise<FormState> {
  const filmId = String(form.get("film_id"));
  await requireOwnFilm(filmId);
  const file = form.get("poster");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose an image." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { status: "error", message: "Use a JPG, PNG or WebP image." };
  if (file.size > 5 * 1024 * 1024) return { status: "error", message: "Posters can be up to 5 MB." };
  const admin = createAdminClient();
  const path = `${filmId}/poster-${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage.from("posters").upload(path, file, { contentType: file.type });
  if (error) return { status: "error", message: "Upload failed. Try again." };
  const url = admin.storage.from("posters").getPublicUrl(path).data.publicUrl;
  const supabase = await createClient();
  await supabase.from("films").update({ poster_url: url }).eq("id", filmId);
  revalidatePath(`/studio/films/${filmId}`);
  return { status: "ok", message: "Poster updated." };
}

export async function uploadSubtitle(_prev: FormState, form: FormData): Promise<FormState> {
  const filmId = String(form.get("film_id"));
  await requireOwnFilm(filmId);
  const file = form.get("subtitle");
  const language = String(form.get("language") ?? "").trim().toLowerCase();
  if (!/^[a-z]{2}(-[a-z]{2})?$/.test(language)) return { status: "error", message: "Use a language code like en or es-mx." };
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a .vtt file." };
  if (file.size > 2 * 1024 * 1024) return { status: "error", message: "Subtitle files can be up to 2 MB." };
  const text = await file.text();
  if (!text.trimStart().startsWith("WEBVTT")) return { status: "error", message: "That isn't a WebVTT file (it should start with WEBVTT)." };
  const admin = createAdminClient();
  const path = `${filmId}/${language}-${crypto.randomUUID().slice(0, 8)}.vtt`;
  const { error } = await admin.storage.from("subtitles").upload(path, text, { contentType: "text/vtt" });
  if (error) return { status: "error", message: "Upload failed. Try again." };
  const url = admin.storage.from("subtitles").getPublicUrl(path).data.publicUrl;
  const supabase = await createClient();
  const { error: rowError } = await supabase
    .from("film_assets")
    .insert({ film_id: filmId, kind: "subtitle", language, label: String(form.get("label") ?? "").trim() || null, subtitle_url: url, status: "ready" });
  if (rowError) return { status: "error", message: "Couldn't save the subtitles." };
  revalidatePath(`/studio/films/${filmId}/uploads`);
  return { status: "ok", message: "Subtitles added." };
}

export async function deleteAsset(form: FormData) {
  const filmId = String(form.get("film_id"));
  await requireOwnFilm(filmId);
  const assetId = String(form.get("asset_id"));
  const supabase = await createClient();
  const { data: asset } = await supabase.from("film_assets").select("kind, mux_asset_id").eq("id", assetId).eq("film_id", filmId).maybeSingle();
  if (!asset || asset.kind === "master") return;
  await supabase.from("film_assets").delete().eq("id", assetId);
  if (asset.mux_asset_id) await video().deleteAsset(asset.mux_asset_id).catch(() => undefined);
  revalidatePath(`/studio/films/${filmId}/uploads`);
}

export async function publishFilm(_prev: FormState, form: FormData): Promise<FormState> {
  const filmId = String(form.get("film_id"));
  await requireOwnFilm(filmId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_film", { f: filmId });
  if (error) return { status: "error", message: friendly(error.message, "Couldn't publish.") };
  revalidatePath(`/studio/films/${filmId}`, "layout");
  return { status: "ok", message: "Published. Your film page is live." };
}

/** D25/D27: new sales stop, buys from the last 30 days are refunded, active rentals keep running. */
export async function pullFilm(_prev: FormState, form: FormData): Promise<FormState> {
  const filmId = String(form.get("film_id"));
  await requireOwnFilm(filmId);
  if (form.get("confirm") !== "on") return { status: "error", message: "Tick the box to confirm." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pull_film", { f: filmId });
  if (error) return { status: "error", message: "Couldn't pull the film." };
  revalidatePath(`/studio/films/${filmId}`, "layout");
  return { status: "ok", message: `Pulled. ${data ?? 0} recent purchase(s) will be refunded automatically.` };
}

/** After an AI-scan flag: add the label (D46). */
export async function addAiLabel(form: FormData) {
  const filmId = String(form.get("film_id"));
  await requireOwnFilm(filmId);
  const supabase = await createClient();
  await supabase.from("films").update({ ai_generated: true, ai_declared_at: new Date().toISOString() }).eq("id", filmId);
  revalidatePath(`/studio/films/${filmId}`, "layout");
}

/** After an AI-scan flag: ask a person to look (scanners misfire). */
export async function disputeAiFlag(form: FormData) {
  const filmId = String(form.get("film_id"));
  const { account, film } = await requireOwnFilm(filmId);
  if (!film.ai_flagged) return;
  const admin = createAdminClient();
  const { data: open } = await admin.from("review_items").select("id").eq("film_id", filmId).eq("kind", "ai_flag").eq("status", "open").maybeSingle();
  if (!open) {
    await admin.from("review_items").insert({
      kind: "ai_flag",
      film_id: filmId,
      account_id: account.id,
      reason: "Filmmaker disputes the AI-generated flag",
      due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
  }
  revalidatePath(`/studio/films/${filmId}/publish`);
}

/** Runs the automatic checks again (after a new rights statement, or a rejected film). */
export async function rerunChecks(form: FormData) {
  const filmId = String(form.get("film_id"));
  const { film } = await requireOwnFilm(filmId);
  if (["published", "hidden", "pulled", "checking"].includes(film.status)) return;
  await createAdminClient().from("films").update({ status: "checking" }).eq("id", filmId);
  await enqueue("check_film", { film_id: filmId });
  revalidatePath(`/studio/films/${filmId}/publish`);
}
