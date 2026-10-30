"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Follow a person or filmmaker. Signed-out visitors are sent to sign in first. */
export function FollowButton({
  target,
  following,
  label,
  next,
}: {
  target: { personId: string } | { accountId: string };
  following: boolean | null;
  label: string;
  next: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(!!following);
  const [pending, start] = useTransition();

  if (following === null) {
    return (
      <a href={`/sign-in?next=${encodeURIComponent(next)}`} className="btn-ghost px-4 py-1.5">
        Follow {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={on}
      className={on ? "btn-ghost px-4 py-1.5" : "btn-primary px-4 py-1.5"}
      onClick={() =>
        start(async () => {
          const res = await fetch("/api/follows", {
            method: on ? "DELETE" : "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(target),
          });
          if (res.ok) {
            setOn(!on);
            router.refresh();
          }
        })
      }
    >
      {on ? `Following ${label}` : `Follow ${label}`}
    </button>
  );
}
