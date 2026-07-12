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
