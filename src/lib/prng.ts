/** Deterministic hashing + PRNG utilities used by the simulation engine. */

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 – small, fast, deterministic PRNG. */
export function createRng(seed: number | string): () => number {
  let a = typeof seed === "string" ? hashString(seed) : seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash-based uniform in [0,1) for integer lattice coordinates. */
export function latticeNoise(seed: number, i: number): number {
  let h = (seed ^ Math.imul(i, 0x27d4eb2d)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const smooth = (x: number) => x * x * (3 - 2 * x);

/** 1-D smooth value noise in [-1, 1] with given period. */
export function valueNoise(seed: number, x: number, period: number): number {
  const p = x / period;
  const i0 = Math.floor(p);
  const f = p - i0;
  const a = latticeNoise(seed, i0) * 2 - 1;
  const b = latticeNoise(seed, i0 + 1) * 2 - 1;
  return a + (b - a) * smooth(f);
}

/** Multi-octave value noise. Returns roughly [-1, 1]. */
export function fbm(seed: number, x: number, periods: number[], weights: number[]): number {
  let total = 0;
  let wsum = 0;
  for (let k = 0; k < periods.length; k++) {
    total += valueNoise(seed + k * 7919, x, periods[k]) * weights[k];
    wsum += weights[k];
  }
  return total / wsum;
}

export function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
