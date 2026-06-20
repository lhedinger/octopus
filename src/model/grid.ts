/** Spacing of the canvas snap grid, in flow units. */
export const GRID_SIZE = 24;

/** Round a single coordinate to the nearest grid line. */
export function snap(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/** Round a point to the nearest grid intersection. */
export function snapPoint(point: { x: number; y: number }): { x: number; y: number } {
  return { x: snap(point.x), y: snap(point.y) };
}
