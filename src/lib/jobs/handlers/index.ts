import type { Handler } from "../index";
import { sendReceipt } from "./send-receipt";

/**
 * Job kind → handler. Each feature registers its handlers here.
 * Kinds: send_receipt, check_film, refund_order, payout_account, rollup_analytics,
 * reconcile, upgrade_tiers, takedown_restore.
 */
export const handlers: Record<string, Handler> = {
  send_receipt: sendReceipt,
};
