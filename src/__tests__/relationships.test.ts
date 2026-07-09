import { describe, expect, it } from 'vitest';
import { canAttach, canConnect, isBehavior, isStorage } from '../model/relationships';

describe('relationship rules', () => {
  it('treats datastore, database and cache as storage', () => {
    expect(['datastore', 'database', 'cache'].every((k) => isStorage(k as never))).toBe(true);
    expect(isStorage('microservice')).toBe(false);
  });

  it('lets a microservice connect only to a microservice or gateway', () => {
    expect(canConnect('microservice', 'microservice').ok).toBe(true);
    expect(canConnect('microservice', 'apiGateway').ok).toBe(true);
    expect(canConnect('microservice', 'service').ok).toBe(false);
    expect(canConnect('microservice', 'queue').ok).toBe(false);
  });

  it('never connects storage with a line', () => {
    expect(canConnect('microservice', 'database').ok).toBe(false);
    expect(canConnect('datastore', 'service').ok).toBe(false);
    expect(canConnect('cache', 'apiGateway').ok).toBe(false);
  });

  it('leaves non-microservice, non-storage pairs unconstrained', () => {
    expect(canConnect('service', 'queue').ok).toBe(true);
    expect(canConnect('apiGateway', 'client').ok).toBe(true);
  });

  it('only attaches storage to a microservice host', () => {
    expect(canAttach('database', 'microservice')).toBe(true);
    expect(canAttach('database', 'service')).toBe(false);
    expect(canAttach('service', 'microservice')).toBe(false);
  });

  it('recognizes the behavior-block vocabulary', () => {
    expect(['trigger', 'step', 'decision', 'rule', 'event', 'outcome'].every((k) => isBehavior(k as never))).toBe(true);
    expect(isBehavior('service')).toBe(false);
  });

  it('lets behavior blocks flow into each other but not into infrastructure', () => {
    expect(canConnect('trigger', 'step').ok).toBe(true);
    expect(canConnect('decision', 'outcome').ok).toBe(true);
    expect(canConnect('step', 'database').ok).toBe(false);
    expect(canConnect('service', 'outcome').ok).toBe(false);
  });

  it('lets modules depend on sibling modules only', () => {
    expect(canConnect('module', 'module').ok).toBe(true);
    expect(canConnect('module', 'service').ok).toBe(false);
    expect(canConnect('queue', 'module').ok).toBe(false);
  });
});
