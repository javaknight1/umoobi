import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimPerson } from "./actions";

export const metadata: Metadata = { title: "Claim your page", robots: { index: false } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ClaimPage({ params }: PageProps<"/claim/[token]">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
      <Suspense fallback={<div className="card h-48" />}>
        <Body params={params} />
      </Suspense>
    </main>
  );
}

async function Body({ params }: Pick<PageProps<"/claim/[token]">, "params">) {
  const { token } = await params;
  await requireUser(`/claim/${token}`);
  const person = UUID_RE.test(token)
    ? (await createAdminClient().from("people").select("name, slug, claimed_by").eq("invite_token", token).maybeSingle()).data
    : null;

  if (!person) {
    return (
      <div className="card grid gap-2">
        <h1 className="font-display text-3xl">This invite link isn&apos;t valid.</h1>
        <p className="text-sm text-muted">It may have been used already. Ask the filmmaker to send a new one.</p>
      </div>
    );
  }

  return (
    <form action={claimPerson} className="card grid gap-4">
      <input type="hidden" name="token" value={token} />
      <h1 className="font-display text-4xl">Is this you, {person.name}?</h1>
      <p className="text-sm text-muted">
        Claiming the page lets you add a photo and bio, and people who follow you hear about your next film. Each
        account can claim one page.
      </p>
      <button className="btn-primary justify-self-start">Claim my page</button>
    </form>
  );
}
