import "server-only";
import { createClient } from "@/lib/supabase/server";

export type SaleLine = {
  order_ref: string;
  paid_at: string;
  film_id: string;
  film_title: string;
  kind: string;
  status: string;
  price_cents: number;
  fee_cents: number;
  processing_cents: number;
  net_cents: number;
  tax_cents: number;
  refunded_at: string | null;
};

export function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Sales lines for an account between two instants (buyer identity is never included). */
export async function salesBetween(accountId: string, from: Date, to: Date): Promise<SaleLine[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("account_sales", { a: accountId, p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) throw new Error(error.message);
  return (data ?? []) as SaleLine[];
}

/** Totals per calendar day (UTC) for the last `days` days, zero-filled. */
export function dailyTotals(lines: SaleLine[], days: number, now: Date, pick: (l: SaleLine) => number) {
  const out = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) out.set(dayKey(new Date(now.getTime() - i * 86400_000)), 0);
  for (const l of lines) {
    const k = l.paid_at.slice(0, 10);
    if (out.has(k)) out.set(k, out.get(k)! + pick(l));
  }
  return [...out.entries()].map(([label, value]) => ({ label: label.slice(5), value }));
}

/** First day of next month (UTC), when the monthly payout runs (D40). */
export function nextPayoutDate(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function monthBounds(ym: string | null, now: Date) {
  const m = ym?.match(/^(\d{4})-(\d{2})$/);
  const y = m ? Number(m[1]) : now.getUTCFullYear();
  const mo = m ? Number(m[2]) - 1 : now.getUTCMonth();
  return { from: new Date(Date.UTC(y, mo, 1)), to: new Date(Date.UTC(y, mo + 1, 1)), label: `${y}-${String(mo + 1).padStart(2, "0")}` };
}
