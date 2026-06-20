import { useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { Palette } from './components/Palette';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { useArchStore } from './store/useArchStore';
import { debounce, saveDocument } from './store/persistence';

const autosave = debounce(() => saveDocument(useArchStore.getState().toDocument()), 400);

function isEditingText(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

export default function App() {
  const isEmpty = useArchStore((s) => s.nodes.length === 0);

  // Autosave on any document-affecting change.
  useEffect(() => useArchStore.subscribe(autosave), []);

  // Delete / Backspace removes the current selection (unless typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingText()) {
        useArchStore.getState().deleteSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The canvas fills the whole screen; everything else floats over it.
  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-panel text-slate-100">
      <div className="absolute inset-0">
        <Canvas />
      </div>

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
          <p className="rounded-xl bg-panel/50 px-4 py-2 text-center text-sm text-slate-400 backdrop-blur">
            Tap a component below to place it · drag to pan · scroll or pinch to zoom
          </p>
        </div>
      )}

      <Toolbar />
      <Inspector />
      <Palette />
    </div>
  );
}
