/**
 * Isometric SVG primitives. Everything is drawn in an abstract ground space
 * (x to the right, y into the screen, z up) and projected to 2D. Faces are
 * returned as polygon point strings so the renderer can drop them straight
 * into <polygon> elements.
 */

export interface Face {
  points: string;
  fill: string;
}

const SCALE = 7; // ground units -> px
const ORIGIN_X = 50;
const ORIGIN_Y = 58;

function sx(x: number, y: number): number {
  return ORIGIN_X + (x - y) * SCALE;
}
function sy(x: number, y: number, z: number): number {
  return ORIGIN_Y + (x + y) * SCALE * 0.5 - z * SCALE;
}
function pt(x: number, y: number, z: number): string {
  return `${sx(x, y).toFixed(2)},${sy(x, y, z).toFixed(2)}`;
}

/** HSL color with adjustable lightness, used to fake directional lighting. */
export function hsl(hue: number, sat: number, light: number): string {
  return `hsl(${Math.round(hue)} ${Math.round(sat)}% ${Math.round(light)}%)`;
}

export interface CuboidOptions {
  cx: number;
  cy: number;
  /** Footprint half-extent in x. */
  hx: number;
  /** Footprint half-extent in y. */
  hy: number;
  /** Base height (z offset of the bottom). */
  z0?: number;
  /** Height of the box. */
  h: number;
  hue: number;
  sat: number;
  /** Lightness of the top face; sides are derived darker. */
  light: number;
}

/** A box with its three visible faces, ordered back-to-front for painting. */
export function cuboid(o: CuboidOptions): Face[] {
  const { cx, cy, hx, hy, h, hue, sat, light } = o;
  const z0 = o.z0 ?? 0;
  const z1 = z0 + h;
  const ax = cx - hx;
  const bx = cx + hx;
  const ay = cy - hy;
  const by = cy + hy;

  const top: Face = {
    points: [pt(ax, ay, z1), pt(bx, ay, z1), pt(bx, by, z1), pt(ax, by, z1)].join(' '),
    fill: hsl(hue, sat, light),
  };
  const right: Face = {
    points: [pt(bx, ay, z0), pt(bx, by, z0), pt(bx, by, z1), pt(bx, ay, z1)].join(' '),
    fill: hsl(hue, sat, light - 14),
  };
  const left: Face = {
    points: [pt(ax, by, z0), pt(bx, by, z0), pt(bx, by, z1), pt(ax, by, z1)].join(' '),
    fill: hsl(hue, sat, light - 26),
  };
  return [right, left, top];
}

/** A flat ground tile (diamond) used as a platform under a component. */
export function platform(hue: number, sat: number, light: number, extent = 5.6): Face {
  const e = extent;
  return {
    points: [pt(-e, -e, 0), pt(e, -e, 0), pt(e, e, 0), pt(-e, e, 0)].join(' '),
    fill: hsl(hue, sat, light),
  };
}

/**
 * An upright cylinder approximated as a top ellipse plus a body rectangle,
 * used for database disks. Returns SVG element descriptors.
 */
export interface Disk {
  top: { cx: number; cy: number; rx: number; ry: number; fill: string };
  body: { points: string; fill: string };
}

export function disk(
  cx: number,
  cy: number,
  radius: number,
  z0: number,
  h: number,
  hue: number,
  sat: number,
  light: number,
): Disk {
  const rx = radius * SCALE;
  const ry = radius * SCALE * 0.5;
  const topX = sx(cx, cy);
  const topY = sy(cx, cy, z0 + h);
  const bottomY = sy(cx, cy, z0);
  return {
    top: { cx: topX, cy: topY, rx, ry, fill: hsl(hue, sat, light) },
    body: {
      points: [
        `${topX - rx},${topY}`,
        `${topX - rx},${bottomY}`,
        `${topX + rx},${bottomY}`,
        `${topX + rx},${topY}`,
      ].join(' '),
      fill: hsl(hue, sat, light - 18),
    },
  };
}

export const ISO = { SCALE, ORIGIN_X, ORIGIN_Y, sx, sy, pt };
