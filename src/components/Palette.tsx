import { PALETTE } from '../model/palette';
import { ComponentArt } from '../render/ComponentArt';
import { nextSpawnPosition, useArchStore } from '../store/useArchStore';
import { PALETTE_DRAG_TYPE } from './Canvas';

/**
 * Floating component dock. Tap an entry to drop one onto the canvas, or drag it
 * to a specific spot. Overlays the canvas bottom-center on every screen size, so
 * it never reserves layout space.
 */
export function Palette() {
  const addNode = useArchStore((s) => s.addNode);

  return (
    <div className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-panel/80 p-1.5 shadow-lg backdrop-blur">
      {PALETTE.map((entry) => (
        <button
          key={entry.kind}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(PALETTE_DRAG_TYPE, entry.kind);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onClick={() => addNode(entry.kind, nextSpawnPosition())}
          title={`${entry.label} — ${entry.hint}`}
          className="flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-xl p-1 transition hover:bg-white/10 active:scale-95"
        >
          <ComponentArt kind={entry.kind} name={entry.label} size={40} />
          <span className="w-full truncate text-center text-[10px] leading-tight text-slate-300">{entry.label}</span>
        </button>
      ))}
    </div>
  );
}
