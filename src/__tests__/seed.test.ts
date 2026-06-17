import { describe, expect, it } from 'vitest';
import { hashSeed, mulberry32, rngFrom } from '../render/seed';

describe('seed', () => {
  it('hashes deterministically', () => {
    expect(hashSeed('payments')).toBe(hashSeed('payments'));
    expect(hashSeed('payments')).not.toBe(hashSeed('billing'));
  });

  it('produces a repeatable PRNG sequence for a given seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('rngFrom is deterministic per input string', () => {
    const r1 = rngFrom('auth-service');
    const r2 = rngFrom('auth-service');
    expect([r1.int(0, 100), r1.range(0, 1), r1.pick([1, 2, 3])]).toEqual([
      r2.int(0, 100),
      r2.range(0, 1),
      r2.pick([1, 2, 3]),
    ]);
  });

  it('stays within requested bounds', () => {
    const r = rngFrom('bounds');
    for (let i = 0; i < 200; i++) {
      const n = r.int(5, 9);
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(9);
    }
  });
});
