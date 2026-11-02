const LABELS: Record<string, [string, string]> = {
  draft: ["Draft", "bg-surface-2 text-muted"],
  checking: ["Checking", "bg-warn/12 text-warn"],
  review: ["In review", "bg-warn/12 text-warn"],
  ready: ["Ready to publish", "bg-ok/12 text-ok"],
  published: ["Published", "bg-ok/12 text-ok"],
  rejected: ["Not approved", "bg-bad/12 text-bad"],
  hidden: ["Hidden for review", "bg-bad/12 text-bad"],
  pulled: ["Pulled", "bg-surface-2 text-muted"],
};

/** Film status as a soft pill (mockup 06). */
export function FilmStatus({ status }: { status: string }) {
  const [label, cls] = LABELS[status] ?? [status, "bg-surface-2 text-muted"];
  return <span className={`pill px-3 py-1 text-sm ${cls}`}>{label}</span>;
}

export function formatRuntime(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}
