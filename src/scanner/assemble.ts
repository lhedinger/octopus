import type { ArchEdge, ArchNode, Level, ProjectDocument } from '../model/types';
import { ROOT_PATH } from '../model/types';
import { defaultLabel } from '../model/palette';
import { TILE_SIZE } from '../model/grid';
import { ScanFormatError } from './parse';
import { isRepoDoc, type RepoDoc, type ScanDoc, type ScanFlowEdge, type ScanModule, type SystemDoc } from './format';

/** Placeholder name until a system doc names the map. */
export const UNNAMED_SYSTEM = 'Scanned system';

/**
 * Deterministic ids, derived from scanned identity so re-scans update the same
 * nodes instead of duplicating them. Ids never contain '/' — level keys join
 * node ids with it.
 */
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, '-');
export const repoNodeId = (repo: string) => `repo:${slug(repo)}`;
const storageNodeId = (repo: string, name: string) => `sto:${slug(repo)}:${slug(name)}`;
const moduleNodeId = (repo: string, name: string) => `mod:${slug(repo)}:${slug(name)}`;
const blockNodeId = (repo: string, module: string, name: string) => `bhv:${slug(repo)}:${slug(module)}:${slug(name)}`;

const scanMeta = (repo: string, extra?: Record<string, unknown>) => ({ source: 'scan', repo, ...extra });

/** Longest caller-chain depth per repo; callers sit left of what they call. */
function computeRanks(repos: string[], callersOf: Map<string, string[]>): Map<string, number> {
  const memo = new Map<string, number>();
  const onStack = new Set<string>();
  const visit = (id: string): number => {
    const known = memo.get(id);
    if (known !== undefined) return known;
    if (onStack.has(id)) return 0; // dependency cycle — break it deterministically
    onStack.add(id);
    const callers = callersOf.get(id) ?? [];
    const rank = callers.length === 0 ? 0 : 1 + Math.max(...callers.map(visit));
    onStack.delete(id);
    memo.set(id, rank);
    return rank;
  };
  for (const id of repos) visit(id);
  return memo;
}

/** One module's runtime flow, one drill-down inside the module. */
function buildModuleFlow(doc: RepoDoc, mod: ScanModule, levels: Record<string, Level>): void {
  if (!mod.behavior) return;
  const idOf = new Map<string, string>();
  const nodes: ArchNode[] = mod.behavior.blocks.map((block, i) => {
    const id = blockNodeId(doc.repo, mod.name, block.name);
    idOf.set(block.name, id);
    return {
      id,
      kind: block.kind ?? 'step',
      label: block.name,
      // Reading order inside the 600px world: 4 tiles per row.
      position: { x: (i % 4) * TILE_SIZE, y: Math.floor(i / 4) * TILE_SIZE + TILE_SIZE },
      meta: scanMeta(doc.repo),
    };
  });
  const edges: ArchEdge[] = (mod.behavior.flow ?? []).map((f: ScanFlowEdge) => {
    const [from, to, label] = Array.isArray(f) ? [f[0], f[1], undefined] : [f.from, f.to, f.label];
    const source = idOf.get(from);
    const target = idOf.get(to);
    if (!source || !target) {
      throw new ScanFormatError(`${doc.repo}/${mod.name}: behavior flow references unknown block "${source ? to : from}"`);
    }
    return {
      id: `flw:${slug(doc.repo)}:${slug(mod.name)}:${slug(from)}:${slug(to)}`,
      source,
      target,
      label,
      kind: 'flow',
      meta: scanMeta(doc.repo),
    };
  });
  levels[`${repoNodeId(doc.repo)}/${moduleNodeId(doc.repo, mod.name)}`] = { nodes, edges };
}

/** The repo's interior: its subdomains/modules and their dependency arrows. */
function buildInterior(doc: RepoDoc, levels: Record<string, Level>): void {
  const modules = doc.modules ?? [];
  if (modules.length === 0) return;
  const hostId = repoNodeId(doc.repo);

  const nodes: ArchNode[] = modules.map((mod, i) => ({
    id: moduleNodeId(doc.repo, mod.name),
    kind: 'module',
    label: mod.name,
    description: mod.description,
    // Up to three modules per row across the 600px interior world.
    position: { x: (i % 3) * TILE_SIZE * 2, y: TILE_SIZE + Math.floor(i / 3) * TILE_SIZE * 2 },
    meta: scanMeta(doc.repo),
  }));

  const known = new Set(modules.map((m) => moduleNodeId(doc.repo, m.name)));
  const edges: ArchEdge[] = modules.flatMap((mod) =>
    (mod.dependencies ?? []).map((dep) => {
      const [name, label] = typeof dep === 'string' ? [dep, undefined] : [dep.module, dep.label];
      const target = moduleNodeId(doc.repo, name);
      if (!known.has(target)) {
        throw new ScanFormatError(`${doc.repo}/${mod.name}: depends on unknown module "${name}"`);
      }
      return {
        id: `mdep:${slug(doc.repo)}:${slug(mod.name)}:${slug(name)}`,
        source: moduleNodeId(doc.repo, mod.name),
        target,
        label,
        kind: 'flow' as const,
        meta: scanMeta(doc.repo),
      };
    }),
  );

  levels[hostId] = { nodes, edges };
  for (const mod of modules) buildModuleFlow(doc, mod, levels);
}

/**
 * Assemble validated scan docs into a full project: system map laid out by
 * dependency rank (callers left, callees right, grouped by bounded context),
 * plus pre-built facet/behavior interiors. Everything carries
 * `meta.source: 'scan'` so re-imports can replace facts while preserving
 * curation (see merge.ts).
 */
export function assembleProject(docs: ScanDoc[]): ProjectDocument {
  const repoDocs = docs.filter(isRepoDoc);
  const systemName = docs.find((d): d is SystemDoc => !isRepoDoc(d))?.system;
  if (repoDocs.length === 0) throw new ScanFormatError('No repo documents found in the scan.');

  const seen = new Set<string>();
  for (const doc of repoDocs) {
    const id = repoNodeId(doc.repo);
    if (seen.has(id)) throw new ScanFormatError(`Duplicate repo id "${doc.repo}" — repo ids must be unique.`);
    seen.add(id);
  }

  // Dependency targets that weren't scanned become external-system stubs.
  const docOf = new Map(repoDocs.map((d) => [repoNodeId(d.repo), d]));
  const stubs = new Map<string, string>(); // node id -> declared name
  const callersOf = new Map<string, string[]>();
  const edges: ArchEdge[] = [];

  for (const doc of repoDocs) {
    const sourceId = repoNodeId(doc.repo);
    for (const dep of doc.dependencies ?? []) {
      const targetId = repoNodeId(dep.repo);
      if (!docOf.has(targetId)) stubs.set(targetId, dep.repo);
      callersOf.set(targetId, [...(callersOf.get(targetId) ?? []), sourceId]);
      edges.push({
        id: `dep:${slug(doc.repo)}:${slug(dep.repo)}${dep.label ? `:${slug(dep.label)}` : ''}`,
        source: sourceId,
        target: targetId,
        label: dep.label,
        kind: dep.kind ?? 'sync',
        meta: scanMeta(doc.repo),
      });
    }
  }

  // Layout: columns by rank, rows grouped by bounded context then name.
  const allIds = [...docOf.keys(), ...stubs.keys()];
  const ranks = computeRanks(allIds, callersOf);
  const byRank = new Map<number, string[]>();
  for (const id of allIds) {
    const r = ranks.get(id) ?? 0;
    byRank.set(r, [...(byRank.get(r) ?? []), id]);
  }
  const contextOf = (id: string) => docOf.get(id)?.context ?? '~external';
  const labelOf = (id: string) => docOf.get(id)?.name ?? docOf.get(id)?.repo ?? stubs.get(id) ?? id;

  const nodes: ArchNode[] = [];
  const levels: Record<string, Level> = {};
  const GAP = TILE_SIZE * 2; // a free tile between components keeps edges readable

  for (const [rank, ids] of byRank) {
    ids.sort((a, b) => contextOf(a).localeCompare(contextOf(b)) || labelOf(a).localeCompare(labelOf(b)));
    ids.forEach((id, row) => {
      const doc = docOf.get(id);
      const position = { x: TILE_SIZE + rank * GAP, y: TILE_SIZE + row * GAP };
      if (!doc) {
        nodes.push({
          id,
          kind: 'externalSystem',
          label: stubs.get(id) ?? id,
          description: 'Referenced by a scanned service but not scanned itself.',
          position,
          meta: { source: 'scan', stub: true },
        });
        return;
      }
      nodes.push({
        id,
        kind: doc.kind ?? 'microservice',
        label: doc.name ?? doc.repo,
        description: doc.description,
        position,
        meta: scanMeta(doc.repo, {
          ...(doc.context ? { context: doc.context } : undefined),
          ...(doc.team ? { team: doc.team } : undefined),
          ...(doc.aspects ? { aspects: doc.aspects } : undefined),
        }),
      });
      (doc.storage ?? []).forEach((s, slot) => {
        const name = s.name ?? defaultLabel(s.kind);
        const size = TILE_SIZE / 2;
        const gap = 8;
        nodes.push({
          id: storageNodeId(doc.repo, name),
          kind: s.kind,
          label: name,
          position: { x: (slot % 2) * (size + gap), y: TILE_SIZE + gap + Math.floor(slot / 2) * (size + gap) },
          parentId: id,
          meta: scanMeta(doc.repo),
        });
      });
      buildInterior(doc, levels);
    });
  }

  levels[ROOT_PATH] = { nodes, edges };
  return { version: 2, id: crypto.randomUUID(), name: systemName ?? UNNAMED_SYSTEM, levels };
}
