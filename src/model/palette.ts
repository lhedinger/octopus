import type { ComponentKind } from './types';
import { isBehavior, isCodebase, isFacet, isStorage } from './relationships';

export interface PaletteEntry {
  kind: ComponentKind;
  label: string;
  /** Short hint shown in the palette. */
  hint: string;
  /** Base hue (HSL degrees) anchoring this kind's procedural palette. */
  hue: number;
}

/** Visual + label definitions for every component kind. */
const KIND_INFO: PaletteEntry[] = [
  { kind: 'service', label: 'Service', hint: 'A running application', hue: 210 },
  { kind: 'microservice', label: 'Microservice', hint: 'Small focused service', hue: 265 },
  { kind: 'database', label: 'Database', hint: 'Relational / document store', hue: 150 },
  { kind: 'queue', label: 'Queue', hint: 'Async message broker', hue: 35 },
  { kind: 'cache', label: 'Cache', hint: 'In-memory store', hue: 0 },
  { kind: 'apiGateway', label: 'API Gateway', hint: 'Edge / routing', hue: 190 },
  { kind: 'client', label: 'Client', hint: 'User-facing app', hue: 95 },
  { kind: 'externalSystem', label: 'External System', hint: 'Third-party dependency', hue: 320 },
  { kind: 'datastore', label: 'Datastore', hint: 'Blob / object storage', hue: 50 },
  // Interior building block: a grouped subdomain / package inside a codebase.
  { kind: 'module', label: 'Module', hint: 'Subdomain / package', hue: 175 },
  // Facets (not shown in the dock — auto-present inside a microservice).
  { kind: 'test', label: 'Test', hint: 'Test suites & coverage', hue: 135 },
  { kind: 'build', label: 'Build', hint: 'Build / CI pipeline', hue: 45 },
  { kind: 'deploy', label: 'Deploy', hint: 'Deployment / release', hue: 200 },
  { kind: 'behavior', label: 'Behavior', hint: 'Runtime behaviour / logic', hue: 285 },
  // Behavior blocks — the runtime-flow vocabulary inside a Behavior facet.
  { kind: 'trigger', label: 'Trigger', hint: 'What starts it — request / event / schedule', hue: 145 },
  { kind: 'step', label: 'Step', hint: 'A unit of work / processing', hue: 210 },
  { kind: 'decision', label: 'Decision', hint: 'A branch on a condition', hue: 45 },
  { kind: 'rule', label: 'Rule', hint: 'A guard / validation / policy', hue: 275 },
  { kind: 'event', label: 'Event', hint: 'An event the service emits', hue: 25 },
  { kind: 'outcome', label: 'Outcome', hint: 'A terminal result — success / failure', hue: 340 },
];

const PALETTE_BY_KIND: Record<ComponentKind, PaletteEntry> = Object.fromEntries(
  KIND_INFO.map((entry) => [entry.kind, entry]),
) as Record<ComponentKind, PaletteEntry>;

/**
 * Kinds offered in the dock. Storage kinds are excluded — they're added from a
 * host microservice (they can't exist on their own), so they never stand alone
 * in the palette.
 */
export const PALETTE: PaletteEntry[] = KIND_INFO.filter(
  (entry) => !isStorage(entry.kind) && !isFacet(entry.kind) && !isBehavior(entry.kind) && entry.kind !== 'module',
);

/** Storage kinds, for the host's "add storage" control. */
export const STORAGE_PALETTE: PaletteEntry[] = KIND_INFO.filter((entry) => isStorage(entry.kind));

/** Behavior blocks, offered in the dock inside a module. */
export const BEHAVIOR_PALETTE: PaletteEntry[] = KIND_INFO.filter((entry) => isBehavior(entry.kind));

/** Inside a codebase component, the dock offers its building block: modules. */
export const MODULE_PALETTE: PaletteEntry[] = KIND_INFO.filter((entry) => entry.kind === 'module');

/**
 * The dock's contents depend on what container you've drilled into:
 * system map → infrastructure, codebase interior → modules, module → behavior.
 */
export function paletteForContainer(containerKind?: ComponentKind): PaletteEntry[] {
  if (containerKind === 'module' || containerKind === 'behavior') return BEHAVIOR_PALETTE;
  if (containerKind && isCodebase(containerKind)) return MODULE_PALETTE;
  return PALETTE;
}

export function paletteEntry(kind: ComponentKind): PaletteEntry {
  return PALETTE_BY_KIND[kind];
}

export function defaultLabel(kind: ComponentKind): string {
  return paletteEntry(kind).label;
}
