/** Bricolage Grotesque (the brand font) as TTF for next/og share images; null if unreachable. */
const cache = new Map<number, Promise<ArrayBuffer | null>>();

export function brandFont(weight: 400 | 800): Promise<ArrayBuffer | null> {
  if (!cache.has(weight)) {
    cache.set(
      weight,
      (async () => {
        try {
          const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@${weight}`)).text();
          const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
          return url ? await (await fetch(url)).arrayBuffer() : null;
        } catch {
          return null;
        }
      })(),
    );
  }
  return cache.get(weight)!;
}

/** Fonts for ImageResponse; falls back to the default font when Google Fonts is unreachable. */
export async function brandFonts() {
  const [regular, bold] = await Promise.all([brandFont(400), brandFont(800)]);
  return [
    ...(regular ? [{ name: "Bricolage", data: regular, weight: 400 as const, style: "normal" as const }] : []),
    ...(bold ? [{ name: "Bricolage", data: bold, weight: 800 as const, style: "normal" as const }] : []),
  ];
}
