import { beforeEach, describe, expect, it } from 'vitest';
import { selectContainerKind, useArchStore } from '../store/useArchStore';

const store = () => useArchStore.getState();

describe('useArchStore', () => {
  beforeEach(() => {
    store().newProject();
    store().setTapConnect(false);
  });

  it('adds nodes from the palette without selecting them', () => {
    store().addNode('service', { x: 10, y: 20 });
    expect(store().nodes).toHaveLength(1);
    expect(store().nodes[0].data.kind).toBe('service');
    // Placement is silent — no selection, so no context menu opens.
    expect(store().selectedNodeId).toBeUndefined();
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

  it('opens a microservice interior as an empty modules canvas', () => {
    store().addNode('microservice', { x: 0, y: 0 });
    const hostId = store().nodes[0].id;
    store().enter(hostId);

    // Build/test/deploy live on the tile as badges; the interior is for the
    // component's grouped subdomains/modules — nothing is pre-seeded.
    expect(store().nodes).toHaveLength(0);

    // Modules wire to each other with directional flow arrows.
    store().addNode('module', { x: 0, y: 0 });
    store().addNode('module', { x: 240, y: 0 });
    const [a, b] = store().nodes;
    store().onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null });
    expect(store().edges).toHaveLength(1);
    expect(store().edges[0].data?.kind).toBe('flow');
  });

  it('does not seed facets inside a non-microservice', () => {
    store().addNode('service', { x: 0, y: 0 });
    store().enter(store().nodes[0].id);
    expect(store().nodes).toHaveLength(0);
  });

  it('opens a module on a starting Trigger and flows blocks together', () => {
    store().addNode('microservice', { x: 0, y: 0 });
    store().enter(store().nodes[0].id);
    store().addNode('module', { x: 0, y: 0 });
    const module = store().nodes.find((n) => n.data.kind === 'module')!;
    store().enter(module.id);

    // Warm start: exactly one Trigger, and the context resolves to the module.
    expect(store().nodes).toHaveLength(1);
    expect(store().nodes[0].data.kind).toBe('trigger');
    expect(selectContainerKind(useArchStore.getState())).toBe('module');

    // A behavior→behavior connection is a directional flow edge.
    store().addNode('step', { x: 360, y: 120 });
    const trigger = store().nodes.find((n) => n.data.kind === 'trigger')!;
    const step = store().nodes.find((n) => n.data.kind === 'step')!;
    store().onConnect({ source: trigger.id, target: step.id, sourceHandle: null, targetHandle: null });
    expect(store().edges).toHaveLength(1);
    expect(store().edges[0].data?.kind).toBe('flow');
  });

  it('serializes the root level into a project, snapping placement to a tile', () => {
    store().addNode('service', { x: 70, y: 130 });
    const project = store().toProject();
    expect(project.version).toBe(2);
    const root = project.levels[''];
    expect(root.nodes).toHaveLength(1);
    // 70 -> 120, 130 -> 120 on the 120px tile grid.
    expect(root.nodes[0].position).toEqual({ x: 120, y: 120 });
  });

  it('drills into a component and keeps each level separate', () => {
    // A plain service doesn't seed facets, so counts are clean.
    store().addNode('service', { x: 0, y: 0 });
    const hostId = store().nodes[0].id;

    store().enter(hostId);
    expect(store().path).toEqual([hostId]);
    expect(store().nodes).toHaveLength(0); // fresh inner canvas

    store().addNode('service', { x: 0, y: 0 });
    store().addNode('queue', { x: 200, y: 0 });
    expect(store().nodes).toHaveLength(2);

    store().exitTo(0);
    expect(store().path).toEqual([]);
    expect(store().nodes).toHaveLength(1); // back to just the host

    // Re-entering shows the inner components again (persisted in the tree).
    store().enter(hostId);
    expect(store().nodes).toHaveLength(2);

    const project = store().toProject();
    expect(Object.keys(project.levels)).toContain(hostId);
    expect(project.levels[hostId].nodes).toHaveLength(2);
  });
});
