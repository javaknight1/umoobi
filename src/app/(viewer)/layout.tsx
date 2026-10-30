import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/components/app/user-menu";
import { SiteFooter } from "@/components/marketing/site-header";

/** Viewer side: dark, like a theater. No third-party scripts on these pages (VPPA, D38). */
export default function ViewerLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="theater flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/discover" className="font-display text-2xl">
              Umoobi
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/discover" className="text-muted hover:text-fg">
                Discover
              </Link>
              <Link href="/search" className="text-muted hover:text-fg">
                Search
              </Link>
            </nav>
          </div>
          <nav className="text-sm">
            <Suspense fallback={<span className="text-muted">…</span>}>
              <UserMenu />
            </Suspense>
          </nav>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
