import { describe, expect, it } from 'vitest';
import { TILE_SIZE, snap, snapPoint } from '../model/grid';

describe('tile snapping', () => {
  it('rounds to the nearest tile line', () => {
    expect(snap(0)).toBe(0);
    expect(snap(TILE_SIZE / 2 - 1)).toBe(0);
    expect(snap(TILE_SIZE / 2 + 1)).toBe(TILE_SIZE);
    expect(snap(TILE_SIZE * 3 + 2)).toBe(TILE_SIZE * 3);
  });

  it('always lands on a tile multiple', () => {
    for (const v of [7, 70, 130, 651, -5, -200]) {
      expect(Number.isInteger(snap(v) / TILE_SIZE)).toBe(true);
    }
  });

  it('snaps both axes of a point into one tile cell', () => {
    expect(snapPoint({ x: 70, y: 130 })).toEqual({ x: TILE_SIZE, y: TILE_SIZE });
  });
});
