import type { ComponentKind } from './types';

/** Storage kinds attach to a microservice host and can't exist without one. */
export const STORAGE_KINDS: ComponentKind[] = ['datastore', 'database', 'cache'];

export function isStorage(kind: ComponentKind): boolean {
  return STORAGE_KINDS.includes(kind);
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
