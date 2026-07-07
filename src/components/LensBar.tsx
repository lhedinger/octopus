import { useArchStore } from '../store/useArchStore';
import type { Lens } from '../model/facets';

const LENSES: { key: Lens; icon: string; label: string }[] = [
  { key: 'build', icon: '🔨', label: 'Build lens' },
  { key: 'test', icon: '🧪', label: 'Test coverage lens' },
  { key: 'deploy', icon: '🚀', label: 'Deploy lens' },
];

/**
 * Map lenses: tint every codebase tile by one facet metric (build status,
 * test coverage, deploy environments) for a whole-system read at any zoom.
 * Tap the active lens again to turn it off.
 */
export function LensBar() {
  const lens = useArchStore((s) => s.lens);
  const setLens = useArchStore((s) => s.setLens);

  return (
    <div
      data-overlay
      className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-white/10 bg-panel/80 p-1 shadow-lg backdrop-blur"
    >
      {LENSES.map((l) => (
        <button
          key={l.key}
          title={l.label}
          aria-label={l.label}
          aria-pressed={lens === l.key}
          onClick={() => setLens(lens === l.key ? 'none' : l.key)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-base transition ${
            lens === l.key ? 'bg-accent/20 ring-2 ring-accent' : 'hover:bg-white/10'
          }`}
        >
          {l.icon}
        </button>
      ))}
    </div>
  );
}
