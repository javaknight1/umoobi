import { AppShell, UserChip } from "@/components/app/app-shell";
import type { NavGroup } from "@/components/app/side-nav";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Filmmaker side: light page, navy sidebar (mockups 03–08). */
export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return (
    <AppShell groups={GROUPS} user={<StudioUser />}>
      {children}
    </AppShell>
  );
}

const GROUPS: NavGroup[] = [
  {
    title: "Studio",
    items: [
      { href: "/studio", label: "Dashboard", exact: true },
      { href: "/studio/films", label: "Films" },
      { href: "/studio/analytics", label: "Analytics" },
      { href: "/studio/money", label: "Money" },
    ],
  },
  {
    title: "Your page",
    items: [
      { href: "/studio/people", label: "Credits & people" },
      { href: "/studio/profile", label: "Public profile" },
      { href: "/settings/security", label: "Settings" },
    ],
  },
];

async function StudioUser() {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: account } = await supabase
    .from("filmmaker_accounts")
    .select("display_name, tier")
    .eq("owner_id", user.id)
    .maybeSingle();
  return (
    <UserChip
      name={user.displayName ?? account?.display_name ?? user.email ?? "Filmmaker"}
      role={account ? `${account.tier === "established" ? "Established" : "New"} filmmaker · ${account.display_name}` : "Filmmaker"}
    />
  );
}
