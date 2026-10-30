/** "Hide AI-generated" filter (D46). A plain form so it works without JavaScript. */
export function HideAiToggle({ on, next }: { on: boolean; next: string }) {
  return (
    <form action="/api/prefs/hide-ai" method="post" className="inline-flex">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="hide" value={on ? "0" : "1"} />
      <button
        aria-pressed={on}
        className={`rounded-full border px-3 py-1 text-sm ${on ? "border-accent bg-accent text-accent-fg" : "border-line text-muted hover:text-fg"}`}
      >
        {on ? "✓ Hiding AI-generated" : "Hide AI-generated"}
      </button>
    </form>
  );
}
