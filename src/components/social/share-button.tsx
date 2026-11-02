"use client";

import { useState } from "react";

/** Native share sheet where available, otherwise copies the link. */
export function ShareButton({ title, label = "Share page" }: { title: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Share sheet dismissed.
    }
  }
  return (
    <button type="button" onClick={share} className="btn-ghost">
      {copied ? "Link copied" : label}
    </button>
  );
}
