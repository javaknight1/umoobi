"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Verified buyers only (16 CFR 465); the server re-checks with can_review. */
export function ReviewForm({
  filmId,
  existing,
}: {
  filmId: string;
  existing: { id: string; rating: number; body: string | null } | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setError("Pick a rating.");
    setError("");
    start(async () => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filmId, rating, body }),
      });
      if (!res.ok) return setError((await res.json().catch(() => null))?.error ?? "Couldn't save your review.");
      router.refresh();
    });
  }

  function remove() {
    if (!existing) return;
    start(async () => {
      await fetch(`/api/reviews?id=${existing.id}`, { method: "DELETE" });
      setRating(0);
      setBody("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="card grid gap-3" aria-label="Your review">
      <p className="font-medium">{existing ? "Your review" : "Rate this film"}</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={`text-2xl ${n <= rating ? "text-accent" : "text-muted"}`}
          >
            ★
          </button>
        ))}
      </div>
      <label htmlFor="review-body" className="sr-only">
        Review
      </label>
      <textarea
        id="review-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={5000}
        placeholder="What stayed with you?"
        className="field"
      />
      <div className="flex gap-2">
        <button disabled={pending} className="btn-primary">
          {existing ? "Update review" : "Post review"}
        </button>
        {existing ? (
          <button type="button" onClick={remove} disabled={pending} className="btn-ghost">
            Delete
          </button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </form>
  );
}
