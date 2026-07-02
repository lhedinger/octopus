import type { ComponentKind } from '../model/types';
import { paletteEntry } from '../model/palette';
import { rngFrom, type Rng } from './seed';
import { cuboid, disk, platform, hsl, ISO } from './isometric';

/** A serializable drawing primitive. Kept data-only so scenes are testable. */
export type Shape =
  | { t: 'poly'; points: string; fill: string; stroke?: string; sw?: number }
  | { t: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill: string }
  | { t: 'circle'; cx: number; cy: number; r: number; fill: string }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; sw: number }
  | { t: 'text'; x: number; y: number; value: string; fill: string; size: number };

export interface Scene {
  shapes: Shape[];
}

export interface ArtInput {
  kind: ComponentKind;
  name: string;
  description?: string;
}

interface Palette {
  hue: number;
  sat: number;
  light: number;
}

function derivePalette(kind: ComponentKind, rng: Rng): Palette {
  const base = paletteEntry(kind).hue;
  // Microservices roam widely across the spectrum so each one is distinct;
  // fixed kinds stay close to their anchor hue so they remain recognizable.
  const spread = kind === 'microservice' ? 60 : 12;
  return {
    hue: (base + rng.range(-spread, spread) + 360) % 360,
    sat: rng.range(58, 78),
    light: rng.range(54, 66),
  };
}

function addCuboid(shapes: Shape[], faces: ReturnType<typeof cuboid>): void {
  for (const f of faces) shapes.push({ t: 'poly', points: f.points, fill: f.fill });
}

function tower(shapes: Shape[], p: Palette, rng: Rng, floors: number, half: number): number {
  let z = 0;
  const floorH = rng.range(2.4, 3.4);
  for (let i = 0; i < floors; i++) {
    const light = p.light + (i % 2 === 0 ? 0 : -5);
    addCuboid(shapes, cuboid({ cx: 0, cy: 0, hx: half, hy: half, z0: z, h: floorH, hue: p.hue, sat: p.sat, light }));
    z += floorH;
  }
  return z;
}

/** Roof ornament that varies by seed — the most visible per-instance variation. */
function roofProp(shapes: Shape[], p: Palette, rng: Rng, z: number): void {
  const kindOfProp = rng.int(0, 3);
  const accentHue = (p.hue + rng.range(120, 240)) % 360;
  if (kindOfProp === 0) {
    // antenna
    const top = ISO.sy(0, 0, z + rng.range(3, 6));
    const baseY = ISO.sy(0, 0, z);
    const x = ISO.sx(0, 0);
    shapes.push({ t: 'line', x1: x, y1: baseY, x2: x, y2: top, stroke: hsl(accentHue, 70, 60), sw: 1.4 });
    shapes.push({ t: 'circle', cx: x, cy: top, r: 2, fill: hsl(accentHue, 80, 65) });
  } else if (kindOfProp === 1) {
    // rooftop box
    addCuboid(shapes, cuboid({ cx: 0, cy: 0, hx: 1.6, hy: 1.6, z0: z, h: rng.range(1.2, 2.2), hue: accentHue, sat: 65, light: 60 }));
  } else if (kindOfProp === 2) {
    // dish
    const x = ISO.sx(0, 0);
    const y = ISO.sy(0, 0, z + 1);
    shapes.push({ t: 'ellipse', cx: x, cy: y, rx: 4, ry: 2, fill: hsl(accentHue, 60, 70) });
  } else {
    // glowing beacon
    const x = ISO.sx(0, 0);
    const y = ISO.sy(0, 0, z + 1.5);
    shapes.push({ t: 'circle', cx: x, cy: y, r: 3, fill: hsl(accentHue, 85, 68) });
  }
}

/** Distinct top glyph for each behavior block, drawn in screen space at (cx, cy). */
function behaviorGlyph(shapes: Shape[], kind: ComponentKind, cx: number, cy: number, color: string): void {
  switch (kind) {
    case 'trigger': // play arrow — "start"
      shapes.push({ t: 'poly', points: `${cx - 4},${cy - 7} ${cx + 8},${cy} ${cx - 4},${cy + 7}`, fill: color });
      break;
    case 'step': // solid block — a unit of work
      shapes.push({ t: 'poly', points: `${cx - 6},${cy - 5} ${cx + 6},${cy - 5} ${cx + 6},${cy + 5} ${cx - 6},${cy + 5}`, fill: color });
      break;
    case 'decision': // diamond — a branch on a condition
      shapes.push({ t: 'poly', points: `${cx},${cy - 8} ${cx + 8},${cy} ${cx},${cy + 8} ${cx - 8},${cy}`, fill: color });
      break;
    case 'rule': // shield — a guard / policy
      shapes.push({ t: 'poly', points: `${cx - 6},${cy - 6} ${cx + 6},${cy - 6} ${cx + 6},${cy + 1} ${cx},${cy + 8} ${cx - 6},${cy + 1}`, fill: color });
      break;
    case 'event': { // burst — an emitted signal
      shapes.push({ t: 'circle', cx, cy, r: 3, fill: color });
      const rays = [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1.4], [0, 1.4], [-1.4, 0], [1.4, 0]];
      for (const [dx, dy] of rays) {
        shapes.push({ t: 'line', x1: cx + dx * 3.2, y1: cy + dy * 3.2, x2: cx + dx * 7, y2: cy + dy * 7, stroke: color, sw: 1.4 });
      }
      break;
    }
    case 'outcome': // flag — a terminal result
      shapes.push({ t: 'line', x1: cx - 5, y1: cy - 8, x2: cx - 5, y2: cy + 8, stroke: color, sw: 1.6 });
      shapes.push({ t: 'poly', points: `${cx - 5},${cy - 8} ${cx + 7},${cy - 5} ${cx - 5},${cy - 1}`, fill: color });
      break;
    default:
      break;
  }
}

function buildBody(shapes: Shape[], input: ArtInput, p: Palette, rng: Rng): void {
  shapes.push({ t: 'poly', points: platform(p.hue, p.sat - 25, p.light - 32).points, fill: hsl(p.hue, p.sat - 25, p.light - 32) });

  switch (input.kind) {
    case 'database':
    case 'datastore': {
      const disks = rng.int(3, 5);
      const r = 3.4;
      const dh = 1.6;
      for (let i = 0; i < disks; i++) {
        const d = disk(0, 0, r, i * dh, dh, p.hue, p.sat, p.light - (disks - 1 - i) * 2);
        shapes.push({ t: 'poly', points: d.body.points, fill: d.body.fill });
        shapes.push({ t: 'ellipse', cx: d.top.cx, cy: d.top.cy, rx: d.top.rx, ry: d.top.ry, fill: d.top.fill });
      }
      break;
    }
    case 'queue': {
      const crates = rng.int(3, 4);
      const start = -(crates - 1) * 1.6;
      for (let i = 0; i < crates; i++) {
        const off = start + i * 3.2;
        addCuboid(shapes, cuboid({ cx: off, cy: off, hx: 1.3, hy: 1.3, h: rng.range(2, 3), hue: p.hue, sat: p.sat, light: p.light - i }));
      }
      break;
    }
    case 'cache': {
      addCuboid(shapes, cuboid({ cx: 0, cy: 0, hx: 3.4, hy: 3.4, h: rng.range(3, 4.5), hue: p.hue, sat: p.sat + 10, light: p.light + 6 }));
      const x = ISO.sx(0, 0);
      const y = ISO.sy(0, 0, 6);
      shapes.push({ t: 'circle', cx: x, cy: y, r: 4, fill: hsl(p.hue, 90, 75) });
      break;
    }
    case 'apiGateway': {
      addCuboid(shapes, cuboid({ cx: -2.6, cy: 0, hx: 1, hy: 3.4, h: 5, hue: p.hue, sat: p.sat, light: p.light }));
      addCuboid(shapes, cuboid({ cx: 2.6, cy: 0, hx: 1, hy: 3.4, h: 5, hue: p.hue, sat: p.sat, light: p.light }));
      addCuboid(shapes, cuboid({ cx: 0, cy: 0, hx: 3.6, hy: 3.4, z0: 5, h: 1.4, hue: p.hue, sat: p.sat, light: p.light + 6 }));
      break;
    }
    case 'client': {
      addCuboid(shapes, cuboid({ cx: 0, cy: 0, hx: 3.6, hy: 0.6, h: 4.4, hue: p.hue, sat: p.sat, light: p.light }));
      const sx = ISO.sx(-3, 0.6);
      const sy = ISO.sy(-3, 0.6, 4);
      shapes.push({ t: 'poly', points: `${sx},${sy} ${sx + 30},${sy - 9} ${sx + 30},${sy + 13} ${sx},${sy + 22}`, fill: hsl(p.hue, 30, 88) });
      break;
    }
    case 'externalSystem': {
      addCuboid(shapes, cuboid({ cx: 0, cy: 0, hx: 3.4, hy: 3.4, h: rng.range(3.5, 5), hue: p.hue, sat: p.sat - 20, light: p.light }));
      const x = ISO.sx(0, 0);
      const y = ISO.sy(0, 0, 9);
      shapes.push({ t: 'text', x, y, value: '?', fill: hsl(p.hue, 60, 30), size: 9 });
      break;
    }
    case 'test':
    case 'build':
    case 'deploy':
    case 'behavior': {
      // Facets read as a flat labelled pad, distinct from the taller components.
      addCuboid(shapes, cuboid({ cx: 0, cy: 0, hx: 4, hy: 4, h: 1.2, hue: p.hue, sat: p.sat, light: p.light }));
      const x = ISO.sx(0, 0);
      const y = ISO.sy(0, 0, 1.2);
      shapes.push({ t: 'circle', cx: x, cy: y, r: 3.2, fill: hsl((p.hue + 40) % 360, 75, 66) });
      break;
    }
    case 'trigger':
    case 'step':
    case 'decision':
    case 'rule':
    case 'event':
    case 'outcome': {
      // Behavior blocks are flat labelled tiles carrying a distinct glyph — a
      // separate visual family from the isometric infrastructure buildings.
      const h = 1.3;
      addCuboid(shapes, cuboid({ cx: 0, cy: 0, hx: 4, hy: 4, h, hue: p.hue, sat: p.sat, light: p.light }));
      behaviorGlyph(shapes, input.kind, ISO.sx(0, 0), ISO.sy(0, 0, h), hsl((p.hue + 30) % 360, 85, 70));
      break;
    }
    case 'service':
    case 'microservice':
    default: {
      const floors = input.kind === 'microservice' ? rng.int(1, 2) : rng.int(2, 4);
      const half = input.kind === 'microservice' ? 3 : 3.6;
      const top = tower(shapes, p, rng, floors, half);
      roofProp(shapes, p, rng, top);
      break;
    }
  }

  // Identity badge: first character of the name, on a seeded emblem.
  const initial = (input.name.trim()[0] ?? '?').toUpperCase();
  const bx = ISO.sx(0, 0);
  const by = ISO.sy(-6.2, -6.2, 4);
  const emblemHue = (p.hue + 180) % 360;
  shapes.push({ t: 'circle', cx: bx, cy: by, r: 7, fill: hsl(emblemHue, 70, 55) });
  shapes.push({ t: 'text', x: bx, y: by, value: initial, fill: '#fff', size: 8 });
}

/** Pure builder: deterministic scene from a component's identity. */
export function buildScene(input: ArtInput): Scene {
  const seed = `${input.kind}::${input.name}::${input.description ?? ''}`;
  const rng = rngFrom(seed);
  const palette = derivePalette(input.kind, rng);
  const shapes: Shape[] = [];
  buildBody(shapes, input, palette, rng);
  return { shapes };
}
