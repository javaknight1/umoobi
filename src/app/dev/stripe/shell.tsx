import { assertDevPayments } from "@/lib/payments/dev-guard";

export function DevShell({ title, children }: { title: string; children: React.ReactNode }) {
  assertDevPayments();
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-warn">Development payments</p>
      <h1 className="mt-2 font-display text-4xl">{title}</h1>
      <div className="card mt-6">{children}</div>
    </main>
  );
}
