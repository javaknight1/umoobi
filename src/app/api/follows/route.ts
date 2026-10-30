import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function parse(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const personId = body?.personId && UUID_RE.test(body.personId) ? String(body.personId) : null;
  const accountId = body?.accountId && UUID_RE.test(body.accountId) ? String(body.accountId) : null;
  return (personId ? { person_id: personId } : accountId ? { account_id: accountId } : null) as
    | { person_id: string }
    | { account_id: string }
    | null;
}

/** Follow a person or filmmaker. RLS limits rows to the signed-in follower. */
export async function POST(request: NextRequest) {
  const target = await parse(request);
  if (!target) return NextResponse.json({ error: "Nothing to follow." }, { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in to follow." }, { status: 401 });
  const { error } = await supabase.from("follows").insert({ follower_id: auth.user.id, ...target });
  if (error && error.code !== "23505") return NextResponse.json({ error: "Couldn't follow." }, { status: 400 });
  return NextResponse.json({ following: true });
}

export async function DELETE(request: NextRequest) {
  const target = await parse(request);
  if (!target) return NextResponse.json({ error: "Nothing to unfollow." }, { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  let q = supabase.from("follows").delete().eq("follower_id", auth.user.id);
  q = "person_id" in target ? q.eq("person_id", target.person_id) : q.eq("account_id", target.account_id);
  await q;
  return NextResponse.json({ following: false });
}
