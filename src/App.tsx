import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Toolbar } from './components/Toolbar';
import { Palette } from './components/Palette';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { Breadcrumb } from './components/Breadcrumb';
import { useArchStore } from './store/useArchStore';
import { debounce, saveProject } from './store/persistence';

const autosave = debounce(() => saveProject(useArchStore.getState().toProject()), 400);

function isEditingText(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

export default function App() {
  const isEmpty = useArchStore((s) => s.nodes.length === 0);
  const nested = useArchStore((s) => s.path.length > 0);
  const notice = useArchStore((s) => s.notice);
  const clearNotice = useArchStore((s) => s.clearNotice);

  // Autosave on any document-affecting change.
  useEffect(() => useArchStore.subscribe(autosave), []);

  // Auto-dismiss the rule notice.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clearNotice, 3000);
    return () => clearTimeout(t);
  }, [notice, clearNotice]);

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

  // The canvas fills the whole screen; everything else floats over it. The
  // provider is lifted here so the palette can map screen coords to the canvas
  // for drag-and-drop.
  return (
    <ReactFlowProvider>
      <div className="relative h-[100dvh] w-screen overflow-hidden bg-panel text-slate-100">
        <div className="absolute inset-0">
          <Canvas />
        </div>

        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
            <p className="rounded-xl bg-panel/50 px-4 py-2 text-center text-sm text-slate-400 backdrop-blur">
              {nested
                ? 'Build this component’s internals · zoom out to go back up'
                : 'Tap or drag a component onto the canvas · zoom into one to drill inside'}
            </p>
          </div>
        )}

      {notice && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2">
          <div className="rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-1.5 text-center text-sm text-amber-200 shadow-lg backdrop-blur">
            {notice}
          </div>
        </div>
      )}

        <Toolbar />
        <Breadcrumb />
        <Inspector />
        <Palette />
      </div>
    </ReactFlowProvider>
  );
}
