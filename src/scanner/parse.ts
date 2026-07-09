import { parseAllDocuments } from 'yaml';
import {
  REPO_KINDS,
  SCAN_BEHAVIOR_KINDS,
  SCAN_EDGE_KINDS,
  SCAN_FORMAT_VERSION,
  SCAN_STORAGE_KINDS,
  type RepoDoc,
  type ScanBehaviorBlock,
  type ScanBuildStatus,
  type ScanDoc,
  type ScanFlowEdge,
  type ScanModule,
  type SystemDoc,
} from './format';

const BUILD_STATUSES = ['passing', 'failing', 'unknown'] as const satisfies readonly ScanBuildStatus[];

export class ScanFormatError extends Error {}

const fail = (where: string, msg: string): never => {
  throw new ScanFormatError(`${where}: ${msg}`);
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asStringList(v: unknown, where: string): string[] {
  if (!Array.isArray(v) || v.some((s) => typeof s !== 'string')) fail(where, 'must be a list of strings');
  return v as string[];
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], where: string): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    fail(where, `must be one of: ${allowed.join(', ')}`);
  }
  return v as T;
}

function parseFlowEdge(v: unknown, where: string): ScanFlowEdge {
  if (Array.isArray(v)) {
    if (v.length !== 2 || v.some((s) => typeof s !== 'string')) fail(where, 'short form must be [from, to]');
    return v as [string, string];
  }
  if (isRecord(v) && typeof v.from === 'string' && typeof v.to === 'string') {
    if (v.label !== undefined && typeof v.label !== 'string') fail(where, 'label must be a string');
    return { from: v.from, to: v.to, label: v.label as string | undefined };
  }
  return fail(where, 'must be [from, to] or { from, to, label }');
}

function parseRepoDoc(raw: Record<string, unknown>, where: string): RepoDoc {
  const repo = raw.repo;
  if (typeof repo !== 'string' || !repo.trim()) fail(where, '`repo` (stable id) is required');

  const doc: RepoDoc = { octopus: SCAN_FORMAT_VERSION, repo: (repo as string).trim() };
  if (raw.name !== undefined) doc.name = String(raw.name);
  if (raw.kind !== undefined) doc.kind = oneOf(raw.kind, REPO_KINDS, `${where}.kind`);
  if (raw.description !== undefined) doc.description = String(raw.description);
  if (raw.context !== undefined) doc.context = String(raw.context);

  if (raw.storage !== undefined) {
    if (!Array.isArray(raw.storage)) fail(where, '`storage` must be a list');
    doc.storage = (raw.storage as unknown[]).map((s, i) => {
      if (!isRecord(s)) return fail(`${where}.storage[${i}]`, 'must be { kind, name? }');
      return {
        kind: oneOf(s.kind, SCAN_STORAGE_KINDS, `${where}.storage[${i}].kind`),
        name: s.name !== undefined ? String(s.name) : undefined,
      };
    });
  }

  if (raw.dependencies !== undefined) {
    if (!Array.isArray(raw.dependencies)) fail(where, '`dependencies` must be a list');
    doc.dependencies = (raw.dependencies as unknown[]).map((d, i) => {
      if (!isRecord(d) || typeof d.repo !== 'string') return fail(`${where}.dependencies[${i}]`, '`repo` (target id) is required');
      return {
        repo: d.repo,
        kind: d.kind !== undefined ? oneOf(d.kind, SCAN_EDGE_KINDS, `${where}.dependencies[${i}].kind`) : undefined,
        label: d.label !== undefined ? String(d.label) : undefined,
      };
    });
  }

  if (raw.modules !== undefined) {
    if (!Array.isArray(raw.modules)) fail(where, '`modules` must be a list');
    doc.modules = (raw.modules as unknown[]).map((m, i) => parseModule(m, `${where}.modules[${i}]`));
  }

  // A plain string list is shorthand: items for build/test, environments for deploy.
  if (raw.build !== undefined) {
    if (Array.isArray(raw.build)) doc.build = { items: asStringList(raw.build, `${where}.build`) };
    else if (isRecord(raw.build)) {
      doc.build = {
        status: raw.build.status !== undefined ? oneOf(raw.build.status, BUILD_STATUSES, `${where}.build.status`) : undefined,
        items: raw.build.items !== undefined ? asStringList(raw.build.items, `${where}.build.items`) : undefined,
      };
    } else fail(`${where}.build`, 'must be a list of items or { status?, items? }');
  }
  if (raw.test !== undefined) {
    if (Array.isArray(raw.test)) doc.test = { items: asStringList(raw.test, `${where}.test`) };
    else if (isRecord(raw.test)) {
      const coverage = raw.test.coverage;
      if (coverage !== undefined && (typeof coverage !== 'number' || coverage < 0 || coverage > 100)) {
        fail(`${where}.test.coverage`, 'must be a number between 0 and 100');
      }
      doc.test = {
        coverage: coverage as number | undefined,
        items: raw.test.items !== undefined ? asStringList(raw.test.items, `${where}.test.items`) : undefined,
      };
    } else fail(`${where}.test`, 'must be a list of items or { coverage?, items? }');
  }
  if (raw.deploy !== undefined) {
    if (Array.isArray(raw.deploy)) doc.deploy = { environments: asStringList(raw.deploy, `${where}.deploy`) };
    else if (isRecord(raw.deploy)) {
      doc.deploy = {
        environments: raw.deploy.environments !== undefined ? asStringList(raw.deploy.environments, `${where}.deploy.environments`) : undefined,
      };
    } else fail(`${where}.deploy`, 'must be a list of environments or { environments? }');
  }
  return doc;
}

function asFlowList(v: unknown, where: string): ScanFlowEdge[] {
  if (!Array.isArray(v)) fail(where, 'must be a list');
  return (v as unknown[]).map((e, i) => parseFlowEdge(e, `${where}[${i}]`));
}

function parseBehavior(v: unknown, where: string): { blocks: ScanBehaviorBlock[]; flow?: ScanFlowEdge[] } {
  if (!isRecord(v) || !Array.isArray(v.blocks)) fail(where, 'must be { blocks: [...], flow?: [...] }');
  const b = v as Record<string, unknown>;
  return {
    blocks: (b.blocks as unknown[]).map((blk, i) => {
      if (!isRecord(blk) || typeof blk.name !== 'string') return fail(`${where}.blocks[${i}]`, '`name` is required');
      return {
        name: blk.name,
        kind: blk.kind !== undefined ? oneOf(blk.kind, SCAN_BEHAVIOR_KINDS, `${where}.blocks[${i}].kind`) : undefined,
      };
    }),
    flow: b.flow !== undefined ? asFlowList(b.flow, `${where}.flow`) : undefined,
  };
}

function parseModule(v: unknown, where: string): ScanModule {
  if (!isRecord(v) || typeof v.name !== 'string' || !v.name.trim()) fail(where, '`name` is required');
  const m = v as Record<string, unknown>;
  const mod: ScanModule = { name: (m.name as string).trim() };
  if (m.description !== undefined) mod.description = String(m.description);
  if (m.dependencies !== undefined) {
    if (!Array.isArray(m.dependencies)) fail(`${where}.dependencies`, 'must be a list');
    mod.dependencies = (m.dependencies as unknown[]).map((d, i) => {
      if (typeof d === 'string') return d;
      if (isRecord(d) && typeof d.module === 'string') {
        return { module: d.module, label: d.label !== undefined ? String(d.label) : undefined };
      }
      return fail(`${where}.dependencies[${i}]`, 'must be a module name or { module, label? }');
    });
  }
  if (m.behavior !== undefined) mod.behavior = parseBehavior(m.behavior, `${where}.behavior`);
  return mod;
}

/**
 * Parse one YAML file (which may hold several `---`-separated documents) into
 * validated scan docs. Throws ScanFormatError with a precise location message.
 */
export function parseScanDocs(text: string, filename = 'scan.yaml'): ScanDoc[] {
  const documents = parseAllDocuments(text);
  const docs: ScanDoc[] = [];

  documents.forEach((d, index) => {
    if (d.errors.length > 0) fail(`${filename} (doc ${index + 1})`, d.errors[0].message);
    const raw = d.toJS() as unknown;
    if (raw === null || raw === undefined) return; // empty document — skip
    const where = `${filename} (doc ${index + 1})`;
    if (!isRecord(raw)) return fail(where, 'expected a mapping');
    if (raw.octopus !== SCAN_FORMAT_VERSION) {
      fail(where, `\`octopus: ${SCAN_FORMAT_VERSION}\` format version is required`);
    }
    if (typeof raw.system === 'string') {
      docs.push({ octopus: SCAN_FORMAT_VERSION, system: raw.system } satisfies SystemDoc);
      return;
    }
    docs.push(parseRepoDoc(raw, where));
  });

  return docs;
}
