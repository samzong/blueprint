export type RGB = [number, number, number];
export type PaletteKind = "categorical" | "sequential" | "diverging" | "status" | "mark" | "text";
export type PaletteMode = "light" | "dark";

export const paletteSurfaces = { light: "#ffffff", dark: "#111827" };
export const cvdMatrices: Record<string, RGB[]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
export const palettePolicy = { version: 1, distance: 0.08, lightnessStep: 0.04, markContrast: 3, textContrast: 4.5 };

export function parseHex(value: string): RGB {
  if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) throw new Error(`expected opaque sRGB hex (#RGB or #RRGGBB): ${value}`);
  const hex = value.length === 4 ? value.slice(1).split("").map((digit) => digit + digit).join("") : value.slice(1);
  return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255) as RGB;
}

export function linearize(rgb: RGB): RGB {
  return rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) as RGB;
}

export function oklab([r, g, b]: RGB): RGB {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

export function simulate(rgb: RGB, matrix: RGB[]): RGB {
  return matrix.map((row) => Math.min(1, Math.max(0, row.reduce((sum, value, index) => sum + value * rgb[index], 0)))) as RGB;
}

export function contrast(left: RGB, right: RGB): number {
  const luminance = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const a = luminance(left), b = luminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function checkPalette(colors: string[], mode: PaletteMode, kind: PaletteKind = "categorical", surface = paletteSurfaces[mode]) {
  if (mode !== "light" && mode !== "dark") throw new Error("--mode must be light or dark");
  if (!["categorical", "sequential", "diverging", "status", "mark", "text"].includes(kind)) throw new Error("unknown palette kind");
  const minimum = (kind === "text" || kind === "mark") ? 1 : kind === "diverging" ? 3 : 2;
  if (colors.length < minimum || colors.length > 32) throw new Error(`expected ${minimum} to 32 colors for ${kind}`);
  if (kind === "diverging" && colors.length % 2 === 0) throw new Error("diverging requires an odd number of stops, with the neutral at the center");
  const background = linearize(parseHex(surface));
  const linear = colors.map((color) => linearize(parseHex(color)));
  const failures: string[] = [];
  const samples = linear.map((rgb, index) => {
    const [L, a, b] = oklab(rgb);
    const ratio = contrast(rgb, background);
    const required = kind === "text" ? palettePolicy.textContrast : palettePolicy.markContrast;
    if (ratio < required) failures.push(`color ${index + 1} ${colors[index]} contrast ${ratio.toFixed(3)} < ${required}:1 against ${surface}; change color/surface or use a separately checked boundary`);
    return { color: colors[index], L, C: Math.hypot(a, b), h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360, contrast: ratio };
  });
  const pairs: { left: number; right: number; vision: string; distance: number }[] = [];
  const views = { normal: linear, ...Object.fromEntries(Object.entries(cvdMatrices).map(([vision, matrix]) => [vision, linear.map((rgb) => simulate(rgb, matrix))])) };
  if (kind !== "text" && kind !== "mark") {
    for (const [vision, values] of Object.entries(views)) {
      const labs = values.map(oklab);
      for (let left = 0; left < labs.length; left++) {
        for (let right = left + 1; right < labs.length; right++) {
          if (kind === "sequential" && right !== left + 1) continue;
          const distance = Math.hypot(...labs[left].map((value, index) => value - labs[right][index]));
          pairs.push({ left: left + 1, right: right + 1, vision, distance });
          if (distance < palettePolicy.distance) failures.push(`${vision} pair ${left + 1}/${right + 1} distance ${distance.toFixed(4)} < ${palettePolicy.distance}; change colors or add non-color encoding (still FAIL)`);
        }
      }
      if (kind === "sequential" || kind === "diverging") {
        const arms = kind === "sequential" ? [labs] : [labs.slice(0, (labs.length + 1) / 2).reverse(), labs.slice((labs.length - 1) / 2)];
        const directions: number[] = [];
        for (const arm of arms) {
          const steps = arm.slice(1).map((lab, index) => lab[0] - arm[index][0]);
          directions.push(Math.sign(steps[0]));
          if (steps.some((step) => Math.abs(step) < palettePolicy.lightnessStep || Math.sign(step) !== Math.sign(steps[0]))) failures.push(`${vision} ${kind} lightness must be monotonic with steps >= ${palettePolicy.lightnessStep}`);
        }
        if (kind === "diverging" && directions[0] !== directions[1]) failures.push(`${vision} diverging arms must move in the same lightness direction away from neutral`);
      }
    }
  }
  return { pass: failures.length === 0, mode, kind, surface, policy: palettePolicy,
    model: "Machado, Oliveira & Fernandes 2009, severity 1.0; linear sRGB, channel clipping; Euclidean OKLab",
    scope: "Heuristic numeric palette screening only; not WCAG conformance or guaranteed perceptual distinguishability. Tritan simulation approximates tritanomaly, not tritanopia. Non-color encoding and rendered verification remain required.",
    samples, pairs, failures };
}
