import { create } from 'zustand';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import type { ArchDocument, ComponentKind, EdgeKind } from '../model/types';
import { defaultLabel } from '../model/palette';
import {
  edgeToFlow,
  fromReactFlow,
  toReactFlow,
  type ComponentNodeData,
  type FlowEdge,
  type FlowNode,
} from '../model/mapping';
import { loadDocument } from './persistence';

interface ArchState {
  docId: string;
  docName: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId?: string;
  selectedEdgeId?: string;
  /** When true, tapping two nodes in turn connects them (touch-friendly). */
  tapConnect: boolean;
  connectSource?: string;

  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (kind: ComponentKind, position: { x: number; y: number }) => void;
  updateNodeData: (id: string, patch: Partial<ComponentNodeData>) => void;
  updateEdge: (id: string, patch: { label?: string; kind?: EdgeKind }) => void;
  deleteSelected: () => void;
  select: (nodeId?: string, edgeId?: string) => void;

  setTapConnect: (on: boolean) => void;
  tapNode: (id: string) => void;

  setDocName: (name: string) => void;
  newDocument: () => void;
  loadFromDocument: (doc: ArchDocument) => void;
  toDocument: () => ArchDocument;
}

let spawnIndex = 0;

export const useArchStore = create<ArchState>((set, get) => {
  const initial = loadDocument();
  const { nodes, edges } = toReactFlow(initial);

  return {
    docId: initial.id,
    docName: initial.name,
    nodes,
    edges,
    tapConnect: false,

    onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
    onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
    onConnect: (connection) => {
      const edge = edgeToFlow({
        id: crypto.randomUUID(),
        source: connection.source!,
        target: connection.target!,
        kind: 'sync',
      });
      set({ edges: addEdge(edge, get().edges) });
    },

    addNode: (kind, position) => {
      const id = crypto.randomUUID();
      const node: FlowNode = {
        id,
        type: 'component',
        position,
        data: { kind, label: defaultLabel(kind) },
      };
      spawnIndex++;
      set({ nodes: [...get().nodes, node], selectedNodeId: id, selectedEdgeId: undefined });
    },

    updateNodeData: (id, patch) =>
      set({
        nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      }),

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

    deleteSelected: () => {
      const { selectedNodeId, selectedEdgeId, nodes, edges } = get();
      if (selectedNodeId) {
        set({
          nodes: nodes.filter((n) => n.id !== selectedNodeId),
          edges: edges.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId),
          selectedNodeId: undefined,
        });
      } else if (selectedEdgeId) {
        set({ edges: edges.filter((e) => e.id !== selectedEdgeId), selectedEdgeId: undefined });
      }
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
      const edge = edgeToFlow({ id: crypto.randomUUID(), source: connectSource, target: id, kind: 'sync' });
      set({ edges: addEdge(edge, get().edges), connectSource: undefined });
    },

    setDocName: (name) => set({ docName: name }),

    newDocument: () => {
      spawnIndex = 0;
      set({ docId: crypto.randomUUID(), docName: 'Untitled architecture', nodes: [], edges: [], selectedNodeId: undefined, selectedEdgeId: undefined, connectSource: undefined });
    },

    loadFromDocument: (doc) => {
      const flow = toReactFlow(doc);
      set({ docId: doc.id, docName: doc.name, nodes: flow.nodes, edges: flow.edges, selectedNodeId: undefined, selectedEdgeId: undefined, connectSource: undefined });
    },

    toDocument: () => {
      const { docId, docName, nodes, edges } = get();
      return fromReactFlow({ id: docId, name: docName, version: 1 }, nodes, edges);
    },
  };
});

/** Default spawn position for tap-to-place, fanned out so nodes don't stack. */
export function nextSpawnPosition(): { x: number; y: number } {
  const i = spawnIndex;
  return { x: 120 + (i % 4) * 70, y: 120 + Math.floor(i / 4) * 70 };
}
