import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/marketing/site-header";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { saveProfile } from "./actions";

export const metadata: Metadata = { title: "Your page", robots: { index: false } };

export default function ProfileSettingsPage({ searchParams }: PageProps<"/settings/profile">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
        <h1 className="font-display text-4xl">Your page</h1>
        <Suspense fallback={<div className="card mt-6 h-64" />}>
          <Body searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Body({ searchParams }: Pick<PageProps<"/settings/profile">, "searchParams">) {
  const user = await requireUser("/settings/profile");
  const { claimed, claim_error, saved } = await searchParams;
  const supabase = await createClient();
  const { data: person } = await supabase
    .from("people")
    .select("id, slug, name, bio, photo_url")
    .eq("claimed_by", user.id)
    .maybeSingle();

  return (
    <div className="mt-6 grid gap-4">
      {claimed ? <p className="rounded-lg bg-ok/10 px-3 py-2 text-sm text-ok">Page claimed. It&apos;s yours now.</p> : null}
      {claim_error ? <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{String(claim_error)}</p> : null}
      {saved ? <p className="rounded-lg bg-ok/10 px-3 py-2 text-sm text-ok">Saved.</p> : null}
      {!person ? (
        <p className="text-muted">
          You haven&apos;t claimed a cast or crew page yet. When a filmmaker credits you, they can send you an invite link.
        </p>
      ) : (
        <form action={saveProfile} className="card grid gap-4">
          <p className="text-sm text-muted">
            Public at{" "}
            <Link href={`/p/${person.slug}`} className="underline">
              /p/{person.slug}
            </Link>
          </p>
          <div className="grid gap-1">
            <label htmlFor="name" className="label">
              Name
            </label>
            <input id="name" name="name" defaultValue={person.name} required maxLength={120} className="field" />
          </div>
          <div className="grid gap-1">
            <label htmlFor="photo_url" className="label">
              Photo URL <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="photo_url" name="photo_url" defaultValue={person.photo_url ?? ""} inputMode="url" className="field" />
          </div>
          <div className="grid gap-1">
            <label htmlFor="bio" className="label">
              Bio
            </label>
            <textarea id="bio" name="bio" rows={4} maxLength={1500} defaultValue={person.bio ?? ""} className="field" />
          </div>
          <button className="btn-primary justify-self-start">Save</button>
        </form>
      )}
    </div>
  );
}
