import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assembleProject, mergeScan, parseScanDocs, repoNodeId } from '../scanner';
import { ROOT_PATH } from '../model/types';

const PAYMENTS = `
octopus: 1
repo: payments
name: Payments
context: billing
storage:
  - kind: database
    name: payments-db
dependencies:
  - repo: notifications
    kind: async
    label: payment.settled
behavior:
  blocks:
    - { name: POST /charge, kind: trigger }
    - { name: Charged?, kind: decision }
    - { name: Done, kind: outcome }
  flow:
    - [POST /charge, Charged?]
    - { from: Charged?, to: Done, label: yes }
build: [lint, docker image]
`;

const scan = (...texts: string[]) => assembleProject(texts.flatMap((t) => parseScanDocs(t)));

describe('scanner', () => {
  it('parses a repo doc with defaults and multi-document files', () => {
    const docs = parseScanDocs(`octopus: 1\nrepo: a\n---\noctopus: 1\nsystem: Demo`);
    expect(docs).toHaveLength(2);
    expect(docs[0]).toMatchObject({ repo: 'a' });
    expect(docs[1]).toMatchObject({ system: 'Demo' });
  });

  it('rejects invalid docs with a precise message', () => {
    expect(() => parseScanDocs('octopus: 1\nkind: microservice', 'x.yaml')).toThrow(/x\.yaml.*repo.*required/);
    expect(() => parseScanDocs('octopus: 2\nrepo: a')).toThrow(/format version/);
    expect(() => parseScanDocs('octopus: 1\nrepo: a\nkind: pizza')).toThrow(/one of/);
  });

  it('assembles repos into a named project with deterministic ids', () => {
    const a = scan(PAYMENTS, 'octopus: 1\nsystem: ACME');
    const b = scan(PAYMENTS, 'octopus: 1\nsystem: ACME');
    expect(a.name).toBe('ACME');
    const ids = (p: typeof a) => p.levels[ROOT_PATH].nodes.map((n) => n.id).sort();
    expect(ids(a)).toEqual(ids(b));
    expect(ids(a)).toContain(repoNodeId('payments'));
  });

  it('creates external-system stubs for unscanned dependency targets', () => {
    const project = scan(PAYMENTS);
    const stub = project.levels[ROOT_PATH].nodes.find((n) => n.id === repoNodeId('notifications'))!;
    expect(stub.kind).toBe('externalSystem');
    expect(stub.meta?.stub).toBe(true);
    expect(project.levels[ROOT_PATH].edges[0]).toMatchObject({ kind: 'async', label: 'payment.settled' });
  });

  it('attaches storage and pre-builds facet + behavior interiors', () => {
    const project = scan(PAYMENTS);
    const root = project.levels[ROOT_PATH];
    const db = root.nodes.find((n) => n.kind === 'database')!;
    expect(db.parentId).toBe(repoNodeId('payments'));

    const interior = project.levels[repoNodeId('payments')];
    expect(interior.nodes.map((n) => n.kind).sort()).toEqual(['behavior', 'build', 'deploy', 'test']);
    expect(interior.nodes.find((n) => n.kind === 'build')?.description).toContain('lint');

    const behaviorFacet = interior.nodes.find((n) => n.kind === 'behavior')!;
    const flow = project.levels[`${repoNodeId('payments')}/${behaviorFacet.id}`];
    expect(flow.nodes.map((n) => n.kind).sort()).toEqual(['decision', 'outcome', 'trigger']);
    expect(flow.edges).toHaveLength(2);
    expect(flow.edges.every((e) => e.kind === 'flow')).toBe(true);
    expect(flow.edges.find((e) => e.label === 'yes')).toBeTruthy();
  });

  it('lays out callers to the left of what they call', () => {
    const project = scan(
      'octopus: 1\nrepo: web\nkind: client\ndependencies: [{ repo: api }]',
      'octopus: 1\nrepo: api\ndependencies: [{ repo: db-svc }]',
      'octopus: 1\nrepo: db-svc',
    );
    const x = (id: string) => project.levels[ROOT_PATH].nodes.find((n) => n.id === repoNodeId(id))!.position.x;
    expect(x('web')).toBeLessThan(x('api'));
    expect(x('api')).toBeLessThan(x('db-svc'));
  });

  it('survives dependency cycles', () => {
    const project = scan(
      'octopus: 1\nrepo: a\ndependencies: [{ repo: b }]',
      'octopus: 1\nrepo: b\ndependencies: [{ repo: a }]',
    );
    expect(project.levels[ROOT_PATH].nodes).toHaveLength(2);
  });

  it('rejects duplicate repo ids and unknown flow blocks', () => {
    expect(() => scan('octopus: 1\nrepo: a', 'octopus: 1\nrepo: a')).toThrow(/Duplicate repo/);
    expect(() =>
      scan('octopus: 1\nrepo: a\nbehavior:\n  blocks: [{ name: x }]\n  flow: [[x, missing]]'),
    ).toThrow(/unknown block/);
  });

  it('merges a re-scan without destroying curation', () => {
    const first = scan(PAYMENTS, 'octopus: 1\nrepo: legacy');
    // Curation: drag payments somewhere, add a manual note-ish node and edge.
    const curated = structuredClone(first);
    const root = curated.levels[ROOT_PATH];
    const payments = root.nodes.find((n) => n.id === repoNodeId('payments'))!;
    payments.position = { x: 960, y: 600 };
    root.nodes.push({ id: 'manual-1', kind: 'service', label: 'Hand-drawn', position: { x: 0, y: 480 } });
    root.edges.push({ id: 'manual-e', source: 'manual-1', target: repoNodeId('payments'), kind: 'sync' });

    // Re-scan: legacy is gone, payments is still there.
    const rescan = scan(PAYMENTS);
    const merged = mergeScan(curated, rescan);
    const mergedRoot = merged.levels[ROOT_PATH];

    // Curated position and manual node/edge survive; the removed repo doesn't.
    expect(mergedRoot.nodes.find((n) => n.id === repoNodeId('payments'))!.position).toEqual({ x: 960, y: 600 });
    expect(mergedRoot.nodes.find((n) => n.id === 'manual-1')).toBeTruthy();
    expect(mergedRoot.edges.find((e) => e.id === 'manual-e')).toBeTruthy();
    expect(mergedRoot.nodes.find((n) => n.id === repoNodeId('legacy'))).toBeUndefined();
    // The removed repo's interior levels are pruned too.
    expect(merged.levels[repoNodeId('legacy')]).toBeUndefined();
    // …but surviving repos keep their interiors (facets + behavior flow).
    const interior = merged.levels[repoNodeId('payments')];
    expect(interior).toBeDefined();
    const behaviorFacet = interior.nodes.find((n) => n.kind === 'behavior')!;
    expect(merged.levels[`${repoNodeId('payments')}/${behaviorFacet.id}`].nodes.length).toBeGreaterThan(0);
  });

  it('keeps the shipped example valid (it backs the Load-example menu item)', () => {
    const dir = join(__dirname, '../../examples/acme-shop');
    const docs = readdirSync(dir)
      .filter((f) => f.endsWith('.yaml'))
      .flatMap((f) => parseScanDocs(readFileSync(join(dir, f), 'utf8'), f));
    const project = assembleProject(docs);
    expect(project.name).toBe('ACME Shop');
    expect(project.levels[ROOT_PATH].nodes.filter((n) => !n.parentId).length).toBeGreaterThanOrEqual(7);
    // The payments behavior flow is the drill-down showcase — keep it present.
    const interior = project.levels[repoNodeId('payments')];
    const behaviorFacet = interior.nodes.find((n) => n.kind === 'behavior')!;
    expect(project.levels[`${repoNodeId('payments')}/${behaviorFacet.id}`].edges.length).toBeGreaterThan(0);
  });
});
