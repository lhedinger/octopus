import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReactFlow } from '@xyflow/react';
import { paletteEntry, paletteForContainer } from '../model/palette';
import type { ComponentKind } from '../model/types';
import { ComponentArt } from '../render/ComponentArt';
import { TILE_SIZE } from '../model/grid';
import { nextSpawnPosition, selectContainerKind, useArchStore } from '../store/useArchStore';

const DRAG_THRESHOLD = 8;

/**
 * Floating component dock. Tap an entry to drop one at the next free slot, or
 * drag it onto the canvas to place it where you release. Drag is pointer-based
 * so it works with both mouse and touch (native HTML5 drag does not).
 */
export function Palette() {
  const addNode = useArchStore((s) => s.addNode);
  // The dock's contents follow the container you've drilled into: behavior
  // blocks inside a Behavior facet, infrastructure everywhere else.
  const containerKind = useArchStore(selectContainerKind);
  const entries = paletteForContainer(containerKind);
  const { screenToFlowPosition } = useReactFlow();
  const [ghost, setGhost] = useState<{ kind: ComponentKind; x: number; y: number } | null>(null);
  const drag = useRef<{ kind: ComponentKind; x0: number; y0: number; started: boolean } | null>(null);

  const teardown = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    drag.current = null;
    setGhost(null);
  };

  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.started && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > DRAG_THRESHOLD) d.started = true;
    if (d.started) setGhost({ kind: d.kind, x: e.clientX, y: e.clientY });
  };

  const onUp = (e: PointerEvent) => {
    const d = drag.current;
    if (d) {
      if (d.started) {
        // Drop onto the canvas only — not back onto a floating panel.
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        if (el?.closest('.react-flow') && !el.closest('[data-overlay]')) {
          const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
          addNode(d.kind, { x: p.x - TILE_SIZE / 2, y: p.y - TILE_SIZE / 2 });
        }
      } else {
        addNode(d.kind, nextSpawnPosition()); // a tap places at the next slot
      }
    }
    teardown();
  };

  const onCancel = () => teardown();

  const onPointerDown = (kind: ComponentKind) => (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { kind, x0: e.clientX, y0: e.clientY, started: false };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  return (
    <>
      <div
        data-overlay
        className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-panel/80 p-1.5 shadow-lg backdrop-blur"
      >
        {entries.map((entry) => (
          <button
            key={entry.kind}
            onPointerDown={onPointerDown(entry.kind)}
            title={`${entry.label} — tap to place, or drag onto the canvas`}
            // pan-x lets the dock scroll horizontally while vertical drags pull a component out.
            style={{ touchAction: 'pan-x' }}
            className="flex w-14 shrink-0 select-none flex-col items-center gap-0.5 rounded-xl p-1 transition hover:bg-white/10 active:scale-95"
          >
            <ComponentArt kind={entry.kind} name={entry.label} size={40} />
            <span className="w-full truncate text-center text-[10px] leading-tight text-slate-300">{entry.label}</span>
          </button>
        ))}
      </div>

      {ghost &&
        createPortal(
          <div
            style={{ left: ghost.x, top: ghost.y }}
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 opacity-80 drop-shadow-2xl"
          >
            <ComponentArt kind={ghost.kind} name={paletteEntry(ghost.kind).label} size={64} />
          </div>,
          document.body,
        )}
    </>
  );
}
