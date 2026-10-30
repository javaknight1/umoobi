"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/util/slug";

/** Every staff change to discovery is audit-logged. */
async function audit(actorId: string, action: string, target: string, detail: Record<string, unknown> = {}) {
  await createAdminClient().from("staff_audit_log").insert({ actor_id: actorId, action, target, detail: detail as never });
}

export async function createShelf(form: FormData) {
  const staff = await requireStaff("/staff/shelves");
  const title = String(form.get("title") ?? "").trim().slice(0, 80);
  if (!title) return;
  const db = createAdminClient();
  const { count } = await db.from("shelves").select("id", { count: "exact", head: true });
  const { data } = await db
    .from("shelves")
    .insert({ title, slug: `${slugify(title, 40)}-${Date.now().toString(36)}`, position: count ?? 0 })
    .select("id")
    .single();
  await audit(staff.id, "shelf.create", data?.id ?? title, { title });
  revalidatePath("/staff/shelves");
}

export async function addFilmToShelf(form: FormData) {
  const staff = await requireStaff("/staff/shelves");
  const shelfId = String(form.get("shelf_id") ?? "");
  const slug = String(form.get("film_slug") ?? "").trim().replace(/^.*\/f\//, "");
  const db = createAdminClient();
  const { data: film } = await db.from("films").select("id").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!film) return;
  const { count } = await db.from("shelf_items").select("film_id", { count: "exact", head: true }).eq("shelf_id", shelfId);
  await db.from("shelf_items").upsert({ shelf_id: shelfId, film_id: film.id, position: count ?? 0 });
  await audit(staff.id, "shelf.add_film", shelfId, { film_id: film.id });
  revalidatePath("/staff/shelves");
}

export async function removeFilmFromShelf(form: FormData) {
  const staff = await requireStaff("/staff/shelves");
  const shelfId = String(form.get("shelf_id") ?? "");
  const filmId = String(form.get("film_id") ?? "");
  await createAdminClient().from("shelf_items").delete().eq("shelf_id", shelfId).eq("film_id", filmId);
  await audit(staff.id, "shelf.remove_film", shelfId, { film_id: filmId });
  revalidatePath("/staff/shelves");
}

export async function toggleShelf(form: FormData) {
  const staff = await requireStaff("/staff/shelves");
  const shelfId = String(form.get("shelf_id") ?? "");
  const active = form.get("active") === "1";
  await createAdminClient().from("shelves").update({ active }).eq("id", shelfId);
  await audit(staff.id, active ? "shelf.show" : "shelf.hide", shelfId);
  revalidatePath("/staff/shelves");
}
