import type { ComponentKind, EdgeKind } from '../model/types';

/**
 * The scan interchange format: YAML documents describing repos/services and
 * their relationships, produced by scanners (or written by hand) and imported
 * into the map. One document per repo, plus an optional system document.
 * See docs/scan-format.md for the full contract.
 */

export const SCAN_FORMAT_VERSION = 1;

/** Kinds a scanned repo/service may declare on the system map. */
export const REPO_KINDS = [
  'service',
  'microservice',
  'apiGateway',
  'client',
  'queue',
  'externalSystem',
] as const satisfies readonly ComponentKind[];
export type RepoKind = (typeof REPO_KINDS)[number];

export const SCAN_STORAGE_KINDS = ['database', 'cache', 'datastore'] as const satisfies readonly ComponentKind[];
export type ScanStorageKind = (typeof SCAN_STORAGE_KINDS)[number];

export const SCAN_EDGE_KINDS = ['sync', 'async', 'data'] as const satisfies readonly EdgeKind[];
export type ScanEdgeKind = (typeof SCAN_EDGE_KINDS)[number];

export const SCAN_BEHAVIOR_KINDS = ['trigger', 'step', 'decision', 'rule', 'event', 'outcome'] as const satisfies readonly ComponentKind[];
export type ScanBehaviorKind = (typeof SCAN_BEHAVIOR_KINDS)[number];

export interface ScanStorage {
  kind: ScanStorageKind;
  name?: string;
}

export interface ScanDependency {
  /** Target repo id. A stub external-system node is created if it wasn't scanned. */
  repo: string;
  kind?: ScanEdgeKind;
  label?: string;
  /** The interface this edge carries: endpoints, event names, versions. */
  contract?: string[];
  /** Approximate request/event rate (req/s) — rendered under the health lens. */
  traffic?: number;
}

export interface ScanBehaviorBlock {
  name: string;
  kind?: ScanBehaviorKind;
}

/** `[from, to]` short form or `{ from, to, label }` for labelled branches. */
export type ScanFlowEdge = [string, string] | { from: string; to: string; label?: string };

/** A grouped subdomain / package inside a repo, shown on the second layer. */
export interface ScanModule {
  name: string;
  description?: string;
  /** Sibling modules this one depends on; string shorthand = just the name. */
  dependencies?: (string | { module: string; label?: string })[];
  /** Optional runtime flow, one drill-down deeper (inside the module). */
  behavior?: { blocks: ScanBehaviorBlock[]; flow?: ScanFlowEdge[] };
}

export type ScanBuildStatus = 'passing' | 'failing' | 'unknown';

/** Normalized per-aspect data (see model/aspects.ts for how it renders). */
export interface ScanAspectData {
  status?: string;
  /** Numeric metric 0–100 (e.g. test coverage). */
  score?: number;
  items?: string[];
}

/** One scanned repo/service. */
export interface RepoDoc {
  octopus: number;
  /** Stable identity across re-scans — never renamed once assigned. */
  repo: string;
  name?: string;
  kind?: RepoKind;
  description?: string;
  /** Bounded context this repo belongs to (grouping/curation hint). */
  context?: string;
  /** Owning team — "you build it you run it" (zones + ownership lens). */
  team?: string;
  /** Per-environment deployment state (version, status). */
  environments?: Record<string, { version?: string; status?: string }>;
  storage?: ScanStorage[];
  dependencies?: ScanDependency[];
  /** The repo's internal subdomains — the component's interior canvas. */
  modules?: ScanModule[];
  /**
   * Lifecycle aspects, surfaced as tile badges / map lenses / facts cards.
   * YAML offers shorthands (`build:`, `test:`, `deploy:` — plain lists or
   * structured) plus a generic `aspects:` map for everything else; the parser
   * normalizes all of them into this record.
   */
  aspects?: Record<string, ScanAspectData>;
}

/** Optional system-level document naming the whole map. */
export interface SystemDoc {
  octopus: number;
  system: string;
}

export type ScanDoc = RepoDoc | SystemDoc;

export function isRepoDoc(doc: ScanDoc): doc is RepoDoc {
  return 'repo' in doc;
}
