"use client";

import { useState } from "react";
import { RENTAL_WINDOWS, rentalWindowLabel } from "@/lib/library/format";
import { formatCents, parsePriceToCents, previewSale, validatePrice, type PriceError } from "@/lib/money";

interface Initial {
  rent: { priceCents: number; hours: number } | null;
  buy: { priceCents: number } | null;
}

const ERRORS: Record<Exclude<PriceError, null>, string> = {
  below_floor: "The lowest price is $0.99.",
  free_not_allowed: "Free is only for films under 5 minutes.",
};

function toInput(cents: number | undefined) {
  return cents === undefined ? "" : (cents / 100).toFixed(2);
}

export function PricingForm(props: { filmId: string; runtimeSeconds: number | null; feeBps: number; founding: boolean; initial: Initial }) {
  const [rentOn, setRentOn] = useState(!!props.initial.rent);
  const [buyOn, setBuyOn] = useState(!!props.initial.buy);
  const [rentPrice, setRentPrice] = useState(toInput(props.initial.rent?.priceCents ?? 499));
  const [buyPrice, setBuyPrice] = useState(toInput(props.initial.buy?.priceCents ?? 1299));
  const [hours, setHours] = useState(props.initial.rent?.hours ?? 48);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });
  const canBeFree = props.runtimeSeconds !== null && props.runtimeSeconds < 300;

  const check = (input: string) => {
    const cents = parsePriceToCents(input);
    if (cents === null) return { cents: null, error: "Enter a price like 4.99." };
    const err = validatePrice(cents, props.runtimeSeconds);
    return { cents, error: err ? ERRORS[err] : null };
  };
  const rent = check(rentPrice);
  const buy = check(buyPrice);
  const invalid = (!rentOn && !buyOn) || (rentOn && !!rent.error) || (buyOn && !!buy.error);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    setStatus({ kind: "saving" });
    const res = await fetch(`/api/films/${props.filmId}/offers`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rent: rentOn ? { priceCents: rent.cents, hours } : null,
        buy: buyOn ? { priceCents: buy.cents } : null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setStatus(res.ok ? { kind: "saved", message: "Prices saved." } : { kind: "error", message: body.error ?? "Couldn't save." });
  }

  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
      <OfferCard
        title="Rent"
        on={rentOn}
        setOn={setRentOn}
        price={rentPrice}
        setPrice={setRentPrice}
        error={rentOn ? rent.error : null}
        cents={rent.cents}
        feeBps={props.feeBps}
        founding={props.founding}
      >
        <label className="grid gap-1">
          <span className="label">Rental window</span>
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="field" disabled={!rentOn}>
            {RENTAL_WINDOWS.map((h) => (
              <option key={h} value={h}>
                {rentalWindowLabel(h)}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">Starts when the viewer presses play. They have 30 days to start.</span>
        </label>
      </OfferCard>
      <OfferCard
        title="Buy"
        on={buyOn}
        setOn={setBuyOn}
        price={buyPrice}
        setPrice={setBuyPrice}
        error={buyOn ? buy.error : null}
        cents={buy.cents}
        feeBps={props.feeBps}
        founding={props.founding}
      >
        <p className="text-xs text-muted">Buyers see that buying is a license to stream, not ownership.</p>
      </OfferCard>
      <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
        <button disabled={invalid || status.kind === "saving"} className="btn-primary">
          {status.kind === "saving" ? "Saving…" : "Save prices"}
        </button>
        {canBeFree ? <span className="text-sm text-muted">This film is under 5 minutes, so it can be free (enter 0).</span> : null}
        {!rentOn && !buyOn ? <span className="text-sm text-bad">Turn on rent, buy or both.</span> : null}
        <span role="status" className={`text-sm ${status.kind === "error" ? "text-bad" : "text-ok"}`}>
          {status.message ?? ""}
        </span>
      </div>
    </form>
  );
}

function OfferCard(props: {
  title: string;
  on: boolean;
  setOn: (v: boolean) => void;
  price: string;
  setPrice: (v: string) => void;
  error: string | null;
  cents: number | null;
  feeBps: number;
  founding: boolean;
  children: React.ReactNode;
}) {
  const id = props.title.toLowerCase();
  const preview = props.cents !== null && !props.error ? previewSale(props.cents, props.feeBps) : null;
  return (
    <fieldset className={`card grid content-start gap-3 ${props.on ? "" : "opacity-70"}`}>
      <legend className="sr-only">{props.title}</legend>
      <label className="flex items-center gap-2 font-medium">
        <input type="checkbox" checked={props.on} onChange={(e) => props.setOn(e.target.checked)} />
        Offer {props.title.toLowerCase()}
      </label>
      <label className="grid gap-1">
        <span className="label">{props.title} price</span>
        <div className="flex items-center gap-2">
          <span className="text-muted">$</span>
          <input
            id={`${id}-price`}
            inputMode="decimal"
            value={props.price}
            onChange={(e) => props.setPrice(e.target.value)}
            disabled={!props.on}
            className="field"
            aria-invalid={!!props.error}
          />
        </div>
        {props.error ? <span className="text-sm text-bad">{props.error}</span> : null}
      </label>
      {props.children}
      {preview && props.on ? (
        <div className="grid gap-1 rounded-xl bg-bg p-3 font-mono text-sm" aria-label={`${props.title} per-sale preview`}>
          <Line k="Your price" v={formatCents(preview.priceCents)} />
          <Line k={`Umoobi fee (${props.founding ? "5%, founding" : "10%"})`} v={`−${formatCents(preview.feeCents)}`} />
          <Line k="Card processing (est.)" v={`−${formatCents(preview.processingCents)}`} />
          <div className="border-t border-line pt-1">
            <Line k="You earn per sale" v={formatCents(preview.netCents)} strong />
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}

function Line({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) {
  return (
    <p className={`flex justify-between ${strong ? "font-semibold" : ""}`}>
      <span className="font-sans text-muted">{k}</span>
      <span>{v}</span>
    </p>
  );
}
