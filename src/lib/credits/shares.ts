/** Revenue shares are stored as basis points (D15): 100% = 10,000. */

export function percentToBps(input: string | number): number | null {
  const n = typeof input === "number" ? input : Number(String(input).trim().replace(/%$/, "") || "0");
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100);
}

export function bpsToPercent(bps: number): string {
  const p = bps / 100;
  return Number.isInteger(p) ? String(p) : String(Number(p.toFixed(2)));
}

export type SharesState = "none" | "complete" | "incomplete";

/** Shares must total exactly 100%, or all be 0 (none recorded yet). */
export function sharesState(bps: number[]): { total: number; state: SharesState } {
  const total = bps.reduce((a, b) => a + b, 0);
  return { total, state: total === 0 ? "none" : total === 10000 ? "complete" : "incomplete" };
}
