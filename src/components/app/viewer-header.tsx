import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { launchStage } from "@/lib/launch";
import { UserMenu } from "./user-menu";

const NAV = [
  ["/discover", "Discover"],
  ["/discover#new", "New"],
  ["/discover#shorts", "Shorts"],
  ["/search?q=documentary", "Documentaries"],
  ["/discover#following", "Following"],
] as const;

/** Dark header for viewer and marketing pages (mockups 01, 10, 14). */
export function ViewerHeader() {
  return (
    <header className="theater sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-[90rem] items-center gap-6 px-4 py-3.5 sm:px-8">
        <Logo />
        {launchStage === "waitlist" ? (
          <div className="ml-auto flex items-center gap-5 text-[0.95rem]">
            <Link href="/guides/leaving-vimeo-on-demand" className="hidden text-muted hover:text-fg sm:inline">
              Leaving Vimeo On Demand?
            </Link>
            <Link href="/#waitlist" className="btn-primary px-5 py-2">
              Join the waitlist
            </Link>
          </div>
        ) : (
          <>
        <nav aria-label="Browse" className="hidden items-center gap-6 text-[0.95rem] text-muted lg:flex">
          {NAV.map(([href, label]) => (
            <Link key={label} href={href} className="hover:text-fg">
              {label}
            </Link>
          ))}
        </nav>
        <form action="/search" role="search" className="hidden min-w-0 flex-1 md:block">
          <label className="flex max-w-lg items-center gap-2 rounded-full border border-line bg-surface/60 px-4 py-2 text-sm text-muted focus-within:border-accent">
            <span aria-hidden>⌕</span>
            <input name="q" placeholder="Search films, filmmakers, actors" aria-label="Search films, filmmakers, actors" className="w-full bg-transparent text-fg outline-none placeholder:text-muted" />
          </label>
        </form>
        <div className="ml-auto text-[0.95rem]">
          <Suspense fallback={<span className="text-muted">…</span>}>
            <UserMenu />
          </Suspense>
        </div>
          </>
        )}
      </div>
    </header>
  );
}

export function ViewerFooter() {
  return (
    <footer className="theater border-t border-line">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-3">
          <Logo className="text-xl text-fg" />
          <span>Made for independent film.</span>
        </div>
        <nav className="flex flex-wrap gap-5">
          <Link href="/legal/terms" className="hover:text-fg">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-fg">Privacy</Link>
          <Link href="/legal/license" className="hover:text-fg">License</Link>
          <Link href="/legal/ai-policy" className="hover:text-fg">AI policy</Link>
          <Link href="/dmca" className="hover:text-fg">Copyright</Link>
        </nav>
      </div>
    </footer>
  );
}
