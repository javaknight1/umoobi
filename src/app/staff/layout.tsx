import Link from "next/link";

const NAV = [
  ["/staff", "Review queue"],
  ["/staff/takedowns", "Takedowns"],
  ["/staff/payouts", "Payout holds"],
  ["/staff/shelves", "Shelves"],
  ["/staff/waitlist", "Waitlist"],
  ["/staff/jobs", "Jobs"],
] as const;

/** Staff tools. Every page calls requireStaff (role + TOTP, aal2) itself. */
export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-fg text-bg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-4 py-3">
          <Link href="/staff" className="font-display text-2xl">
            Umoobi <span className="text-base opacity-70">Staff</span>
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm opacity-80">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="hover:opacity-100">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
