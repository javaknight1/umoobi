/** US federal holidays observed on fixed or computed dates, for DMCA counter-notice timers. */
function federalHolidays(year: number): Set<string> {
  const d = (m: number, day: number) => new Date(Date.UTC(year, m, day));
  const nth = (m: number, weekday: number, n: number) => {
    const first = d(m, 1);
    const offset = (weekday - first.getUTCDay() + 7) % 7;
    return d(m, 1 + offset + (n - 1) * 7);
  };
  const last = (m: number, weekday: number) => {
    const end = d(m + 1, 0);
    return d(m, end.getUTCDate() - ((end.getUTCDay() - weekday + 7) % 7));
  };
  const observed = (x: Date) => {
    const wd = x.getUTCDay();
    return wd === 6 ? new Date(x.getTime() - 86400_000) : wd === 0 ? new Date(x.getTime() + 86400_000) : x;
  };
  const days = [
    observed(d(0, 1)), nth(0, 1, 3), nth(1, 1, 3), last(4, 1), observed(d(5, 19)), observed(d(6, 4)),
    nth(8, 1, 1), nth(9, 1, 2), observed(d(10, 11)), nth(10, 4, 4), observed(d(11, 25)),
  ];
  return new Set(days.map((x) => x.toISOString().slice(0, 10)));
}

export function isBusinessDay(date: Date): boolean {
  const wd = date.getUTCDay();
  if (wd === 0 || wd === 6) return false;
  return !federalHolidays(date.getUTCFullYear()).has(date.toISOString().slice(0, 10));
}

/** The date `n` business days after `from` (17 U.S.C. §512(g): restore 10–14 business days after a counter-notice). */
export function addBusinessDays(from: Date, n: number): Date {
  let d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let left = n;
  while (left > 0) {
    d = new Date(d.getTime() + 86400_000);
    if (isBusinessDay(d)) left--;
  }
  return d;
}
