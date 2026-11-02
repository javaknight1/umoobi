/**
 * Server-rendered single-series bar charts. One hue (the accent), thin bars with a 4px
 * rounded data end, 2px gaps, a native hover tooltip per bar, recessive axis, and a table
 * view for screen readers and exact values. Single series → no legend; the title names it.
 */

export interface Datum {
  label: string;
  value: number;
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}


function TableView({ title, data, format }: { title: string; data: Datum[]; format: (n: number) => string }) {
  return (
    <details className="mt-2 text-xs text-muted">
      <summary className="cursor-pointer">Show as table</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-b border-line">
              <th scope="row" className="py-1 font-normal">{d.label}</th>
              <td className="py-1 text-right font-mono text-fg">{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Vertical bars over time (e.g. daily sales). Labels only the first, middle and last day. */
export function ColumnChart({
  title,
  data,
  format = String,
  height = 160,
  aside,
}: {
  title: string;
  data: Datum[];
  format?: (n: number) => string;
  height?: number;
  aside?: string;
}) {
  const width = 600;
  const pad = { top: 8, bottom: 22 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = width / Math.max(1, data.length);
  const bar = Math.max(2, slot - 2); // 2px surface gap
  const plotH = height - pad.top - pad.bottom;
  const tick = new Set([0, Math.floor(data.length / 2), data.length - 1]);
  return (
    <figure className="grid gap-3">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-display text-xl">{title}</span>
        {aside ? <span className="text-muted">{aside}</span> : null}
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={title}>
        <line x1={0} x2={width} y1={height - pad.bottom} y2={height - pad.bottom} stroke="var(--line)" />
        {data.map((d, i) => {
          const h = (d.value / max) * plotH;
          const x = i * slot + 1;
          return (
            <g key={d.label} className="group">
              <rect x={i * slot} y={pad.top} width={slot} height={plotH} fill="transparent">
                <title>{`${d.label}: ${format(d.value)}`}</title>
              </rect>
              {h > 0 ? (
                <path d={roundedTop(x, height - pad.bottom - h, bar, h, 4)} fill="var(--chart)" className="pointer-events-none opacity-90 group-hover:opacity-100" />
              ) : null}
              {tick.has(i) ? (
                <text x={x + bar / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">
                  {d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <TableView title={title} data={data} format={format} />
    </figure>
  );
}

/**
 * Horizontal ranked bars (sources, states, funnel, drop-off). Single series, rounded ends,
 * each row hoverable with its exact value; a table view follows.
 * - `stacked` (funnel, mockup 07): label and value on one line, bar with a track below.
 * - `row` (sources/states): label, bar, value in one row.
 */
export function BarList({
  title,
  data,
  format = String,
  empty = "No data yet",
  layout = "row",
  tone = "chart",
  note,
}: {
  title: string;
  data: Datum[];
  format?: (n: number) => string;
  empty?: string;
  layout?: "row" | "stacked";
  tone?: "chart" | "accent";
  note?: (d: Datum) => string | null;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fill = tone === "accent" ? "bg-accent" : "bg-chart";
  return (
    <figure className="grid gap-3">
      <figcaption className="font-display text-xl">{title}</figcaption>
      {data.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul role="img" aria-label={title} className={layout === "stacked" ? "grid gap-4" : "grid"}>
          {data.map((d) => {
            const pct = Math.max(1.5, (d.value / max) * 100);
            return layout === "stacked" ? (
              <li key={d.label} title={`${d.label}: ${format(d.value)}`} className="grid gap-1.5">
                <div className="flex justify-between gap-3 text-[0.95rem]">
                  <span>{d.label}</span>
                  <span>
                    <strong className="font-semibold">{format(d.value)}</strong>
                    {note?.(d) ? <span className="ml-1 text-muted">{note(d)}</span> : null}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-2">
                  <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            ) : (
              <li
                key={d.label}
                title={`${d.label}: ${format(d.value)}`}
                className="grid grid-cols-[minmax(6rem,9rem)_1fr_auto] items-center gap-4 border-b border-line py-3 last:border-0"
              >
                <span className="truncate text-[0.95rem]">{d.label}</span>
                <span className="h-2.5">
                  <span className={`block h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
                </span>
                <span className="min-w-12 text-right text-[0.95rem] tabular-nums">{format(d.value)}</span>
              </li>
            );
          })}
        </ul>
      )}
      {data.length ? <TableView title={title} data={data} format={format} /> : null}
    </figure>
  );
}

/**
 * Share of viewers still watching across the runtime (mockup 07): one teal series as a
 * 2px line over a soft area, a hover tooltip per point and a table view.
 */
export function RetentionChart({ title, data, empty = "No plays yet" }: { title: string; data: Datum[]; empty?: string }) {
  const width = 600;
  const height = 200;
  const pad = { top: 10, bottom: 24 };
  const plotH = height - pad.top - pad.bottom;
  const x = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * width : 0);
  const y = (v: number) => pad.top + plotH - (v / 100) * plotH;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join("");
  return (
    <figure className="grid gap-3">
      <figcaption className="font-display text-xl">{title}</figcaption>
      {data.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label={title}>
          <path d={`${line}L${width},${height - pad.bottom}L0,${height - pad.bottom}Z`} fill="var(--ok)" opacity="0.12" />
          <path d={line} fill="none" stroke="var(--ok)" strokeWidth="2" />
          {data.map((d, i) => (
            <g key={d.label} className="group">
              <rect x={x(i) - width / data.length / 2} y={pad.top} width={width / data.length} height={plotH} fill="transparent">
                <title>{`${d.label} of the film: ${Math.round(d.value)}% still watching`}</title>
              </rect>
              <circle cx={x(i)} cy={y(d.value)} r="4" fill="var(--ok)" className="opacity-0 group-hover:opacity-100" />
              {i % 5 === 0 || i === data.length - 1 ? (
                <text
                  x={x(i)}
                  y={height - 6}
                  fontSize="11"
                  fill="var(--muted)"
                  textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                >
                  {d.label}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      )}
      {data.length ? <TableView title={title} data={data} format={(n) => `${Math.round(n)}%`} /> : null}
    </figure>
  );
}
