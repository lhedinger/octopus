import type { ArchNode, ComponentKind, Level } from './types';
import { defaultLabel } from './palette';

/**
 * Build/test/deploy are *properties* of a component, not spaces — they live on
 * the tile as badges and lenses (see facetInfo below). Behavior is the one
 * facet that's genuinely spatial (a flow of blocks), so it's the only interior
 * facet a microservice seeds.
 */
export const SEEDED_FACETS: ComponentKind[] = ['behavior'];

/** Centre of the 600px interior world, on the 120px tile grid. */
const BEHAVIOR_POSITION = { x: 240, y: 240 };

/**
 * Ensure a level has its always-present facets. `idFor` lets callers control
 * identity: the editor uses random UUIDs, the scanner uses deterministic ids
 * so re-scans update rather than duplicate.
 */
export function withFacets(
  level: Level,
  idFor: (kind: ComponentKind) => string = () => crypto.randomUUID(),
  meta?: Record<string, unknown>,
): Level {
  const nodes = [...level.nodes];
  for (const kind of SEEDED_FACETS) {
    if (nodes.some((n) => n.kind === kind)) continue;
    const node: ArchNode = {
      id: idFor(kind),
      kind,
      label: defaultLabel(kind),
      position: BEHAVIOR_POSITION,
      meta: { ...meta, fixed: true },
    };
    nodes.push(node);
  }
  return { nodes, edges: level.edges };
}

// --- Facet facts: build/test/deploy state carried on the component node ---

export type BuildStatus = 'passing' | 'failing' | 'unknown';

export interface FacetInfo {
  build?: { status?: BuildStatus; items?: string[] };
  test?: { coverage?: number; items?: string[] };
  deploy?: { environments?: string[] };
}

/** Kinds that represent a codebase, where build/test/deploy state applies. */
export const BADGE_KINDS: ComponentKind[] = ['service', 'microservice', 'apiGateway', 'client'];

export function facetInfo(meta?: Record<string, unknown>): FacetInfo {
  return (meta?.facets as FacetInfo) ?? {};
}

/** Map-wide overlays: tint each codebase tile by one facet metric. */
export type Lens = 'none' | 'build' | 'test' | 'deploy';

const GRAY = '#64748b';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';
const BLUE = '#38bdf8';

export function buildColor(status?: BuildStatus): string {
  return status === 'passing' ? GREEN : status === 'failing' ? RED : GRAY;
}

export function coverageColor(coverage?: number): string {
  if (coverage === undefined) return GRAY;
  return coverage >= 80 ? GREEN : coverage >= 50 ? AMBER : RED;
}

export function deployColor(environments?: string[]): string {
  return environments && environments.length > 0 ? BLUE : GRAY;
}

/** The active lens's colour + short metric label for one component. */
export function lensMetric(lens: Lens, meta?: Record<string, unknown>): { color: string; label: string } | undefined {
  if (lens === 'none') return undefined;
  const f = facetInfo(meta);
  if (lens === 'build') {
    const status = f.build?.status;
    return { color: buildColor(status), label: status ?? 'no data' };
  }
  if (lens === 'test') {
    const coverage = f.test?.coverage;
    return { color: coverageColor(coverage), label: coverage !== undefined ? `${coverage}%` : 'no data' };
  }
  const envs = f.deploy?.environments ?? [];
  return { color: deployColor(envs), label: envs.length > 0 ? `${envs.length} env${envs.length > 1 ? 's' : ''}` : 'no data' };
}
