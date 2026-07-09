import type { ArchDocument, ComponentKind, Level, ProjectDocument } from '../model/types';
import { createEmptyProject, ROOT_PATH } from '../model/types';
import { pruneOrphanLevels } from '../model/project';

const PROJECT_KEY = 'octopus.project.v2';
const LEGACY_KEY = 'octopus.document.v1';

function migrateLegacy(doc: ArchDocument): ProjectDocument {
  return {
    version: 2,
    id: doc.id ?? crypto.randomUUID(),
    name: doc.name ?? 'Untitled architecture',
    levels: { [ROOT_PATH]: { nodes: doc.nodes ?? [], edges: doc.edges ?? [] } },
  };
}

export function isProject(value: unknown): value is ProjectDocument {
  const p = value as ProjectDocument | null;
  return !!p && p.version === 2 && typeof p.levels === 'object' && !!p.levels;
}

/** Facets that used to be seeded as interior tiles; now surfaced as badges. */
const RETIRED_FACETS: ComponentKind[] = ['test', 'build', 'deploy'];

/**
 * Bring an older project up to date:
 * - build/test/deploy stopped being drill-in tiles (their state lives on the
 *   component as badges/lenses now) — strip them and prune their levels;
 * - the fixed Behavior facet became a regular module — convert it in place
 *   (same id, so the flow level beneath it survives).
 */
export function migrateProject(project: ProjectDocument): ProjectDocument {
  const levels: Record<string, Level> = {};
  for (const [key, level] of Object.entries(project.levels)) {
    levels[key] = {
      nodes: level.nodes
        .filter((n) => !(RETIRED_FACETS.includes(n.kind) && n.meta?.fixed === true))
        .map((n) =>
          n.kind === 'behavior' && n.meta?.fixed === true
            ? { ...n, kind: 'module' as ComponentKind, meta: { ...n.meta, fixed: undefined } }
            : n,
        ),
      edges: level.edges,
    };
  }
  return pruneOrphanLevels({ ...project, levels });
}

export function loadProject(): ProjectDocument {
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isProject(parsed)) return migrateProject(parsed);
    }
    // One-time migration from the old single-canvas format.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const doc = JSON.parse(legacy) as ArchDocument;
      if (doc && doc.version === 1 && Array.isArray(doc.nodes)) return migrateLegacy(doc);
    }
  } catch {
    // fall through to a fresh project
  }
  return createEmptyProject();
}

export function saveProject(project: ProjectDocument): void {
  try {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
  } catch {
    // storage full or unavailable — non-fatal
  }
}

/** Debounce helper so autosave doesn't run on every drag tick. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function exportToFile(project: ProjectDocument): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, '-').toLowerCase() || 'architecture'}.octopus.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedProject(text: string): ProjectDocument {
  const parsed = JSON.parse(text);
  if (isProject(parsed)) return migrateProject(parsed);
  // Accept a legacy single-canvas export too.
  if (parsed && parsed.version === 1 && Array.isArray(parsed.nodes)) return migrateLegacy(parsed as ArchDocument);
  throw new Error('Not a valid Octopus project');
}
