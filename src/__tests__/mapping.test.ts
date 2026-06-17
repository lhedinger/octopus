import { describe, expect, it } from 'vitest';
import { fromReactFlow, toReactFlow } from '../model/mapping';
import type { ArchDocument } from '../model/types';

const doc: ArchDocument = {
  version: 1,
  id: 'doc-1',
  name: 'Shop',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nodes: [
    { id: 'n1', kind: 'apiGateway', label: 'Gateway', position: { x: 0, y: 0 } },
    { id: 'n2', kind: 'microservice', label: 'Payments', description: 'charges cards', position: { x: 100, y: 80 } },
    { id: 'n3', kind: 'database', label: 'Orders DB', position: { x: 200, y: 160 } },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', kind: 'sync', label: 'routes' },
    { id: 'e2', source: 'n2', target: 'n3', kind: 'async' },
  ],
};

describe('mapping', () => {
  it('round-trips an ArchDocument through React Flow without losing data', () => {
    const flow = toReactFlow(doc);
    const back = fromReactFlow({ id: doc.id, name: doc.name, version: doc.version }, flow.nodes, flow.edges);

    expect(back.nodes).toEqual(doc.nodes);
    expect(back.edges).toEqual(doc.edges);
    expect(back.id).toBe(doc.id);
    expect(back.name).toBe(doc.name);
  });

  it('marks async edges as animated in the flow representation', () => {
    const flow = toReactFlow(doc);
    const async = flow.edges.find((e) => e.id === 'e2');
    const sync = flow.edges.find((e) => e.id === 'e1');
    expect(async?.animated).toBe(true);
    expect(sync?.animated).toBe(false);
  });

  it('uses our custom node type', () => {
    const flow = toReactFlow(doc);
    expect(flow.nodes.every((n) => n.type === 'component')).toBe(true);
  });
});
