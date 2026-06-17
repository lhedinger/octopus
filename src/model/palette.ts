import type { ComponentKind } from './types';

export interface PaletteEntry {
  kind: ComponentKind;
  label: string;
  /** Short hint shown in the palette. */
  hint: string;
  /** Base hue (HSL degrees) anchoring this kind's procedural palette. */
  hue: number;
}

/**
 * The generic, technology-agnostic component vocabulary. Order here is the
 * order shown in the palette.
 */
export const PALETTE: PaletteEntry[] = [
  { kind: 'service', label: 'Service', hint: 'A running application', hue: 210 },
  { kind: 'microservice', label: 'Microservice', hint: 'Small focused service', hue: 265 },
  { kind: 'database', label: 'Database', hint: 'Relational / document store', hue: 150 },
  { kind: 'queue', label: 'Queue', hint: 'Async message broker', hue: 35 },
  { kind: 'cache', label: 'Cache', hint: 'In-memory store', hue: 0 },
  { kind: 'apiGateway', label: 'API Gateway', hint: 'Edge / routing', hue: 190 },
  { kind: 'client', label: 'Client', hint: 'User-facing app', hue: 95 },
  { kind: 'externalSystem', label: 'External System', hint: 'Third-party dependency', hue: 320 },
  { kind: 'datastore', label: 'Datastore', hint: 'Blob / object storage', hue: 50 },
];

const PALETTE_BY_KIND: Record<ComponentKind, PaletteEntry> = Object.fromEntries(
  PALETTE.map((entry) => [entry.kind, entry]),
) as Record<ComponentKind, PaletteEntry>;

export function paletteEntry(kind: ComponentKind): PaletteEntry {
  return PALETTE_BY_KIND[kind];
}

export function defaultLabel(kind: ComponentKind): string {
  return paletteEntry(kind).label;
}
