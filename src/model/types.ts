export type ComponentKind =
  | 'service'
  | 'microservice'
  | 'database'
  | 'queue'
  | 'cache'
  | 'apiGateway'
  | 'client'
  | 'externalSystem'
  | 'datastore'
  // A grouped subdomain / package inside a codebase component's interior.
  | 'module'
  // Retired facet kinds — kept so legacy documents still parse (migrated on load).
  | 'test'
  | 'build'
  | 'deploy'
  | 'behavior'
  // Behavior blocks — the runtime-flow vocabulary inside a Behavior facet.
  | 'trigger'
  | 'step'
  | 'decision'
  | 'rule'
  | 'event'
  | 'outcome';

// 'flow' is a directional "then / next" link between behavior blocks.
export type EdgeKind = 'sync' | 'async' | 'data' | 'flow';

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
  /** Provenance and import metadata (e.g. `{ source: 'scan' }`). */
  meta?: Record<string, unknown>;
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

/** One canvas in the project tree (a single drill-down level). */
export interface Level {
  nodes: ArchNode[];
  edges: ArchEdge[];
}

/**
 * The whole project: a tree of canvases. `levels` is keyed by the path of
 * component ids you entered to reach it ('' is the root); drilling into a
 * component opens the level keyed by that path.
 */
export interface ProjectDocument {
  version: 2;
  id: string;
  name: string;
  levels: Record<string, Level>;
}

export const ROOT_PATH = '';

export function createEmptyProject(name = 'Untitled architecture'): ProjectDocument {
  return { version: 2, id: crypto.randomUUID(), name, levels: { [ROOT_PATH]: { nodes: [], edges: [] } } };
}
