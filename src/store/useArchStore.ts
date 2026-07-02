import { create } from 'zustand';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import type { ArchNode, ComponentKind, EdgeKind, Level, ProjectDocument } from '../model/types';
import { ROOT_PATH } from '../model/types';
import { defaultLabel } from '../model/palette';
import { canConnect, FACET_KINDS, isBehavior } from '../model/relationships';
import { TILE_SIZE, snapPoint } from '../model/grid';
import {
  edgeToFlow,
  flowToLevel,
  levelToFlow,
  type ComponentNodeData,
  type FlowEdge,
  type FlowNode,
} from '../model/mapping';
import { loadProject } from './persistence';

export interface ArchState {
  docId: string;
  docName: string;
  /** Every drill-down canvas, keyed by the path of entered component ids. */
  levels: Record<string, Level>;
  /** Components entered to reach the active level; [] is the root. */
  path: string[];
  /** Bumped on any navigation so the canvas can refit the viewport. */
  navVersion: number;
  /** On exit, the component we just came out of — so the canvas can centre on it. */
  focusNodeId?: string;

  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId?: string;
  selectedEdgeId?: string;
  /** When true, tapping two nodes in turn connects them (touch-friendly). */
  tapConnect: boolean;
  connectSource?: string;
  /** Transient message shown when an action is blocked by a rule. */
  notice?: string;

  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (kind: ComponentKind, position: { x: number; y: number }) => void;
  addStorage: (hostId: string, kind: ComponentKind) => void;
  updateNodeData: (id: string, patch: Partial<ComponentNodeData>) => void;
  updateEdge: (id: string, patch: { label?: string; kind?: EdgeKind }) => void;
  deleteNode: (id: string) => void;
  deleteSelected: () => void;
  select: (nodeId?: string, edgeId?: string) => void;

  setTapConnect: (on: boolean) => void;
  tapNode: (id: string) => void;
  clearNotice: () => void;

  /** Drill into a component, opening (or creating) its inner canvas. */
  enter: (nodeId: string) => void;
  /** Climb back to the level `depth` components deep (0 = root). */
  exitTo: (depth: number) => void;

  setDocName: (name: string) => void;
  newProject: () => void;
  loadFromProject: (project: ProjectDocument) => void;
  toProject: () => ProjectDocument;
}

let spawnIndex = 0;
const keyOf = (path: string[]) => path.join('/');

// Fixed facet positions inside a microservice's interior (a 2x2 block centred in the world).
const FACET_LAYOUT: { x: number; y: number }[] = [
  { x: 120, y: 120 },
  { x: 360, y: 120 },
  { x: 120, y: 360 },
  { x: 360, y: 360 },
];

/** Ensure a microservice interior has its four always-present facets. */
function withFacets(level: Level): Level {
  const nodes = [...level.nodes];
  FACET_KINDS.forEach((kind, i) => {
    if (nodes.some((n) => n.kind === kind)) return;
    const node: ArchNode = {
      id: crypto.randomUUID(),
      kind,
      label: defaultLabel(kind),
      position: FACET_LAYOUT[i],
      meta: { fixed: true },
    };
    nodes.push(node);
  });
  return { nodes, edges: level.edges };
}

/**
 * Warm-start a Behavior facet with a single Trigger so the canvas invites
 * "…and then what?" instead of being blank. Only seeded while empty — it's a
 * starting anchor, not a fixed facet, so it can be moved or replaced.
 */
function withTrigger(level: Level): Level {
  if (level.nodes.length > 0) return level;
  const node: ArchNode = {
    id: crypto.randomUUID(),
    kind: 'trigger',
    label: defaultLabel('trigger'),
    position: { x: 240, y: 120 },
  };
  return { nodes: [node], edges: level.edges };
}

export const useArchStore = create<ArchState>((set, get) => {
  const project = loadProject();
  const rootLevel = project.levels[ROOT_PATH] ?? { nodes: [], edges: [] };
  const root = levelToFlow(rootLevel);

  /** Snapshot the active level back into the levels map. */
  const flushed = (): Record<string, Level> => {
    const { levels, path, nodes, edges } = get();
    return { ...levels, [keyOf(path)]: flowToLevel(nodes, edges) };
  };

  return {
    docId: project.id,
    docName: project.name,
    levels: project.levels,
    path: [],
    navVersion: 0,
    nodes: root.nodes,
    edges: root.edges,
    tapConnect: false,

    onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
    onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
    onConnect: (connection) => {
      const nodes = get().nodes;
      const source = nodes.find((n) => n.id === connection.source);
      const target = nodes.find((n) => n.id === connection.target);
      if (!source || !target) return;
      const check = canConnect(source.data.kind, target.data.kind);
      if (!check.ok) {
        set({ notice: check.reason });
        return;
      }
      const kind: EdgeKind = isBehavior(source.data.kind) ? 'flow' : 'sync';
      const edge = edgeToFlow({ id: crypto.randomUUID(), source: connection.source!, target: connection.target!, kind });
      set({ edges: addEdge(edge, get().edges) });
    },

    addNode: (kind, position) => {
      const id = crypto.randomUUID();
      const node: FlowNode = {
        id,
        type: 'component',
        position: snapPoint(position),
        data: { kind, label: defaultLabel(kind) },
      };
      spawnIndex++;
      // Placement is silent — no selection, so no context menu pops up.
      set({ nodes: [...get().nodes, node], selectedNodeId: undefined, selectedEdgeId: undefined });
    },

    addStorage: (hostId, kind) => {
      const { nodes } = get();
      const host = nodes.find((n) => n.id === hostId);
      if (!host || host.data.kind !== 'microservice') return;
      const slot = nodes.filter((n) => n.parentId === hostId).length;
      const size = TILE_SIZE / 2;
      const gap = 8;
      const id = crypto.randomUUID();
      const node: FlowNode = {
        id,
        type: 'component',
        position: { x: (slot % 2) * (size + gap), y: TILE_SIZE + gap + Math.floor(slot / 2) * (size + gap) },
        parentId: hostId,
        draggable: false,
        data: { kind, label: defaultLabel(kind), attached: true },
      };
      set({ nodes: [...nodes, node], selectedNodeId: hostId, selectedEdgeId: undefined });
    },

    updateNodeData: (id, patch) =>
      set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)) }),

    updateEdge: (id, patch) =>
      set({
        edges: get().edges.map((e) =>
          e.id === id
            ? {
                ...e,
                label: patch.label ?? e.label,
                animated: (patch.kind ?? (e.data?.kind as EdgeKind)) === 'async',
                data: { ...e.data, kind: patch.kind ?? e.data?.kind },
              }
            : e,
        ),
      }),

    deleteNode: (id) => {
      const { nodes, edges } = get();
      if (nodes.find((n) => n.id === id)?.data.fixed) return; // facets are always present
      const removed = new Set<string>([id]);
      for (const n of nodes) if (n.parentId && removed.has(n.parentId)) removed.add(n.id);
      set({
        nodes: nodes.filter((n) => !removed.has(n.id)),
        edges: edges.filter((e) => !removed.has(e.source) && !removed.has(e.target)),
        selectedNodeId: undefined,
      });
    },

    deleteSelected: () => {
      const { selectedNodeId, selectedEdgeId, edges } = get();
      if (selectedNodeId) get().deleteNode(selectedNodeId);
      else if (selectedEdgeId) set({ edges: edges.filter((e) => e.id !== selectedEdgeId), selectedEdgeId: undefined });
    },

    select: (nodeId, edgeId) => set({ selectedNodeId: nodeId, selectedEdgeId: edgeId }),

    setTapConnect: (on) => set({ tapConnect: on, connectSource: undefined }),

    tapNode: (id) => {
      const { tapConnect, connectSource } = get();
      if (!tapConnect) {
        set({ selectedNodeId: id, selectedEdgeId: undefined });
        return;
      }
      if (!connectSource) {
        set({ connectSource: id, selectedNodeId: id });
        return;
      }
      if (connectSource === id) {
        set({ connectSource: undefined });
        return;
      }
      const nodes = get().nodes;
      const source = nodes.find((n) => n.id === connectSource);
      const target = nodes.find((n) => n.id === id);
      const check = source && target ? canConnect(source.data.kind, target.data.kind) : { ok: false };
      if (!check.ok) {
        set({ notice: check.reason ?? 'Those components can’t be connected.', connectSource: undefined });
        return;
      }
      const kind: EdgeKind = source && isBehavior(source.data.kind) ? 'flow' : 'sync';
      const edge = edgeToFlow({ id: crypto.randomUUID(), source: connectSource, target: id, kind });
      set({ edges: addEdge(edge, get().edges), connectSource: undefined });
    },

    clearNotice: () => set({ notice: undefined }),

    enter: (nodeId) => {
      const { path } = get();
      const host = get().nodes.find((n) => n.id === nodeId);
      const levels = flushed();
      const newPath = [...path, nodeId];
      const key = keyOf(newPath);
      let level = levels[key] ?? { nodes: [], edges: [] };
      // A microservice always carries its test/build/deploy/behavior facets.
      if (host?.data.kind === 'microservice') level = withFacets(level);
      // A Behavior facet opens on a starting Trigger.
      else if (host?.data.kind === 'behavior') level = withTrigger(level);
      levels[key] = level;
      const flow = levelToFlow(level);
      spawnIndex = 0;
      set({
        levels,
        path: newPath,
        nodes: flow.nodes,
        edges: flow.edges,
        selectedNodeId: undefined,
        selectedEdgeId: undefined,
        connectSource: undefined,
        focusNodeId: undefined,
        navVersion: get().navVersion + 1,
      });
    },

    exitTo: (depth) => {
      const { path } = get();
      if (depth >= path.length) return;
      const levels = flushed();
      const newPath = path.slice(0, depth);
      const level = levels[keyOf(newPath)] ?? { nodes: [], edges: [] };
      const flow = levelToFlow(level);
      spawnIndex = 0;
      set({
        levels,
        path: newPath,
        nodes: flow.nodes,
        edges: flow.edges,
        selectedNodeId: undefined,
        selectedEdgeId: undefined,
        connectSource: undefined,
        // Centre the parent on the component we just stepped out of.
        focusNodeId: path[depth],
        navVersion: get().navVersion + 1,
      });
    },

    setDocName: (name) => set({ docName: name }),

    newProject: () => {
      spawnIndex = 0;
      set({
        docId: crypto.randomUUID(),
        docName: 'Untitled architecture',
        levels: { [ROOT_PATH]: { nodes: [], edges: [] } },
        path: [],
        nodes: [],
        edges: [],
        selectedNodeId: undefined,
        selectedEdgeId: undefined,
        connectSource: undefined,
        focusNodeId: undefined,
        navVersion: get().navVersion + 1,
      });
    },

    loadFromProject: (project) => {
      spawnIndex = 0;
      const rootLevel = project.levels[ROOT_PATH] ?? { nodes: [], edges: [] };
      const flow = levelToFlow(rootLevel);
      set({
        docId: project.id,
        docName: project.name,
        levels: project.levels,
        path: [],
        nodes: flow.nodes,
        edges: flow.edges,
        selectedNodeId: undefined,
        selectedEdgeId: undefined,
        connectSource: undefined,
        focusNodeId: undefined,
        navVersion: get().navVersion + 1,
      });
    },

    toProject: () => ({ version: 2, id: get().docId, name: get().docName, levels: flushed() }),
  };
});

/** Default spawn position for tap-to-place: successive tiles so nodes don't stack. */
export function nextSpawnPosition(): { x: number; y: number } {
  const i = spawnIndex;
  return { x: (1 + (i % 4)) * TILE_SIZE, y: (1 + Math.floor(i / 4)) * TILE_SIZE };
}

/**
 * The kind of the component whose interior is the active level (undefined at
 * the root). Drives context-aware UI like the palette. The container node lives
 * in the parent level, keyed by the path minus its last id.
 */
export function selectContainerKind(state: ArchState): ComponentKind | undefined {
  const { path, levels } = state;
  if (path.length === 0) return undefined;
  const parentKey = keyOf(path.slice(0, -1));
  const containerId = path[path.length - 1];
  return levels[parentKey]?.nodes.find((n) => n.id === containerId)?.kind;
}
