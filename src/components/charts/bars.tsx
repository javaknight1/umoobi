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

function roundedRight(x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, h / 2, w);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
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
export function ColumnChart({ title, data, format = String, height = 160 }: { title: string; data: Datum[]; format?: (n: number) => string; height?: number }) {
  const width = 600;
  const pad = { top: 8, bottom: 22 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = width / Math.max(1, data.length);
  const bar = Math.max(2, slot - 2); // 2px surface gap
  const plotH = height - pad.top - pad.bottom;
  const tick = new Set([0, Math.floor(data.length / 2), data.length - 1]);
  return (
    <figure className="grid gap-1">
      <figcaption className="text-sm font-medium">{title}</figcaption>
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
                <path d={roundedTop(x, height - pad.bottom - h, bar, h, 4)} fill="var(--accent)" className="pointer-events-none opacity-90 group-hover:opacity-100" />
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

/** Horizontal ranked bars with direct value labels (sources, states, funnel, drop-off). */
export function BarList({ title, data, format = String, empty = "No data yet" }: { title: string; data: Datum[]; format?: (n: number) => string; empty?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const rowH = 26;
  const width = 600;
  const labelW = 150;
  const valueW = 70;
  const plotW = width - labelW - valueW;
  return (
    <figure className="grid gap-1">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      {data.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${data.length * rowH}`} className="h-auto w-full" role="img" aria-label={title}>
          {data.map((d, i) => {
            const w = (d.value / max) * plotW;
            const y = i * rowH;
            return (
              <g key={d.label} className="group">
                <rect x={0} y={y} width={width} height={rowH} fill="transparent">
                  <title>{`${d.label}: ${format(d.value)}`}</title>
                </rect>
                <text x={0} y={y + 17} fontSize="12" fill="var(--fg)" className="pointer-events-none">
                  {d.label.length > 22 ? `${d.label.slice(0, 21)}…` : d.label}
                </text>
                {w > 0 ? (
                  <path d={roundedRight(labelW, y + 6, w, rowH - 12, 4)} fill="var(--accent)" className="pointer-events-none opacity-90 group-hover:opacity-100" />
                ) : null}
                <text x={width} y={y + 17} fontSize="12" textAnchor="end" fill="var(--muted)" className="pointer-events-none font-mono">
                  {format(d.value)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {data.length ? <TableView title={title} data={data} format={format} /> : null}
    </figure>
  );
}
