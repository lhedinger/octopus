import type { ComponentKind } from './types';

/** Storage kinds attach to a microservice host and can't exist without one. */
export const STORAGE_KINDS: ComponentKind[] = ['datastore', 'database', 'cache'];

export function isStorage(kind: ComponentKind): boolean {
  return STORAGE_KINDS.includes(kind);
}

/** Facet kinds are always present inside a microservice and don't use connections. */
export const FACET_KINDS: ComponentKind[] = ['test', 'build', 'deploy', 'behavior'];

export function isFacet(kind: ComponentKind): boolean {
  return FACET_KINDS.includes(kind);
}

/**
 * Behavior blocks live inside a Behavior facet and model a service's runtime
 * flow (Trigger → Step → Decision → Rule → Event → Outcome). They link to one
 * another with directional flow arrows and never mix with infrastructure kinds.
 */
export const BEHAVIOR_KINDS: ComponentKind[] = ['trigger', 'step', 'decision', 'rule', 'event', 'outcome'];

export function isBehavior(kind: ComponentKind): boolean {
  return BEHAVIOR_KINDS.includes(kind);
}

export type LinkKind = 'connection' | 'attachment';

export interface ConnectCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Whether two components may be joined by a connection *line*. Storage never
 * uses lines (it attaches); a microservice only connects to a microservice or
 * gateway; everything else is unconstrained for now.
 */
export function canConnect(a: ComponentKind, b: ComponentKind): ConnectCheck {
  // Behavior blocks flow into one another, but never wire to infrastructure.
  if (isBehavior(a) || isBehavior(b)) {
    return isBehavior(a) && isBehavior(b)
      ? { ok: true }
      : { ok: false, reason: 'Behavior blocks flow into other behavior blocks — not infrastructure.' };
  }
  if (isFacet(a) || isFacet(b)) {
    return { ok: false, reason: 'That’s a built-in facet — it doesn’t use connections.' };
  }
  if (a === b && a === 'microservice') return { ok: true };
  if (isStorage(a) || isStorage(b)) {
    return { ok: false, reason: 'Storage attaches to a microservice — it can’t be wired with a line.' };
  }
  const offender = a === 'microservice' ? b : b === 'microservice' ? a : null;
  if (offender && offender !== 'apiGateway') {
    return { ok: false, reason: 'A microservice connects only to a microservice or gateway.' };
  }
  return { ok: true };
}

/** Whether a storage kind may attach to a host kind (only microservices host storage). */
export function canAttach(storage: ComponentKind, host: ComponentKind): boolean {
  return isStorage(storage) && host === 'microservice';
}
