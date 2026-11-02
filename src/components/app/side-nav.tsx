"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavGroup {
  title: string;
  items: { href: string; label: string; exact?: boolean }[];
}

/** Sidebar links with the mockups' active state (amber dot, lighter pill). */
export function SideNav({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const active = (href: string, exact?: boolean) => {
    const p = href.split("?")[0];
    return exact ? path === p : path === p || path.startsWith(`${p}/`);
  };
  return (
    <nav className="grid gap-6" aria-label="Sections">
      {groups.map((g) => (
        <div key={g.title} className="grid gap-1">
          <p className="px-4 pb-1 text-sm text-muted">{g.title}</p>
          {g.items.map((i) => {
            const on = active(i.href, i.exact);
            return (
              <Link
                key={i.label}
                href={i.href}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-4 rounded-xl px-4 py-2.5 text-[1.05rem] ${on ? "bg-surface text-fg" : "text-fg/80 hover:bg-surface/60 hover:text-fg"}`}
              >
                <span aria-hidden className={`h-2 w-2 rounded-full ${on ? "bg-accent" : "bg-muted/60"}`} />
                {i.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Phone: the same links as a scrolling row under the logo. */
export function TopNav({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm" aria-label="Sections">
      {groups
        .flatMap((g) => g.items)
        .map((i) => {
          const p = i.href.split("?")[0];
          const on = i.exact ? path === p : path === p || path.startsWith(`${p}/`);
          return (
            <Link
              key={i.label}
              href={i.href}
              aria-current={on ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 ${on ? "bg-surface text-fg" : "text-fg/75"}`}
            >
              {i.label}
            </Link>
          );
        })}
    </nav>
  );
}
