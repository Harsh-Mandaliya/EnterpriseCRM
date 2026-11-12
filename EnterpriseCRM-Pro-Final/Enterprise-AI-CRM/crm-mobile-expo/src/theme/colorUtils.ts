/* ============================================================
   COLOUR UTILITIES
   Small, dependency-free helpers used to derive full palettes
   from a company's primary/accent colour.
============================================================ */

const HEX = /^#([0-9a-f]{6})$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value.trim());
}

function toRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  return (
    '#' +
    [r, g, b]
      .map(channel =>
        Math.max(0, Math.min(255, Math.round(channel)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}

/** Mixes `a` towards `b`; amount 0 = a, 1 = b. */
export function mix(a: string, b: string, amount: number): string {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return toHex([
    ca[0] + (cb[0] - ca[0]) * amount,
    ca[1] + (cb[1] - ca[1]) * amount,
    ca[2] + (cb[2] - ca[2]) * amount,
  ]);
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map(channel => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** Picks white or near-black text, whichever reads better. */
export function readableOn(background: string): string {
  return contrastRatio(background, '#FFFFFF') >= contrastRatio(background, '#0F172A')
    ? '#FFFFFF'
    : '#0F172A';
}

/**
 * Darkens/lightens a brand colour until it reaches the target
 * contrast against `background`, so a pale custom primary is
 * still readable as text/buttons.
 */
export function ensureContrast(
  color: string,
  background: string,
  target = 3,
): string {
  const towards = luminance(background) > 0.5 ? '#000000' : '#FFFFFF';
  let current = color;
  for (let step = 0; step < 10 && contrastRatio(current, background) < target; step += 1) {
    current = mix(current, towards, 0.12);
  }
  return current;
}
