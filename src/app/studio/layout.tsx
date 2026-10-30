import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/components/app/user-menu";

const NAV = [
  ["/studio", "Dashboard"],
  ["/studio/films", "Films"],
  ["/studio/money", "Money"],
  ["/studio/analytics", "Analytics"],
] as const;

/** Filmmaker side: light. */
export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/studio" className="font-display text-2xl">
              Umoobi <span className="text-base text-muted">Studio</span>
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm">
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="text-muted hover:text-fg">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <nav className="text-sm">
            <Suspense fallback={<span className="text-muted">…</span>}>
              <UserMenu />
            </Suspense>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
