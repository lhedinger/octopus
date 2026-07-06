import type { Level, ProjectDocument } from '../model/types';
import { ROOT_PATH } from '../model/types';
import { UNNAMED_SYSTEM } from './assemble';

const isScanned = (meta: Record<string, unknown> | undefined) => meta?.source === 'scan';

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
      // Facts from the scan, with curated positions carried over.
      ...scan.nodes.map((n) => {
        const prev = previous.get(n.id);
        return prev ? { ...n, position: prev.position } : n;
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
  });
}

/** Drop levels whose path no longer resolves to existing nodes. */
export function pruneOrphanLevels(project: ProjectDocument): ProjectDocument {
  const levels: Record<string, Level> = {};
  // Parents must be admitted before children; the root's depth is 0, not
  // split('/').length (which is 1 for '' — the same as a first-level key).
  const depth = (k: string) => (k === ROOT_PATH ? 0 : k.split('/').length);
  const keys = Object.keys(project.levels).sort((a, b) => depth(a) - depth(b));
  for (const key of keys) {
    if (key === ROOT_PATH) {
      levels[key] = project.levels[key];
      continue;
    }
    const path = key.split('/');
    const parentKey = path.slice(0, -1).join('/');
    const nodeId = path[path.length - 1];
    if (levels[parentKey]?.nodes.some((n) => n.id === nodeId)) levels[key] = project.levels[key];
  }
  return { ...project, levels };
}
