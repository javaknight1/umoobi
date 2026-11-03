import Link from "next/link";
import { Avatar } from "@/components/brand";
import { getSessionUser, hasRole } from "@/lib/auth/session";

/** Right side of the viewer header. Render inside <Suspense>: it reads the session. */
export async function UserMenu() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="flex items-center gap-5">
        <Link href="/filmmakers/apply" className="hidden text-muted hover:text-fg sm:inline">
          For filmmakers
        </Link>
        <Link href="/sign-in" className="btn-primary px-4 py-2">
          Sign in
        </Link>
      </div>
    );
  }
  const name = user.displayName ?? user.email ?? "You";
  return (
    <div className="flex items-center gap-5">
      {hasRole(user, "staff") ? (
        <Link href="/staff" className="hidden text-muted hover:text-fg sm:inline">
          Staff
        </Link>
      ) : null}
      {hasRole(user, "filmmaker") ? (
        <Link href="/studio" className="hidden text-muted hover:text-fg sm:inline">
          Studio
        </Link>
      ) : null}
      <Link href="/library" className="text-muted hover:text-fg">
        <span className="hidden sm:inline">My library</span>
        <span className="sm:hidden">Library</span>
      </Link>
      <details className="relative">
        <summary className="list-none cursor-pointer rounded-full [&::-webkit-details-marker]:hidden">
          <span aria-hidden>
            <Avatar name={name} size={40} />
          </span>
          <span className="sr-only">Account menu</span>
        </summary>
        <div className="absolute right-0 top-12 z-30 grid w-48 gap-1 rounded-2xl border border-line bg-surface p-2 text-sm shadow-xl">
          <p className="truncate px-3 py-1.5 text-xs text-muted">{user.email}</p>
          <Link href="/settings/profile" className="rounded-lg px-3 py-1.5 hover:bg-surface-2">Profile</Link>
          <Link href="/settings/sharing" className="rounded-lg px-3 py-1.5 hover:bg-surface-2">Sharing</Link>
          <form action="/auth/sign-out" method="post">
            <button className="w-full rounded-lg px-3 py-1.5 text-left hover:bg-surface-2">Sign out</button>
          </form>
        </div>
      </details>
    </div>
  );
}
