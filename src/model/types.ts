export type ComponentKind =
  | 'service'
  | 'microservice'
  | 'database'
  | 'queue'
  | 'cache'
  | 'apiGateway'
  | 'client'
  | 'externalSystem'
  | 'datastore';

export type EdgeKind = 'sync' | 'async' | 'data';

export interface ArchNode {
  id: string;
  kind: ComponentKind;
  label: string;
  description?: string;
  position: { x: number; y: number };
  /** Reserved for future grouping / containers. */
  parentId?: string;
  /**
   * Free-form metadata. Used today to cache a generated-image reference
   * (`{ imageMode: 'ai', imageKey: string }`); reserved for import metadata
   * (sourcePath, tech, tags) in later phases.
   */
  meta?: Record<string, unknown>;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  kind?: EdgeKind;
}

export interface ArchDocument {
  version: 1;
  id: string;
  name: string;
  nodes: ArchNode[];
  edges: ArchEdge[];
  updatedAt: string;
}

export function createEmptyDocument(name = 'Untitled architecture'): ArchDocument {
  return {
    version: 1,
    id: crypto.randomUUID(),
    name,
    nodes: [],
    edges: [],
    updatedAt: new Date().toISOString(),
  };
}
