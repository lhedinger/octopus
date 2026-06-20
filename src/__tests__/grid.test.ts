import { describe, expect, it } from 'vitest';
import { GRID_SIZE, snap, snapPoint } from '../model/grid';

describe('grid snapping', () => {
  it('rounds to the nearest grid line', () => {
    expect(snap(0)).toBe(0);
    expect(snap(GRID_SIZE / 2 - 1)).toBe(0);
    expect(snap(GRID_SIZE / 2 + 1)).toBe(GRID_SIZE);
    expect(snap(GRID_SIZE * 3 + 2)).toBe(GRID_SIZE * 3);
  });

  it('always lands on a grid multiple', () => {
    for (const v of [7, 13, 100, 251, -5, -40]) {
      expect(Number.isInteger(snap(v) / GRID_SIZE)).toBe(true);
    }
  });

  it('snaps both axes of a point', () => {
    expect(snapPoint({ x: 13, y: 40 })).toEqual({ x: GRID_SIZE, y: GRID_SIZE * 2 });
  });
});
