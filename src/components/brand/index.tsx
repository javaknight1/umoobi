import Link from "next/link";

/** Amber dot + lowercase wordmark. */
export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 text-[1.6rem] font-bold leading-none tracking-tight ${className}`}>
      <span aria-hidden className="inline-block h-6 w-6 rounded-full bg-accent shadow-[0_0_0_4px_rgba(255,173,51,0.22)]" />
      umoobi
    </Link>
  );
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const AVATAR_COLORS = ["#a8daf0", "#cdbff7", "#ffc9a8", "#bfe6cd", "#f6c0d6", "#ffad33"];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** Pastel initials circle, or the photo when there is one. */
export function Avatar({ name, photo, size = 48, className = "" }: { name: string; photo?: string | null; size?: number; className?: string }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" width={size} height={size} className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-[#1a1730] ${className}`}
      style={{ width: size, height: size, background: AVATAR_COLORS[hash(name) % AVATAR_COLORS.length], fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

type Motif = "sun" | "arch" | "moons" | "dots" | "sign" | "ferry" | "burst" | "rings" | "window";

const PALETTES: Record<Motif, { bg: string; ink: string; title: string }> = {
  sun: { bg: "#1f6f74", ink: "#ffad33", title: "#f6ecd2" },
  arch: { bg: "#3b1519", ink: "#ff6b3d", title: "#f6dcd2" },
  moons: { bg: "#2c2f72", ink: "#f4ecd6", title: "#f4ecd6" },
  dots: { bg: "#b5532e", ink: "#f2d3b8", title: "#f8e7d3" },
  sign: { bg: "#4b2a6b", ink: "#ff74d4", title: "#f6e7fb" },
  ferry: { bg: "#1c2a4a", ink: "#e9dcbc", title: "#1c2a4a" },
  burst: { bg: "#7fd6b2", ink: "#123a32", title: "#123a32" },
  rings: { bg: "#c8e3e4", ink: "#2c5d63", title: "#173f44" },
  window: { bg: "#ef6aa6", ink: "#ffffff", title: "#3a1028" },
};

const HINTS: [RegExp, Motif][] = [
  [/motel|sign|neon/i, "sign"],
  [/salt|sun|static/i, "sun"],
  [/tide|pool|ripple|wave/i, "rings"],
  [/moon|night|star|planetarium/i, "moons"],
  [/paper|orchard|choir|seed/i, "dots"],
  [/ferry|boat|sea|harbor/i, "ferry"],
  [/kiln|fire|arch|clay/i, "arch"],
  [/bloom|flower|burst/i, "burst"],
  [/laundr|window|wash/i, "window"],
];
const ORDER: Motif[] = ["sun", "arch", "moons", "dots", "sign", "ferry", "burst", "rings", "window"];

function motifFor(slug: string, title: string): Motif {
  return HINTS.find(([re]) => re.test(title))?.[1] ?? ORDER[hash(slug) % ORDER.length];
}

/** Background and title colors of a film's generated poster, for hero panels. */
/** Palette and motif of a film's generated poster, for share images. */
export function posterArt(slug: string, title: string) {
  const motif = motifFor(slug, title);
  return { motif, ...PALETTES[motif] };
}

export function posterColors(slug: string, title: string): { bg: string; title: string } {
  const p = PALETTES[motifFor(slug, title)];
  return { bg: p.bg === "#1c2a4a" ? "#2a3a5c" : p.bg, title: p.title };
}

export function PosterShape({ m, ink }: { m: Motif; ink: string }) {
  switch (m) {
    case "sun":
      return (
        <g>
          <circle cx="100" cy="185" r="48" fill={ink} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x="0" y={205 + i * 8} width="200" height="2.5" fill="#cfe3dc" opacity={0.75 - i * 0.07} />
          ))}
        </g>
      );
    case "arch":
      return <path d="M60 255 V170 a40 40 0 0 1 80 0 V255 h-20 V170 a20 20 0 0 0 -40 0 V255 Z" fill={ink} />;
    case "moons":
      return (
        <g fill={ink}>
          {[
            [70, 120, 22],
            [128, 175, 30],
            [80, 225, 14],
          ].map(([x, y, r], i) => (
            <path key={i} d={`M${x} ${y - r} a${r} ${r} 0 1 0 ${r * 0.9} ${r * 1.7} a${r * 0.8} ${r * 0.8} 0 1 1 ${-r * 0.9} ${-r * 1.7}Z`} />
          ))}
        </g>
      );
    case "dots":
      return (
        <g fill={ink}>
          {Array.from({ length: 4 }).flatMap((_, row) =>
            Array.from({ length: row % 2 ? 5 : 6 }).map((__, col) => (
              <circle key={`${row}-${col}`} cx={(row % 2 ? 42 : 27) + col * 29} cy={120 + row * 28} r="9" opacity={row > 1 ? 0.75 : 1} />
            )),
          )}
        </g>
      );
    case "sign":
      return (
        <g fill="none" stroke={ink} strokeWidth="6">
          <rect x="50" y="125" width="100" height="62" rx="6" />
          <line x1="100" y1="187" x2="100" y2="250" />
          <circle cx="100" cy="156" r="11" fill={ink} stroke="none" />
        </g>
      );
    case "ferry":
      return (
        <g>
          <rect x="0" y="150" width="200" height="150" fill="#1c2a4a" />
          <path d="M70 150 l14 -18 h32 l14 18 Z" fill="#1c2a4a" />
          <rect x="97" y="118" width="4" height="16" fill="#1c2a4a" />
        </g>
      );
    case "burst":
      return (
        <g stroke={ink} strokeWidth="3">
          {Array.from({ length: 18 }).map((_, i) => {
            const a = (i / 18) * Math.PI * 2;
            return <line key={i} x1={100} y1={175} x2={100 + Math.cos(a) * 58} y2={175 + Math.sin(a) * 58} />;
          })}
          <circle cx="100" cy="175" r="10" fill={ink} />
        </g>
      );
    case "rings":
      return (
        <g fill="none" stroke={ink}>
          {[70, 56, 42, 30, 18, 9].map((r, i) => (
            <circle key={r} cx="100" cy="180" r={r} strokeWidth="3" opacity={0.35 + i * 0.12} />
          ))}
        </g>
      );
    case "window":
      return (
        <g>
          <rect x="55" y="130" width="90" height="100" rx="6" fill={ink} />
          <circle cx="100" cy="180" r="30" fill="#ef6aa6" />
          <circle cx="100" cy="180" r="21" fill="#f8c3dc" />
        </g>
      );
  }
}

/**
 * Film poster: the uploaded image, or a flat geometric poster generated from the slug
 * (same film, same poster) with the title and "A film by …".
 */
export function Poster({
  title,
  url,
  slug,
  by,
  bare = false,
  className = "",
}: {
  title: string;
  url: string | null;
  slug?: string;
  by?: string | null;
  /** Thumbnail: keep the motif, drop the text. */
  bare?: boolean;
  className?: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`${title} poster`} className={`aspect-[2/3] w-full rounded-xl object-cover ${className}`} />;
  }
  const m = motifFor(slug ?? title, title);
  const p = PALETTES[m];
  return (
    <div
      aria-hidden
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl ${className}`}
      style={{ background: m === "ferry" ? "#e9dcbc" : p.bg, containerType: "inline-size" }}
    >
      <svg viewBox="0 0 200 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <PosterShape m={m} ink={p.ink} />
      </svg>
      {bare ? null : (
        <p
          className="absolute left-[8%] right-[8%] top-[7%] line-clamp-3 font-bold leading-[1.02] tracking-tight"
          style={{ color: p.title, fontSize: title.length > 18 ? "10.5cqw" : "13cqw" }}
        >
          {title}
        </p>
      )}
      {by && !bare ? (
        <p
          className="absolute bottom-[4%] left-[8%] right-[8%] truncate font-semibold"
          style={{ color: m === "ferry" ? "#e9dcbc" : p.title, opacity: 0.85, fontSize: "5cqw" }}
        >
          A film by {by}
        </p>
      ) : null}
    </div>
  );
}
