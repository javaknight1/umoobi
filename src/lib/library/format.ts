/** Rental windows offered in the pricing tab (D6). */
export const RENTAL_WINDOWS = [24, 48, 72, 168] as const;

export function rentalWindowLabel(hours: number): string {
  if (hours % 168 === 0) return hours === 168 ? "7 days" : `${hours / 168} weeks`;
  if (hours % 24 === 0 && hours > 72) return `${hours / 24} days`;
  return `${hours} hours`;
}

/** "2 days left", "5 hours left", "40 minutes left", or "Expired". */
export function timeLeft(expiresAt: string | Date, now: Date = new Date()): string {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)} minute${mins === 1 ? "" : "s"} left`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} left`;
  return `${Math.floor(hours / 24)} days left`;
}

/** "1:05:09" / "4:07" for resume points. */
export function formatPosition(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export interface RentalState {
  label: string;
  watchable: boolean;
}

/** What the library shows for a rental: not started, time left, or expired (D51). */
export function rentalState(
  e: { first_played_at: string | null; expires_at: string | null; rental_hours: number | null },
  now = new Date(),
): RentalState {
  if (e.expires_at && new Date(e.expires_at) <= now) return { label: "Expired", watchable: false };
  if (!e.first_played_at) {
    return { label: `Starts when you press play · ${rentalWindowLabel(e.rental_hours ?? 48)} to finish`, watchable: true };
  }
  return { label: timeLeft(e.expires_at!, now), watchable: true };
}

/** Shown beside every buy button and on receipts (AB 2426, D39, D41). */
export const LICENSE_STATEMENT =
  "Buying gets you a license to stream this film on Umoobi, not ownership. The filmmaker can remove the film, and if Umoobi closes, access ends.";
