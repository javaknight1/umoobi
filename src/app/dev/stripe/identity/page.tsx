import { Suspense } from "react";
import { DevShell } from "../shell";
import { completeIdentity } from "../actions";

export default function DevIdentity({ searchParams }: PageProps<"/dev/stripe/identity">) {
  return (
    <DevShell title="ID check (dev)">
      <Suspense>
        <Body searchParams={searchParams} />
      </Suspense>
    </DevShell>
  );
}

async function Body({ searchParams }: Pick<PageProps<"/dev/stripe/identity">, "searchParams">) {
  const { session, return: ret } = await searchParams;
  return (
    <form action={completeIdentity} className="grid gap-3">
      <input type="hidden" name="session" value={String(session ?? "")} />
      <input type="hidden" name="return" value={String(ret ?? "")} />
      <p className="text-sm text-muted">Stands in for Stripe Identity. Pick the outcome.</p>
      <div className="flex gap-2">
        <button name="outcome" value="verified" className="btn-primary">
          Pass ID check
        </button>
        <button name="outcome" value="requires_input" className="btn-ghost">
          Fail ID check
        </button>
      </div>
    </form>
  );
}
