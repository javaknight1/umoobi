"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const TABS = [
  ["", "Details"],
  ["/uploads", "Uploads"],
  ["/credits", "Credits"],
  ["/pricing", "Pricing"],
  ["/publish", "Publish"],
] as const;

/** Tabs for one film. Client-side so the layout doesn't block on params. */
export function FilmTabs() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-line pb-3 text-sm" aria-label="Film sections">
      {TABS.map(([path, label]) => {
        const href = `/studio/films/${id}${path}`;
        const active = pathname === href;
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3 py-1 ${active ? "border-fg bg-fg text-bg" : "border-line hover:border-fg/40"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
