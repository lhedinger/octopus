import { BADGE_KINDS } from './relationships';

/**
 * The aspect platform. An aspect is one facet of a component's lifecycle
 * (build, test, deploy — later: ownership, health, security, …) rendered
 * through a uniform grammar: tile badge → map lens → facts-card section.
 * Adding an aspect = adding one provider entry here; no new UI.
 */

/** Normalized data one aspect carries per component (in meta.aspects[key]). */
export interface AspectData {
  /** Categorical state, e.g. 'passing' | 'failing'. */
  status?: string;
  /** Numeric metric 0–100, e.g. test coverage. */
  score?: number;
  /** Short list: pipeline stages, suites, environments, … */
  items?: string[];
}

export interface AspectProvider {
  key: string;
  title: string;
  icon: string;
  lensLabel: string;
  /** False for aspects that don't join the tile badge strip (lens/dot only). */
  badge?: boolean;
  /** Badge / lens colour for this aspect's data. */
  color(d: AspectData | undefined): string;
  /** Short metric stamped on the tile under the lens. */
  metric(d: AspectData | undefined): string;
  /** Facts-card headline (may be longer than the metric). */
  headline(d: AspectData | undefined): string;
}

const GRAY = '#64748b';
const GREEN = '#34d399';
const AMBER = '#fbbf24';
const RED = '#f87171';
const BLUE = '#38bdf8';

const scoreColor = (score?: number) =>
  score === undefined ? GRAY : score >= 80 ? GREEN : score >= 50 ? AMBER : RED;

/** Stable categorical colour for a name (teams, contexts). */
export function categoryHue(name: string): number {
  let h = 7;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

const categoryColor = (name?: string) => (name ? `hsl(${categoryHue(name)} 65% 55%)` : GRAY);

/** Registered aspects, in badge/lens display order. */
export const ASPECTS: AspectProvider[] = [
  {
    key: 'build',
    title: 'Build',
    icon: '🔨',
    lensLabel: 'Build lens',
    color: (d) => (d?.status === 'passing' ? GREEN : d?.status === 'failing' ? RED : GRAY),
    metric: (d) => d?.status ?? 'no data',
    headline: (d) => d?.status ?? 'no data',
  },
  {
    key: 'test',
    title: 'Test',
    icon: '🧪',
    lensLabel: 'Test coverage lens',
    color: (d) => scoreColor(d?.score),
    metric: (d) => (d?.score !== undefined ? `${d.score}%` : 'no data'),
    headline: (d) => (d?.score !== undefined ? `${d.score}% coverage` : 'no data'),
  },
  {
    key: 'ownership',
    title: 'Owner',
    icon: '👤',
    lensLabel: 'Ownership lens',
    // status carries the owning team; the colour is categorical per team.
    color: (d) => categoryColor(d?.status),
    metric: (d) => d?.status ?? 'no team',
    headline: (d) => d?.status ?? 'no team',
  },
  {
    key: 'deploy',
    title: 'Deploy',
    icon: '🚀',
    lensLabel: 'Deploy lens',
    color: (d) => (d?.items && d.items.length > 0 ? BLUE : GRAY),
    metric: (d) => (d?.items?.length ? `${d.items.length} env${d.items.length > 1 ? 's' : ''}` : 'no data'),
    // The card's item list names the environments; the headline just counts.
    headline: (d) => (d?.items?.length ? `${d.items.length} env${d.items.length > 1 ? 's' : ''}` : 'no data'),
  },
];

const HEALTH_COLORS: Record<string, string> = { healthy: GREEN, degraded: AMBER, down: RED };

// Runtime health ("run it"): ambient dot on the tile + lens; not a badge chip.
ASPECTS.push({
  key: 'health',
  title: 'Health',
  icon: '❤️',
  lensLabel: 'Health lens',
  badge: false,
  color: (d) => (d?.status ? HEALTH_COLORS[d.status] ?? GRAY : GRAY),
  metric: (d) => d?.status ?? 'no data',
  headline: (d) =>
    d?.status ? `${d.status}${d.score !== undefined ? ` · ${d.score}% uptime` : ''}` : 'no data',
});

// Security posture: worst vulnerability severity / data classification; lens only.
const SECURITY_COLORS: Record<string, string> = {
  critical: RED,
  high: RED,
  medium: AMBER,
  low: AMBER,
  clean: GREEN,
  PCI: RED,
  PII: RED,
  internal: AMBER,
  public: GREEN,
};
ASPECTS.push({
  key: 'security',
  title: 'Security',
  icon: '🔒',
  lensLabel: 'Security lens',
  badge: false,
  color: (d) => (d?.status ? SECURITY_COLORS[d.status] ?? GRAY : GRAY),
  metric: (d) => d?.status ?? 'no data',
  headline: (d) => d?.status ?? 'no data',
});

// Lifecycle stage: invest vs. retire at a glance; lens only.
const LIFECYCLE_COLORS: Record<string, string> = { experimental: BLUE, active: GREEN, deprecated: AMBER, sunset: RED };
ASPECTS.push({
  key: 'lifecycle',
  title: 'Lifecycle',
  icon: '🧬',
  lensLabel: 'Lifecycle lens',
  badge: false,
  color: (d) => (d?.status ? LIFECYCLE_COLORS[d.status] ?? GRAY : GRAY),
  metric: (d) => d?.status ?? 'no data',
  headline: (d) => d?.status ?? 'no data',
});

// Criticality tier: blast-radius awareness; lens only.
const TIER_COLORS: Record<string, string> = { T0: RED, T1: AMBER, T2: BLUE, T3: GRAY };
ASPECTS.push({
  key: 'tier',
  title: 'Tier',
  icon: '🎯',
  lensLabel: 'Criticality lens',
  badge: false,
  color: (d) => (d?.status ? TIER_COLORS[d.status] ?? GRAY : GRAY),
  metric: (d) => d?.status ?? 'no data',
  headline: (d) => d?.status ?? 'no data',
});

// Tech stack: categorical colour by primary language; lens only.
ASPECTS.push({
  key: 'tech',
  title: 'Tech',
  icon: '🛠️',
  lensLabel: 'Tech lens',
  badge: false,
  color: (d) => categoryColor(d?.status),
  metric: (d) => d?.status ?? 'no data',
  headline: (d) => d?.status ?? 'no data',
});

// Scan drift: written by mergeScan on re-import (added / changed); lens only.
ASPECTS.push({
  key: 'drift',
  title: 'Drift',
  icon: '🔀',
  lensLabel: 'Scan drift lens',
  badge: false,
  color: (d) => (d?.status === 'added' ? GREEN : d?.status === 'changed' ? AMBER : GRAY),
  metric: (d) => d?.status ?? 'unchanged',
  headline: (d) => d?.status ?? 'unchanged since last scan',
});

export function aspectByKey(key: string): AspectProvider | undefined {
  return ASPECTS.find((a) => a.key === key);
}

/** All aspect data carried on a node (unknown keys are preserved, unrendered). */
export function aspectsOf(meta?: Record<string, unknown>): Record<string, AspectData> {
  return (meta?.aspects as Record<string, AspectData>) ?? {};
}

/** Active map overlay: 'none' or an aspect key. */
export type Lens = string;

/** The active lens's colour + metric for one component, if it applies. */
export function lensMetric(lens: Lens, meta?: Record<string, unknown>): { color: string; label: string } | undefined {
  if (lens === 'none') return undefined;
  const provider = aspectByKey(lens);
  if (!provider) return undefined;
  const data = aspectsOf(meta)[lens];
  return { color: provider.color(data), label: provider.metric(data) };
}

/** Kinds that carry aspects (codebase components). Re-exported for consumers. */
export { BADGE_KINDS };
