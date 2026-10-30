import type { Handler } from "../index";
import { checkFilm } from "@/lib/checks/film";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Job kind → handler. Each feature registers its handlers here.
 * Kinds: send_receipt, check_film, refund_order, payout_account, rollup_analytics,
 * reconcile, upgrade_tiers, takedown_restore.
 */
export const handlers: Record<string, Handler> = {
  check_film: async (p) => checkFilm(String(p.film_id)),
  upgrade_tiers: async () => {
    const { error } = await createAdminClient().rpc("upgrade_tiers");
    if (error) throw new Error(error.message);
  },
};
