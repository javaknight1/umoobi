import { Suspense } from "react";
import { Avatar, Logo } from "@/components/brand";
import { SideNav, TopNav, type NavGroup } from "./side-nav";

/**
 * Studio and staff layout (mockups 03–08, 16): navy sidebar with logo, nav groups and the
 * user chip; light lavender page. On phones the sidebar becomes a top bar.
 */
export function AppShell({
  groups,
  user,
  children,
}: {
  groups: NavGroup[];
  /** Streams in: reads the session. */
  user: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      {/* The rail stretches with the page; its contents stay pinned to the viewport. */}
      <aside className="sidebar z-20 lg:w-80 lg:shrink-0">
        <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <div className="px-4 py-4 lg:px-7 lg:pb-10 lg:pt-8">
            <Logo href="/" />
          </div>
          <div className="px-4 pb-3 lg:hidden">
            <Suspense fallback={<div className="h-8" />}>
              <TopNav groups={groups} />
            </Suspense>
          </div>
          <div className="hidden flex-1 overflow-y-auto px-4 lg:block">
            <Suspense fallback={null}>
              <SideNav groups={groups} />
            </Suspense>
          </div>
          <div className="mx-4 border-t border-line py-3 lg:py-5">
            <Suspense fallback={<div className="h-12" />}>{user}</Suspense>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</main>
    </div>
  );
}

/** Avatar + name + role line, as at the bottom of the mockup sidebars. */
export function UserChip({ name, role, compact = false }: { name: string; role: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} size={compact ? 36 : 48} />
      <div className={compact ? "hidden" : "min-w-0"}>
        <p className="truncate font-semibold">{name}</p>
        <p className="truncate text-sm text-muted">{role}</p>
      </div>
      <form action="/auth/sign-out" method="post" className="ml-auto">
        <button className="text-xs text-muted hover:text-fg">Sign out</button>
      </form>
    </div>
  );
}

/** Page title block: small breadcrumb/eyebrow line, big title, actions on the right. */
export function PageHeader({ eyebrow, title, actions }: { eyebrow?: React.ReactNode; title: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex min-w-0 flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Stat card: label, big number, optional small note. */
export function StatCard({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="card p-7">
      <p className="text-muted">{label}</p>
      <p className="mt-1 font-display text-4xl">{value}</p>
      {note ? <p className="mt-2 text-sm text-muted">{note}</p> : null}
    </div>
  );
}
