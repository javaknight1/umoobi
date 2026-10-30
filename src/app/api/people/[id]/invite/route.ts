import { NextResponse, type NextRequest } from "next/server";
import { sendEmail } from "@/lib/email";
import { button, layout } from "@/lib/email/templates";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A filmmaker invites a credited person to claim their page. Only the account that created
 * an unclaimed person can invite; the token rotates on each invite.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/people/[id]/invite">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createAdminClient();
  const { data: person } = await admin
    .from("people")
    .select("id, name, claimed_by, created_by_account")
    .eq("id", id)
    .maybeSingle();
  if (!person || person.claimed_by) return NextResponse.json({ error: "This page can't be claimed." }, { status: 400 });
  const { data: member } = person.created_by_account
    ? await supabase.rpc("is_account_member", { a: person.created_by_account })
    : { data: false };
  if (!member) return NextResponse.json({ error: "Only the filmmaker who added this person can invite them." }, { status: 403 });

  const { data: account } = await admin
    .from("filmmaker_accounts")
    .select("display_name")
    .eq("id", person.created_by_account!)
    .single();
  const token = crypto.randomUUID();
  await admin.from("people").update({ invite_token: token, invite_email: email }).eq("id", id);

  const link = `${siteUrl}/claim/${token}`;
  const from = account?.display_name ?? "A filmmaker";
  await sendEmail({
    to: email,
    subject: `${from} credited you on Umoobi`,
    text: `${from} listed you in the credits of their film on Umoobi. Claim your page to add a photo and bio: ${link}\n`,
    html: layout(
      "Claim your page",
      `<p>${from} listed you, ${person.name}, in the credits of their film on Umoobi. Claim your page to add a photo and bio, and let viewers follow your work.</p>${button(link, "Claim my page")}`,
    ),
  });
  return NextResponse.json({ ok: true });
}
