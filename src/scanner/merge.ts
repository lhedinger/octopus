import type { Level, ProjectDocument } from '../model/types';
import { pruneOrphanLevels } from '../model/project';
import { UNNAMED_SYSTEM } from './assemble';

const isScanned = (meta: Record<string, unknown> | undefined) => meta?.source === 'scan';

type ArchNode = Level['nodes'][number];

/** Stamp the drift aspect: how this scanned node relates to the last import. */
function withDrift(node: ArchNode, prev: ArchNode | undefined): ArchNode {
  const status = !prev
    ? 'added'
    : prev.label !== node.label || prev.kind !== node.kind || prev.description !== node.description
      ? 'changed'
      : undefined;
  if (!status) return node;
  const aspects = { ...(node.meta?.aspects as Record<string, unknown> | undefined), drift: { status } };
  return { ...node, meta: { ...node.meta, aspects } };
}

/**
 * Merge a fresh scan into the current project, keeping scanned *facts* and
 * human *curation* separate:
 *
 * - Scanned nodes/edges (meta.source === 'scan') are owned by the scan: the
 *   new import replaces them, so removed services disappear and changed
 *   dependencies update.
 * - Positions are curation: a scanned node that already existed keeps the
 *   position you dragged it to.
 * - Manually added nodes and edges are curation: they survive re-imports
 *   (edges only while both endpoints still exist).
 */
export function mergeScan(current: ProjectDocument, scanned: ProjectDocument): ProjectDocument {
  const levels: Record<string, Level> = {};
  const keys = new Set([...Object.keys(scanned.levels), ...Object.keys(current.levels)]);

  for (const key of keys) {
    const scan = scanned.levels[key];
    const cur = current.levels[key];
    if (!scan) {
      levels[key] = cur; // human-only level (e.g. drawn inside a component)
      continue;
    }
    if (!cur) {
      levels[key] = scan;
      continue;
    }

    const previous = new Map(cur.nodes.map((n) => [n.id, n]));
    const scanIds = new Set(scan.nodes.map((n) => n.id));
    const nodes = [
      // Facts from the scan, with curated positions carried over and the
      // drift aspect stamped (added / changed vs. the previous import).
      ...scan.nodes.map((n) => {
        const prev = previous.get(n.id);
        const stamped = withDrift(n, prev && isScanned(prev.meta) ? prev : undefined);
        return prev ? { ...stamped, position: prev.position } : stamped;
      }),
      // Manual additions survive; stale scanned nodes (dropped from the scan) do not.
      ...cur.nodes.filter((n) => !scanIds.has(n.id) && !isScanned(n.meta)),
    ];

    const nodeIds = new Set(nodes.map((n) => n.id));
    const scanEdgeIds = new Set(scan.edges.map((e) => e.id));
    const edges = [
      ...scan.edges,
      ...cur.edges.filter(
        (e) => !scanEdgeIds.has(e.id) && !isScanned(e.meta) && nodeIds.has(e.source) && nodeIds.has(e.target),
      ),
    ];

    levels[key] = { nodes, edges };
  }

  return pruneOrphanLevels({
    version: 2,
    id: current.id,
    // A system doc names the map; otherwise the current name stands.
    name: scanned.name !== UNNAMED_SYSTEM ? scanned.name : current.name,
    levels,
    scan: scanned.scan ?? current.scan,
  });
}
