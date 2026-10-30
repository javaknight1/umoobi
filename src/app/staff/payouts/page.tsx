import type { Metadata } from "next";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { formatCents } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { retryPayouts, setPayoutHold } from "./actions";

export const metadata: Metadata = { title: "Payouts · Staff", robots: { index: false } };

export default function PayoutsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="font-display text-4xl">Payouts and holds</h1>
      <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
        <Body />
      </Suspense>
    </main>
  );
}

async function Body() {
  await requireStaff("/staff/payouts");
  const db = createAdminClient();
  const supabase = await createClient();
  const [{ data: accounts }, { data: payouts }] = await Promise.all([
    supabase.rpc("staff_account_balances"),
    db.from("payouts").select("id, period_start, amount_cents, status, filmmaker_accounts(display_name)").in("status", ["failed", "held", "pending"]).order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <div className="mt-8 grid gap-8">
      <section className="card overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              {["Filmmaker", "Available", "Payout account", ""].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {(accounts ?? []).map((a) => (
              <tr key={a.id} className="border-b border-line">
                <td className="px-4 py-2">{a.display_name}</td>
                <td className="px-4 py-2 font-mono">{formatCents(a.balance_cents)}</td>
                <td className="px-4 py-2">{a.payouts_enabled ? "Ready" : "Not ready"}</td>
                <td className="px-4 py-2 text-right">
                  <form action={setPayoutHold}>
                    <input type="hidden" name="account_id" value={a.id} />
                    <input type="hidden" name="hold" value={a.payout_hold ? "false" : "true"} />
                    <button className="btn-ghost px-3 py-1">{a.payout_hold ? "Release hold" : "Hold payouts"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Payouts needing attention</h2>
          <form action={retryPayouts}>
            <button className="btn-ghost px-3 py-1">Retry failed</button>
          </form>
        </div>
        <ul className="grid gap-1 text-sm">
          {(payouts ?? []).map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{(p.filmmaker_accounts as unknown as { display_name: string } | null)?.display_name}</span>
              <span>{p.period_start.slice(0, 7)}</span>
              <span className="font-mono">{formatCents(p.amount_cents)}</span>
              <span className="text-muted">{p.status}</span>
            </li>
          ))}
          {payouts?.length ? null : <li className="text-muted">Nothing pending, held or failed.</li>}
        </ul>
      </section>
    </div>
  );
}
