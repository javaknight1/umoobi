const LABELS: Record<string, [string, string]> = {
  draft: ["Draft", "border-line text-muted"],
  checking: ["Checking", "border-warn/50 text-warn"],
  review: ["In review", "border-warn/50 text-warn"],
  ready: ["Ready to publish", "border-ok/50 text-ok"],
  published: ["Published", "border-ok bg-ok/10 text-ok"],
  rejected: ["Not approved", "border-bad/50 text-bad"],
  hidden: ["Hidden for review", "border-bad/50 text-bad"],
  pulled: ["Pulled", "border-line text-muted"],
};

export function FilmStatus({ status }: { status: string }) {
  const [label, cls] = LABELS[status] ?? [status, "border-line"];
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function formatRuntime(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}
