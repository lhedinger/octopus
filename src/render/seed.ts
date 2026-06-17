/**
 * Deterministic seeding utilities. The same input string always produces the
 * same sequence of pseudo-random values, so a component's procedural art is
 * stable across reloads and machines.
 */

/** FNV-1a style 32-bit hash of a string. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG: fast, seedable, returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Pick an element from a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** True with probability p. */
  chance(p: number): boolean;
}

export function rngFrom(input: string): Rng {
  const random = mulberry32(hashSeed(input));
  const api: Rng = {
    next: random,
    range: (min, max) => min + random() * (max - min),
    int: (min, max) => Math.floor(min + random() * (max - min + 1)),
    pick: (items) => items[Math.floor(random() * items.length)],
    chance: (p) => random() < p,
  };
  return api;
}
