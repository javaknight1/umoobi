import { LICENSE_STATEMENT, rentalWindowLabel } from "@/lib/library/format";
import { formatCents } from "@/lib/money";
import type { Email } from "./index";
import { button, layout } from "./templates";

export interface ReceiptData {
  to: string;
  orderId: string;
  filmTitle: string;
  kind: "rent" | "buy";
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  rentalHours: number | null;
  libraryUrl: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Purchase or rental receipt. Purchases repeat the license statement (AB 2426). */
export function receiptEmail(d: ReceiptData): Email {
  const what = d.kind === "rent" ? "Rental" : "Purchase";
  const lines: [string, string][] = [
    [d.kind === "rent" ? "Rental price" : "Price", formatCents(d.subtotalCents)],
    ["Sales tax", formatCents(d.taxCents)],
    ["Total", formatCents(d.totalCents)],
  ];
  const note =
    d.kind === "rent"
      ? `Start within 30 days. Once you press play you have ${rentalWindowLabel(d.rentalHours ?? 48)} to finish.`
      : LICENSE_STATEMENT;
  const text = [
    `${what}: ${d.filmTitle}`,
    ...lines.map(([k, v]) => `${k}: ${v}`),
    "",
    note,
    "",
    `Watch: ${d.libraryUrl}`,
    `Order: ${d.orderId}`,
  ].join("\n");
  const rows = lines
    .map(([k, v], i) => {
      const bold = i === lines.length - 1 ? "font-weight:600;" : "";
      return `<tr><td style="padding:4px 0;${bold}">${k}</td><td style="text-align:right;${bold}">${v}</td></tr>`;
    })
    .join("");
  return {
    to: d.to,
    subject: `Your Umoobi receipt: ${d.filmTitle}`,
    text,
    html: layout(
      `${what}: ${esc(d.filmTitle)}`,
      `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
<p style="font-size:14px;color:#6b645a">${esc(note)}</p>${button(d.libraryUrl, "Open your library")}
<p style="font-size:12px;color:#6b645a">Order ${d.orderId}</p>`,
    ),
  };
}
