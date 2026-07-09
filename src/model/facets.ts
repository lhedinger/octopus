// --- Facet facts: build/test/deploy state carried on the component node ---

export type BuildStatus = 'passing' | 'failing' | 'unknown';

export interface FacetInfo {
  build?: { status?: BuildStatus; items?: string[] };
  test?: { coverage?: number; items?: string[] };
  deploy?: { environments?: string[] };
}

/** Re-exported for badge/lens consumers; defined with the connection rules. */
export { BADGE_KINDS } from './relationships';

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
