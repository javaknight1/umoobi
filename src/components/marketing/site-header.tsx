import Link from "next/link";

export function SiteHeader({ dark = false }: { dark?: boolean }) {
  return (
    <header className={`${dark ? "theater" : ""} border-b border-line`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Umoobi
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/guides/leaving-vimeo-on-demand" className="hidden text-muted hover:text-fg sm:inline">
            Leaving Vimeo On Demand?
          </Link>
          <Link href="/sign-in" className="text-muted hover:text-fg">
            Sign in
          </Link>
          <Link href="/#waitlist" className="btn-primary px-4 py-2">
            Join the waitlist
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between">
        <p>© 2026 Umoobi. Made for independent film.</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/ai-policy">AI policy</Link>
          <Link href="/dmca">Copyright</Link>
        </nav>
      </div>
    </footer>
  );
}
