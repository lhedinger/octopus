import { PALETTE } from '../model/palette';
import { ComponentArt } from '../render/ComponentArt';
import { nextSpawnPosition, useArchStore } from '../store/useArchStore';
import { PALETTE_DRAG_TYPE } from './Canvas';

/**
 * Component palette. Drag an entry onto the canvas (desktop) or tap it to drop
 * one at a fanned-out position (touch). Renders as a left sidebar on desktop and
 * a horizontally scrolling bottom sheet on mobile.
 */
export function Palette() {
  const addNode = useArchStore((s) => s.addNode);

  return (
    <div className="flex gap-2 overflow-x-auto p-2 sm:h-full sm:w-40 sm:flex-col sm:overflow-y-auto sm:overflow-x-visible">
      {PALETTE.map((entry) => (
        <button
          key={entry.kind}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(PALETTE_DRAG_TYPE, entry.kind);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onClick={() => addNode(entry.kind, nextSpawnPosition())}
          title={entry.hint}
          className="flex min-w-[5rem] shrink-0 flex-col items-center gap-1 rounded-xl border border-white/10 bg-panelLight/70 p-2 text-center transition hover:border-accent active:scale-95 sm:w-full"
        >
          <ComponentArt kind={entry.kind} name={entry.label} size={56} />
          <span className="text-[11px] font-medium leading-tight text-slate-200">{entry.label}</span>
        </button>
      ))}
    </div>
  );
}
