import type { FlowNode } from './mapping';
import { TILE_SIZE } from './grid';
import { categoryHue } from './aspects';

/** Zone groupings: bounded contexts or owning teams (Conway view). */
export type ZoneMode = 'none' | 'context' | 'team';

export interface Zone {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hue: number;
}

const PAD = 32;

/**
 * Translucent hulls behind the tiles: one bounding box per group value of
 * meta[mode] ('context' or 'team'), covering members and their attachments.
 * Pure and position-reactive, so zones follow drags live.
 */
export function computeZones(nodes: FlowNode[], mode: ZoneMode): Zone[] {
  if (mode === 'none') return [];
  const groups = new Map<string, FlowNode[]>();
  for (const n of nodes) {
    if (n.parentId) continue;
    const key = n.data.meta?.[mode];
    if (typeof key !== 'string' || !key) continue;
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const zones: Zone[] = [];
  for (const [name, members] of groups) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const extend = (x: number, y: number, size: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + size);
      maxY = Math.max(maxY, y + size);
    };
    for (const m of members) extend(m.position.x, m.position.y, TILE_SIZE);
    // Attached storage renders relative to its host — include it in the hull.
    for (const n of nodes) {
      if (!n.parentId) continue;
      const host = byId.get(n.parentId);
      if (!host || !members.includes(host)) continue;
      extend(host.position.x + n.position.x, host.position.y + n.position.y, TILE_SIZE / 2);
    }
    zones.push({
      name,
      x: minX - PAD,
      y: minY - PAD,
      width: maxX - minX + 2 * PAD,
      height: maxY - minY + 2 * PAD,
      hue: categoryHue(name),
    });
  }
  return zones.sort((a, b) => a.name.localeCompare(b.name));
}
