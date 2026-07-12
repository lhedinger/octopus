import { describe, expect, it } from 'vitest';
import { computeZones } from '../model/zones';
import type { FlowNode } from '../model/mapping';

const node = (id: string, x: number, y: number, meta?: Record<string, unknown>, parentId?: string): FlowNode => ({
  id,
  type: 'component',
  position: { x, y },
  parentId,
  data: { kind: 'microservice', label: id, meta },
});

describe('zones', () => {
  it('groups top-level nodes by the requested meta key with padding', () => {
    const nodes = [
      node('a', 0, 0, { context: 'billing' }),
      node('b', 240, 0, { context: 'billing' }),
      node('c', 600, 0, { context: 'shop' }),
      node('d', 0, 240), // no context — belongs to no zone
    ];
    const zones = computeZones(nodes, 'context');
    expect(zones.map((z) => z.name)).toEqual(['billing', 'shop']);
    const billing = zones[0];
    // Covers a..b tiles (0..360) plus padding.
    expect(billing.x).toBeLessThan(0);
    expect(billing.x + billing.width).toBeGreaterThan(360);
  });

  it('extends the hull over attached storage and stays inert when off', () => {
    const nodes = [
      node('host', 0, 0, { team: 'payments' }),
      node('db', 0, 128, { }, 'host'), // relative to host, below the tile
    ];
    const [zone] = computeZones(nodes, 'team');
    expect(zone.y + zone.height).toBeGreaterThan(128 + 60);
    expect(computeZones(nodes, 'none')).toEqual([]);
  });

  it('gives distinct stable hues per group name', () => {
    const nodes = [node('a', 0, 0, { team: 'web' }), node('b', 240, 0, { team: 'platform' })];
    const [z1, z2] = computeZones(nodes, 'team');
    expect(z1.hue).not.toBe(z2.hue);
    expect(computeZones(nodes, 'team')[0].hue).toBe(z1.hue);
  });
});
