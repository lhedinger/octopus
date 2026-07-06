import type { ArchNode, ComponentKind, Level } from './types';
import { FACET_KINDS } from './relationships';
import { defaultLabel } from './palette';

/** Fixed facet positions inside a microservice's interior (a 2x2 block centred in the world). */
export const FACET_LAYOUT: { x: number; y: number }[] = [
  { x: 120, y: 120 },
  { x: 360, y: 120 },
  { x: 120, y: 360 },
  { x: 360, y: 360 },
];

/**
 * Ensure a level has the four always-present facets (test/build/deploy/behavior).
 * `idFor` lets callers control identity: the editor uses random UUIDs, the
 * scanner uses deterministic ids so re-scans update rather than duplicate.
 */
export function withFacets(
  level: Level,
  idFor: (kind: ComponentKind) => string = () => crypto.randomUUID(),
  meta?: Record<string, unknown>,
): Level {
  const nodes = [...level.nodes];
  FACET_KINDS.forEach((kind, i) => {
    if (nodes.some((n) => n.kind === kind)) return;
    const node: ArchNode = {
      id: idFor(kind),
      kind,
      label: defaultLabel(kind),
      position: FACET_LAYOUT[i],
      meta: { ...meta, fixed: true },
    };
    nodes.push(node);
  });
  return { nodes, edges: level.edges };
}
