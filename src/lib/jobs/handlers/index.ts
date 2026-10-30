import type { Handler } from "../index";
import { monthlyPayouts, reconcile, refundOrder, rollupAnalytics, takedownRestore } from "./money";

/**
 * Job kind → handler. Each feature registers its handlers here.
 */
export const handlers: Record<string, Handler> = {
  rollup_analytics: rollupAnalytics,
  reconcile,
  monthly_payouts: monthlyPayouts,
  refund_order: refundOrder,
  takedown_restore: takedownRestore,
};
