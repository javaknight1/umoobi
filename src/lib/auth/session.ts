import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "viewer" | "filmmaker" | "staff" | "admin";

export interface SessionUser {
  id: string;
  email: string | null;
  roles: Role[];
  displayName: string | null;
}

/** The signed-in user with roles from `profiles`, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("roles, display_name")
    .eq("id", data.user.id)
    .maybeSingle();
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    roles: (profile?.roles ?? ["viewer"]) as Role[],
    displayName: profile?.display_name ?? null,
  };
}

export function hasRole(user: SessionUser | null, role: Role): boolean {
  return !!user && (user.roles.includes(role) || user.roles.includes("admin"));
}

export async function requireUser(next: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Staff pages need the staff role and a second factor (TOTP, aal2). Staff without a
 * verified factor are sent to enroll one.
 */
export async function requireStaff(next: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!hasRole(user, "staff")) redirect("/");
  if (process.env.STAFF_REQUIRE_2FA !== "false") {
    const supabase = await createClient();
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel !== "aal2") redirect(`/settings/security?next=${encodeURIComponent(next)}`);
  }
  return user;
}
