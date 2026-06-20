import { beforeEach, describe, expect, it } from 'vitest';
import { useArchStore } from '../store/useArchStore';

const store = () => useArchStore.getState();

describe('useArchStore', () => {
  beforeEach(() => {
    store().newDocument();
    store().setTapConnect(false);
  });

  it('adds nodes from the palette', () => {
    store().addNode('service', { x: 10, y: 20 });
    expect(store().nodes).toHaveLength(1);
    expect(store().nodes[0].data.kind).toBe('service');
    expect(store().selectedNodeId).toBe(store().nodes[0].id);
  });

  it('updates node data', () => {
    store().addNode('microservice', { x: 0, y: 0 });
    const id = store().nodes[0].id;
    store().updateNodeData(id, { label: 'Payments', description: 'charges cards' });
    expect(store().nodes[0].data.label).toBe('Payments');
    expect(store().nodes[0].data.description).toBe('charges cards');
  });

  it('connects two nodes via tap-connect mode', () => {
    store().addNode('apiGateway', { x: 0, y: 0 });
    store().addNode('service', { x: 100, y: 100 });
    const [a, b] = store().nodes;

    store().setTapConnect(true);
    store().tapNode(a.id);
    expect(store().connectSource).toBe(a.id);
    store().tapNode(b.id);

    expect(store().edges).toHaveLength(1);
    expect(store().edges[0]).toMatchObject({ source: a.id, target: b.id });
    expect(store().connectSource).toBeUndefined();
  });

  it('connects via the React Flow onConnect handler', () => {
    store().addNode('service', { x: 0, y: 0 });
    store().addNode('database', { x: 50, y: 50 });
    const [a, b] = store().nodes;
    store().onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null });
    expect(store().edges).toHaveLength(1);
  });

  it('deletes a selected node and its connected edges', () => {
    store().addNode('service', { x: 0, y: 0 });
    store().addNode('database', { x: 50, y: 50 });
    const [a, b] = store().nodes;
    store().onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null });

    store().select(a.id);
    store().deleteSelected();

    expect(store().nodes).toHaveLength(1);
    expect(store().nodes[0].id).toBe(b.id);
    expect(store().edges).toHaveLength(0);
  });

  it('round-trips its state to an ArchDocument, snapping placement to the grid', () => {
    store().addNode('service', { x: 50, y: 70 });
    const doc = store().toDocument();
    expect(doc.version).toBe(1);
    expect(doc.nodes).toHaveLength(1);
    // 50 -> 48, 70 -> 72 on the 24px grid.
    expect(doc.nodes[0].position).toEqual({ x: 48, y: 72 });
  });
});
