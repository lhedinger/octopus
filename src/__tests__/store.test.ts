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
    store().addNode('queue', { x: 50, y: 50 });
    const [a, b] = store().nodes;
    store().onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null });
    expect(store().edges).toHaveLength(1);
  });

  it('deletes a selected node and its connected edges', () => {
    store().addNode('service', { x: 0, y: 0 });
    store().addNode('queue', { x: 50, y: 50 });
    const [a, b] = store().nodes;
    store().onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null });

    store().select(a.id);
    store().deleteSelected();

    expect(store().nodes).toHaveLength(1);
    expect(store().nodes[0].id).toBe(b.id);
    expect(store().edges).toHaveLength(0);
  });

  it('attaches storage to a microservice host and cascades on delete', () => {
    store().addNode('microservice', { x: 0, y: 0 });
    const hostId = store().nodes[0].id;
    store().addStorage(hostId, 'database');
    store().addStorage(hostId, 'cache');

    const storages = store().nodes.filter((n) => n.parentId === hostId);
    expect(storages).toHaveLength(2);
    expect(storages.every((n) => n.data.attached && n.draggable === false)).toBe(true);

    store().select(hostId);
    store().deleteSelected();
    expect(store().nodes).toHaveLength(0); // host + both storages gone
  });

  it('blocks an invalid connection and surfaces a reason', () => {
    store().addNode('microservice', { x: 0, y: 0 });
    store().addNode('queue', { x: 200, y: 0 });
    const [ms, q] = store().nodes;
    store().setTapConnect(true);
    store().tapNode(ms.id);
    store().tapNode(q.id);
    expect(store().edges).toHaveLength(0);
    expect(store().notice).toBeTruthy();
  });

  it('round-trips its state to an ArchDocument, snapping placement to a tile', () => {
    store().addNode('service', { x: 70, y: 130 });
    const doc = store().toDocument();
    expect(doc.version).toBe(1);
    expect(doc.nodes).toHaveLength(1);
    // 70 -> 120, 130 -> 120 on the 120px tile grid.
    expect(doc.nodes[0].position).toEqual({ x: 120, y: 120 });
  });
});
