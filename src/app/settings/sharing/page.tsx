import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { giveConsent, withdrawConsent } from "./actions";

export const metadata: Metadata = { title: "Sharing with filmmakers", robots: { index: false } };

export default function SharingPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14">
      <h1 className="font-display text-4xl">Sharing with filmmakers</h1>
      <p className="mt-3 text-muted">
        Filmmakers only see totals, never who watched. If you want a filmmaker to be able to contact you, you can share
        your name and email with them here. Each consent is separate, lasts up to two years, and you can withdraw it
        any time.
      </p>
      <Suspense fallback={<div className="card mt-8 h-40" />}>
        <List />
      </Suspense>
    </main>
  );
}

async function List() {
  const user = await requireUser("/settings/sharing");
  const supabase = await createClient();
  const [{ data: orders }, { data: consents }] = await Promise.all([
    supabase.from("orders").select("account_id").eq("viewer_id", user.id).eq("status", "paid"),
    supabase.from("consents").select("id, account_id, expires_at").eq("viewer_id", user.id).is("withdrawn_at", null),
  ]);
  const ids = [...new Set((orders ?? []).map((o) => o.account_id))];
  const { data: accounts } = ids.length
    ? await supabase.from("filmmaker_accounts").select("id, display_name").in("id", ids)
    : { data: [] as { id: string; display_name: string }[] };
  // eslint-disable-next-line react-hooks/purity -- request-time page (Supabase reads call connection())
  const now = Date.now();
  const active = new Map((consents ?? []).filter((c) => new Date(c.expires_at).getTime() > now).map((c) => [c.account_id, c]));

  if (!accounts?.length) return <p className="card mt-8 text-muted">Filmmakers you buy from will appear here.</p>;

  return (
    <ul className="mt-8 grid gap-3">
      {accounts.map((a) => {
        const c = active.get(a.id);
        return (
          <li key={a.id} className="card grid gap-3">
            <p className="font-medium">{a.display_name}</p>
            {c ? (
              <form action={withdrawConsent} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <input type="hidden" name="consent_id" value={c.id} />
                <span className="text-muted">Sharing your name and email until {c.expires_at.slice(0, 10)}.</span>
                <button className="btn-ghost">Stop sharing</button>
              </form>
            ) : (
              <form action={giveConsent} className="grid gap-3 text-sm">
                <input type="hidden" name="account_id" value={a.id} />
                <label className="flex gap-2">
                  <input type="checkbox" name="confirm" required className="mt-1" />
                  I agree to share my name and email, and the fact that I rented or bought their films, with {a.display_name} for up to two years.
                </label>
                <button className="btn-ghost justify-self-start">Share with {a.display_name}</button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
