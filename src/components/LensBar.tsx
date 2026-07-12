import { useArchStore } from '../store/useArchStore';
import { ASPECTS } from '../model/aspects';

/**
 * Map lenses — one per registered aspect: tint every codebase tile by that
 * aspect's metric for a whole-system read at any zoom. Tap the active lens
 * again to turn it off.
 */
export function LensBar() {
  const lens = useArchStore((s) => s.lens);
  const setLens = useArchStore((s) => s.setLens);

  return (
    <div
      data-overlay
      className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-white/10 bg-panel/80 p-1 shadow-lg backdrop-blur"
    >
      {ASPECTS.map((a) => (
        <button
          key={a.key}
          title={a.lensLabel}
          aria-label={a.lensLabel}
          aria-pressed={lens === a.key}
          onClick={() => setLens(lens === a.key ? 'none' : a.key)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-base transition ${
            lens === a.key ? 'bg-accent/20 ring-2 ring-accent' : 'hover:bg-white/10'
          }`}
        >
          {a.icon}
        </button>
      ))}
    </div>
  );
}
