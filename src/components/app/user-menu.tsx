import Link from "next/link";
import { getSessionUser, hasRole } from "@/lib/auth/session";

/** Signed-in links for the header. Render inside <Suspense>: it reads the session. */
export async function UserMenu() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <Link href="/sign-in" className="text-muted hover:text-fg">
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <Link href="/library" className="text-muted hover:text-fg">
        Library
      </Link>
      {hasRole(user, "filmmaker") ? (
        <Link href="/studio" className="text-muted hover:text-fg">
          Studio
        </Link>
      ) : null}
      {hasRole(user, "staff") ? (
        <Link href="/staff" className="text-muted hover:text-fg">
          Staff
        </Link>
      ) : null}
      <form action="/auth/sign-out" method="post">
        <button className="text-muted hover:text-fg">Sign out</button>
      </form>
    </div>
  );
}
