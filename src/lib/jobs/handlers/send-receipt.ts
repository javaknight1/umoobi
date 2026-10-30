import "server-only";
import { sendEmail } from "@/lib/email";
import { receiptEmail } from "@/lib/email/receipt";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import type { JobPayload } from "../index";

/** Emails the buyer a receipt once an order is paid. Free films get one too (it's their library). */
export async function sendReceipt(payload: JobPayload) {
  const orderId = String(payload.order_id ?? "");
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("id, viewer_id, kind, status, subtotal_cents, tax_cents, total_cents, offer:offers!inner(rental_hours), film:films!inner(title)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "paid") return;
  const { data: user } = await db.auth.admin.getUserById(order.viewer_id);
  const to = user.user?.email;
  if (!to) return;
  await sendEmail(
    receiptEmail({
      to,
      orderId: order.id,
      filmTitle: order.film.title,
      kind: order.kind as "rent" | "buy",
      subtotalCents: order.subtotal_cents,
      taxCents: order.tax_cents,
      totalCents: order.total_cents,
      rentalHours: order.offer.rental_hours,
      libraryUrl: `${siteUrl}/library`,
    }),
  );
}
