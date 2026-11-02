import { AppShell, UserChip } from "@/components/app/app-shell";
import type { NavGroup } from "@/components/app/side-nav";
import { getSessionUser } from "@/lib/auth/session";

/** Staff tools (mockup 16). Every page calls requireStaff (role + TOTP, aal2) itself. */
export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return (
    <AppShell groups={GROUPS} user={<StaffUser />}>
      {children}
    </AppShell>
  );
}

const GROUPS: NavGroup[] = [
  {
    title: "Staff tools",
    items: [
      { href: "/staff", label: "Review queue", exact: true },
      { href: "/staff/takedowns", label: "Takedown requests" },
      { href: "/staff/payouts", label: "Payout holds" },
      { href: "/staff/jobs", label: "Jobs" },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/staff/shelves", label: "Featured shelves" },
      { href: "/staff/waitlist", label: "Waitlist" },
      { href: "/settings/security", label: "Settings" },
    ],
  },
];

async function StaffUser() {
  const user = await getSessionUser();
  if (!user) return null;
  return <UserChip name={user.displayName ?? user.email ?? "Staff"} role="Reviewer" />;
}
