"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

/** Mockup 03's five steps, mapped onto the film's tabs. Publishing is the header button. */
const STEPS = [
  ["/uploads", "Upload & checks"],
  ["", "Details"],
  ["/pricing", "Pricing"],
  ["/uploads#clips", "Trailers & clips"],
  ["/credits", "Credits"],
] as const;

export function FilmTabs() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Film sections">
      {STEPS.map(([path, label], i) => {
        const href = `/studio/films/${id}${path}`;
        // "Trailers & clips" shares the uploads page, so only "Upload & checks" lights up there.
        const active = !path.includes("#") && pathname === href;
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-ink text-ink-fg" : "bg-surface text-fg hover:bg-surface-2"}`}
          >
            <span className="mr-1 opacity-70">{i + 1}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
