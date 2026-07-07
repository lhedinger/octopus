import type { Level, ProjectDocument } from './types';
import { ROOT_PATH } from './types';

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
