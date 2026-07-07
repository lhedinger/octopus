import type { ArchEdge, ArchNode, ComponentKind, Level, ProjectDocument } from '../model/types';
import { ROOT_PATH } from '../model/types';
import { withFacets } from '../model/facets';
import { defaultLabel } from '../model/palette';
import { TILE_SIZE } from '../model/grid';
import { ScanFormatError } from './parse';
import { isRepoDoc, type RepoDoc, type ScanDoc, type ScanFlowEdge, type SystemDoc } from './format';

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
const facetNodeId = (repo: string, kind: ComponentKind) => `fct:${slug(repo)}:${kind}`;
const blockNodeId = (repo: string, name: string) => `bhv:${slug(repo)}:${slug(name)}`;

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

/** Build the interior level (behavior facet + scanned flow) for one repo. */
function buildInterior(doc: RepoDoc, levels: Record<string, Level>): void {
  // Build/test/deploy live on the tile as badges (meta.facets), not as
  // interiors; only microservices (and anything with a scanned flow) get the
  // spatial Behavior facet inside.
  if ((doc.kind ?? 'microservice') !== 'microservice' && !doc.behavior) return;
  const hostId = repoNodeId(doc.repo);
  levels[hostId] = withFacets({ nodes: [], edges: [] }, (kind) => facetNodeId(doc.repo, kind), scanMeta(doc.repo));

  if (!doc.behavior) return;
  const behaviorFacetId = facetNodeId(doc.repo, 'behavior');
  const idOf = new Map<string, string>();
  const nodes: ArchNode[] = doc.behavior.blocks.map((block, i) => {
    const id = blockNodeId(doc.repo, block.name);
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
  const edges: ArchEdge[] = (doc.behavior.flow ?? []).map((f: ScanFlowEdge) => {
    const [from, to, label] = Array.isArray(f) ? [f[0], f[1], undefined] : [f.from, f.to, f.label];
    const source = idOf.get(from);
    const target = idOf.get(to);
    if (!source || !target) {
      throw new ScanFormatError(`${doc.repo}: behavior flow references unknown block "${source ? to : from}"`);
    }
    return { id: `flw:${slug(doc.repo)}:${slug(from)}:${slug(to)}`, source, target, label, kind: 'flow', meta: scanMeta(doc.repo) };
  });
  levels[`${hostId}/${behaviorFacetId}`] = { nodes, edges };
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
      const facets =
        doc.build || doc.test || doc.deploy
          ? { facets: { build: doc.build, test: doc.test, deploy: doc.deploy } }
          : undefined;
      nodes.push({
        id,
        kind: doc.kind ?? 'microservice',
        label: doc.name ?? doc.repo,
        description: doc.description,
        position,
        meta: scanMeta(doc.repo, { ...(doc.context ? { context: doc.context } : undefined), ...facets }),
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
