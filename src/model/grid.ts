/**
 * One component occupies exactly one tile. TILE_SIZE is the snap step, the
 * node footprint, and the spacing of the prominent grid lines — a single
 * source of truth so placement and the visible grid always agree.
 */
export const TILE_SIZE = 120;

/** Faint decorative sub-grid inside each tile (5 subdivisions). */
export const SUB_GRID = TILE_SIZE / 5;

/** Padding between the tile edge and the component inside it. */
export const TILE_PADDING = 8;

/** Round a single coordinate to the nearest tile line. */
export function snap(value: number): number {
  return Math.round(value / TILE_SIZE) * TILE_SIZE;
}

/** Round a point to the nearest tile cell. */
export function snapPoint(point: { x: number; y: number }): { x: number; y: number } {
  return { x: snap(point.x), y: snap(point.y) };
}
