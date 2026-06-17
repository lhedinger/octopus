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
  const hasSelection = useArchStore((s) => Boolean(s.selectedNodeId || s.selectedEdgeId));

  // Autosave on any document-affecting change.
  useEffect(() => {
    return useArchStore.subscribe(autosave);
  }, []);

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

  return (
    <div className="flex h-[100dvh] flex-col bg-panel text-slate-100">
      <Toolbar />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden border-r border-white/10 sm:block">
          <Palette />
        </aside>

        <main className="relative min-w-0 flex-1">
          <Canvas />
        </main>

        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-white/10 sm:block">
          <Inspector />
        </aside>

        {/* Mobile: inspector slides up over the palette when something is selected. */}
        <div className="absolute inset-x-0 bottom-0 sm:hidden">
          {hasSelection && (
            <div className="max-h-[42vh] overflow-y-auto border-t border-white/10 bg-panel/95 backdrop-blur">
              <Inspector />
            </div>
          )}
          <div className="border-t border-white/10 bg-panel/95 backdrop-blur">
            <Palette />
          </div>
        </div>
      </div>
    </div>
  );
}
