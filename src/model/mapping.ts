import type { Edge, Node } from '@xyflow/react';
import type { ArchDocument, ArchEdge, ArchNode, ComponentKind, EdgeKind, Level } from './types';

/** Data carried on a React Flow node for our custom renderer. */
export interface ComponentNodeData extends Record<string, unknown> {
  kind: ComponentKind;
  label: string;
  description?: string;
  meta?: Record<string, unknown>;
  /** True when this node is a storage attached to a host microservice. */
  attached?: boolean;
  /** True for always-present facets (test/build/deploy/behavior) — can't be deleted. */
  fixed?: boolean;
}

export type FlowNode = Node<ComponentNodeData, 'component'>;
export type FlowEdge = Edge;

export function nodeToFlow(node: ArchNode): FlowNode {
  const attached = Boolean(node.parentId);
  const fixed = node.meta?.fixed === true;
  return {
    id: node.id,
    type: 'component',
    position: node.position,
    parentId: node.parentId,
    // Attachments and fixed facets stay put; they aren't freely draggable.
    draggable: attached || fixed ? false : undefined,
    data: {
      kind: node.kind,
      label: node.label,
      description: node.description,
      meta: node.meta,
      attached,
      fixed,
    },
  };
}

export function edgeToFlow(edge: ArchEdge): FlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: 'smoothstep',
    animated: edge.kind === 'async',
    data: { kind: edge.kind },
  };
}

export function toReactFlow(doc: ArchDocument): { nodes: FlowNode[]; edges: FlowEdge[] } {
  // React Flow requires a parent node to appear before its children.
  const ordered = [...doc.nodes].sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));
  return {
    nodes: ordered.map(nodeToFlow),
    edges: doc.edges.map(edgeToFlow),
  };
}

export function flowToNode(node: FlowNode): ArchNode {
  return {
    id: node.id,
    kind: node.data.kind,
    label: node.data.label,
    description: node.data.description,
    position: node.position,
    parentId: node.parentId,
    meta: node.data.meta,
  };
}

export function flowToEdge(edge: FlowEdge): ArchEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: typeof edge.label === 'string' ? edge.label : undefined,
    kind: (edge.data?.kind as EdgeKind | undefined) ?? 'sync',
  };
}

export function fromReactFlow(
  base: Pick<ArchDocument, 'id' | 'name' | 'version'>,
  nodes: FlowNode[],
  edges: FlowEdge[],
): ArchDocument {
  return {
    version: base.version,
    id: base.id,
    name: base.name,
    nodes: nodes.map(flowToNode),
    edges: edges.map(flowToEdge),
    updatedAt: new Date().toISOString(),
  };
}

/** Convert one drill-down level (domain) to React Flow nodes/edges. */
export function levelToFlow(level: Level): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const ordered = [...level.nodes].sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));
  return { nodes: ordered.map(nodeToFlow), edges: level.edges.map(edgeToFlow) };
}

/** Snapshot the active React Flow nodes/edges back to a domain level. */
export function flowToLevel(nodes: FlowNode[], edges: FlowEdge[]): Level {
  return { nodes: nodes.map(flowToNode), edges: edges.map(flowToEdge) };
}
