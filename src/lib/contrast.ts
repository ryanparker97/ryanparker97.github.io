/** WCAG 2.x contrast helpers (6-digit hex only). */

const channels = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Returns `fg` if it meets `min` on `bg`, else the nearest 1% mix toward black/white that does. */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const target = relativeLuminance(bg) > 0.5 ? 0 : 255;
  const from = channels(fg);
  for (let p = 1; p <= 100; p++) {
    const hex =
      '#' +
      from
        .map((c) =>
          Math.round(c + (target - c) * (p / 100))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
        .toUpperCase();
    if (contrastRatio(hex, bg) >= min) return hex;
  }
  return target === 0 ? '#000000' : '#FFFFFF';
}

/** 6-digit lowercase hex of `fg` at `alpha` composited over `bg` (both 6-digit hex). */
export function composite(fg: string, alpha: number, bg: string): string {
  const f = channels(fg);
  const b = channels(bg);
  return (
    '#' +
    f
      .map((c, i) =>
        Math.round(c * alpha + b[i] * (1 - alpha))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
