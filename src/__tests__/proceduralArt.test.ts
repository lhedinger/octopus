import { describe, expect, it } from 'vitest';
import { buildScene } from '../render/proceduralArt';
import { PALETTE } from '../model/palette';

describe('proceduralArt', () => {
  it('renders a non-empty scene for every component kind', () => {
    for (const entry of PALETTE) {
      const scene = buildScene({ kind: entry.kind, name: entry.label });
      expect(scene.shapes.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for the same identity', () => {
    const a = buildScene({ kind: 'microservice', name: 'payments', description: 'charges cards' });
    const b = buildScene({ kind: 'microservice', name: 'payments', description: 'charges cards' });
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('produces visibly different art for different names of the same kind', () => {
    const a = buildScene({ kind: 'microservice', name: 'payments' });
    const b = buildScene({ kind: 'microservice', name: 'notifications' });
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
  });

  it('varies with description as well as name', () => {
    const a = buildScene({ kind: 'microservice', name: 'worker', description: 'handles email' });
    const b = buildScene({ kind: 'microservice', name: 'worker', description: 'handles sms' });
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
  });
});
