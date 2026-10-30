"use client";

import { useState, useTransition } from "react";

const REASONS = [
  ["undisclosed_ai", "Uses AI-generated imagery without a label"],
  ["explicit", "Sexually explicit content"],
  ["copyright", "Copyright problem"],
  ["other", "Something else"],
] as const;

/** Viewer report. An undisclosed-AI report hides the film until staff decide (D46). */
export function ReportForm({ filmId }: { filmId: string }) {
  const [reason, setReason] = useState<string>("undisclosed_ai");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) return <p className="text-sm text-ok">Thanks. Umoobi staff will look at this within 24 hours.</p>;

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted hover:text-fg">Report this film</summary>
      <form
        className="mt-3 grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await fetch(`/api/films/${filmId}/reports`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ reason, details }),
            });
            if (res.ok) setDone(true);
          });
        }}
      >
        <fieldset className="grid gap-1">
          <legend className="sr-only">Reason</legend>
          {REASONS.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
              {label}
            </label>
          ))}
        </fieldset>
        <label htmlFor="report-details" className="sr-only">
          Details
        </label>
        <textarea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Details (optional), e.g. the timestamp"
          className="field"
        />
        <button disabled={pending} className="btn-ghost justify-self-start">
          Send report
        </button>
      </form>
    </details>
  );
}
