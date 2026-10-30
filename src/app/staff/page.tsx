import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { decideReview } from "./actions";

export const metadata: Metadata = { title: "Review queue · Staff", robots: { index: false } };

export default function ReviewQueuePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="font-display text-4xl">Review queue</h1>
      <p className="mt-1 text-sm text-muted">
        Only what the automatic checks weren&apos;t sure about, plus AI flags and viewer reports. Answer within 24 hours.
      </p>
      <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
        <Queue />
      </Suspense>
    </main>
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

  if (!items.length) return <p className="card mt-8 text-muted">Nothing to review. Nice.</p>;

  return (
    <ul className="mt-8 grid gap-4">
      {items.map((item) => {
        const { overdue } = item;
        const isAi = item.kind === "ai_flag" || (item.kind === "report" && /ai/i.test(item.reason ?? ""));
        return (
          <li key={item.id} className="card grid gap-3" data-testid="review-item">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {KIND_LABEL[item.kind] ?? item.kind}
                {item.score !== null ? <span className="text-muted"> · score {item.score}</span> : null}
                {item.status === "proof_requested" ? <span className="text-warn"> · proof requested</span> : null}
              </p>
              {item.due_at ? (
                <span className={`text-xs ${overdue ? "text-bad" : "text-muted"}`}>
                  {overdue ? "Overdue" : "Due"} {item.due_at.slice(0, 16).replace("T", " ")} UTC
                </span>
              ) : null}
            </div>
            {item.film ? (
              <p className="text-sm">
                Film:{" "}
                <Link href={`/f/${item.film.slug}`} className="underline underline-offset-2">
                  {item.film.title}
                </Link>{" "}
                <span className="text-muted">({item.film.status}{item.film.ai_generated ? ", labeled AI" : ""})</span>
              </p>
            ) : null}
            {item.account ? (
              <p className="text-sm">
                Filmmaker: {item.account.display_name} <span className="text-muted">({item.account.legal_name ?? "no legal name"})</span>
                {item.kind === "account" && item.account.past_work ? <span className="block text-muted">Past work: {item.account.past_work}</span> : null}
              </p>
            ) : null}
            {item.reason ? <p className="text-sm text-muted">{item.reason}</p> : null}
            <form action={decideReview} className="grid gap-2">
              <input type="hidden" name="item_id" value={item.id} />
              <input name="note" placeholder="Note to the filmmaker (sent with rejections and proof requests)" aria-label="Note" className="field" />
              <div className="flex flex-wrap gap-2">
                {isAi ? (
                  <>
                    <button name="decision" value="clear_ai" className="btn-primary">
                      Clear flag (not AI)
                    </button>
                    <button name="decision" value="confirm_ai" className="btn border border-bad text-bad">
                      Confirm undeclared AI
                    </button>
                  </>
                ) : (
                  <>
                    <button name="decision" value="approve" className="btn-primary">
                      {item.kind === "report" ? "Dismiss report" : "Approve"}
                    </button>
                    <button name="decision" value="reject" className="btn border border-bad text-bad">
                      {item.kind === "report" ? "Take down" : "Reject"}
                    </button>
                  </>
                )}
                <button name="decision" value="proof" className="btn-ghost">
                  Ask for proof
                </button>
              </div>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
