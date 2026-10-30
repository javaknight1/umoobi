import type { Handler } from "../index";
import { checkFilm } from "@/lib/checks/film";
import { createAdminClient } from "@/lib/supabase/admin";
import { monthlyPayouts, reconcile, refundOrder, rollupAnalytics, takedownRestore } from "./money";

/**
 * Job kind → handler. Each feature registers its handlers here.
 */
export const handlers: Record<string, Handler> = {
  check_film: async (p) => checkFilm(String(p.film_id)),
  upgrade_tiers: async () => {
    const { error } = await createAdminClient().rpc("upgrade_tiers");
    if (error) throw new Error(error.message);
  },
  rollup_analytics: rollupAnalytics,
  reconcile,
  monthly_payouts: monthlyPayouts,
  refund_order: refundOrder,
  takedown_restore: takedownRestore,
};
