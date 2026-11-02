import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, StatCard } from "@/components/app/app-shell";
import { Avatar, Poster } from "@/components/brand";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { decideReview } from "./actions";

export const metadata: Metadata = { title: "Review queue · Staff", robots: { index: false } };

export default function ReviewQueuePage() {
  return (
    <div className="w-full">
      <PageHeader eyebrow="Umoobi staff" title="Review queue" />
      <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
        <Queue />
      </Suspense>
    </div>
  );
}

const KIND_LABEL: Record<string, string> = {
  account: "Filmmaker application",
  film: "Film checks",
  ai_flag: "AI-generated flag",
  report: "Viewer report",
  takedown: "Takedown",
};

/** Open items, oldest due first, with an overdue flag computed at request time. */
async function loadQueue() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("review_items")
    .select("*, film:films(id, title, slug, status, ai_generated), account:filmmaker_accounts(id, display_name, legal_name, past_work, website)")
    .in("status", ["open", "proof_requested"])
    .neq("kind", "takedown")
    .order("due_at", { ascending: true, nullsFirst: false });
  const now = Date.now();
  return (data ?? []).map((item) => ({ ...item, overdue: !!item.due_at && new Date(item.due_at).getTime() < now }));
}

async function Queue() {
  await requireStaff("/staff");
  const items = await loadQueue();
  const supabase = await createClient();
  const nowMs = new Date().getTime();
  const weekAgo = new Date(nowMs - 7 * 86400_000).toISOString();
  const { data: week } = await supabase.from("verifications").select("score").gte("created_at", weekAgo);
  const scores = (week ?? []).map((v) => v.score);
  const oldest = items.reduce<number | null>((max, i) => {
    const age = (nowMs - new Date(i.created_at).getTime()) / 3600_000;
    return max === null || age > max ? age : max;
  }, null);

  return (
    <>
      {items.length ? (
        <p className="pill -mt-4 mb-6 w-fit bg-accent/20 px-4 py-1.5 text-sm text-warn">
          {items.length} waiting{oldest !== null ? ` · oldest ${Math.max(1, Math.round(oldest))} hour${Math.round(oldest) === 1 ? "" : "s"}` : ""}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Checks this week" value={scores.length} />
        <StatCard label="Approved automatically" value={scores.filter((s) => s >= 80).length} />
        <StatCard label="Rejected automatically" value={scores.filter((s) => s < 50).length} />
        <StatCard label="Sent to review" value={scores.filter((s) => s >= 50 && s < 80).length} />
      </div>
      <section className="card mt-6">
        <h2 className="font-display text-xl">Needs a human decision</h2>
        <p className="text-muted">
          Uploads and applications scoring 50 to 79, plus AI flags and viewer reports. Above 80 they publish; below 50 they&apos;re
          rejected with a reason. Answer within 24 hours.
        </p>
        {items.length ? (
          <ul className="mt-4 grid">
            {items.map((item) => {
              const { overdue } = item;
              const isAi = item.kind === "ai_flag" || (item.kind === "report" && /ai/i.test(item.reason ?? ""));
              return (
                <li key={item.id} className="grid gap-3 border-b border-line py-5 last:border-0" data-testid="review-item">
                  <div className="flex flex-wrap items-start gap-5">
                    <span className="w-14 shrink-0">
                      {item.film ? (
                        <Poster title={item.film.title} url={null} slug={item.film.slug} bare className="rounded-lg" />
                      ) : (
                        <Avatar name={item.account?.display_name ?? "?"} size={56} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p>
                        <span className="font-display text-lg">
                          {item.film ? (
                            <Link href={`/f/${item.film.slug}`} className="hover:underline">
                              {item.film.title}
                            </Link>
                          ) : (
                            (item.account?.display_name ?? KIND_LABEL[item.kind])
                          )}
                        </span>
                        {item.film && item.account ? <span className="text-muted"> by {item.account.display_name}</span> : null}
                      </p>
                      <p className="text-sm text-muted">
                        {KIND_LABEL[item.kind] ?? item.kind}
                        {item.film ? ` · ${item.film.status}${item.film.ai_generated ? ", labeled AI" : ""}` : ""}
                        {item.status === "proof_requested" ? <span className="text-warn"> · proof requested</span> : null}
                        {item.due_at ? (
                          <span className={overdue ? "text-bad" : ""}>
                            {" "}
                            · {overdue ? "Overdue" : "Due"} {item.due_at.slice(0, 16).replace("T", " ")} UTC
                          </span>
                        ) : null}
                      </p>
                      {item.reason ? <p className="mt-1">{item.reason}</p> : null}
                      {item.kind === "account" && item.account ? (
                        <p className="mt-1 text-sm text-muted">
                          Legal name: {item.account.legal_name ?? "none"}
                          {item.account.past_work ? ` · Past work: ${item.account.past_work}` : ""}
                        </p>
                      ) : null}
                    </div>
                    {item.score !== null ? (
                      <p className="text-right">
                        <span className="block font-display text-4xl text-warn">{item.score}</span>
                        <span className="text-sm text-muted">confidence</span>
                      </p>
                    ) : null}
                  </div>
                  <form action={decideReview} className="grid gap-2 sm:pl-[4.75rem]">
                    <input type="hidden" name="item_id" value={item.id} />
                    <input name="note" placeholder="Note to the filmmaker (sent with rejections and proof requests)" aria-label="Note" className="field" />
                    <div className="flex flex-wrap gap-2">
                      {isAi ? (
                        <>
                          <button name="decision" value="clear_ai" className="btn bg-ok text-white">
                            Clear flag (not AI)
                          </button>
                          <button name="decision" value="confirm_ai" className="btn border border-bad text-bad">
                            Confirm undeclared AI
                          </button>
                        </>
                      ) : (
                        <>
                          <button name="decision" value="approve" className="btn bg-ok text-white">
                            {item.kind === "report" ? "Dismiss report" : "Approve"}
                          </button>
                          <button name="decision" value="proof" className="btn-ghost">
                            Ask for proof
                          </button>
                          <button name="decision" value="reject" className="btn border border-bad text-bad">
                            {item.kind === "report" ? "Take down" : "Reject"}
                          </button>
                        </>
                      )}
                      {isAi ? (
                        <button name="decision" value="proof" className="btn-ghost">
                          Ask for proof
                        </button>
                      ) : null}
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-muted">Nothing to review. Nice.</p>
        )}
      </section>
    </>
  );
}
