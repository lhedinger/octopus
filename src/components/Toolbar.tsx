import { useRef, useState } from 'react';
import { useArchStore } from '../store/useArchStore';
import { exportToFile, parseImportedProject } from '../store/persistence';

export function Toolbar() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const docName = useArchStore((s) => s.docName);
  const setDocName = useArchStore((s) => s.setDocName);
  const tapConnect = useArchStore((s) => s.tapConnect);
  const setTapConnect = useArchStore((s) => s.setTapConnect);
  const newProject = useArchStore((s) => s.newProject);
  const loadFromProject = useArchStore((s) => s.loadFromProject);
  const toProject = useArchStore((s) => s.toProject);

  const onImport = async (file: File) => {
    try {
      loadFromProject(parseImportedProject(await file.text()));
    } catch {
      alert('Could not import: not a valid Octopus project.');
    }
  };

  const run = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <>
      <div className="absolute left-3 top-3 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-panel/80 py-1 pl-2 pr-1 shadow-lg backdrop-blur">
        <span aria-hidden className="select-none px-0.5 text-lg leading-none">🐙</span>
        <input
          value={docName}
          onChange={(e) => setDocName(e.target.value)}
          aria-label="Document name"
          className="w-24 rounded bg-transparent px-1 py-0.5 text-sm font-semibold text-slate-100 transition-all focus:w-44 focus:bg-white/5 focus:outline-none"
        />
        <span className="mx-0.5 h-5 w-px bg-white/10" />
        <button
          onClick={() => setTapConnect(!tapConnect)}
          aria-pressed={tapConnect}
          title="Link two components: tap this, then tap each component"
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${
            tapConnect ? 'bg-accent text-panel' : 'text-slate-200 hover:bg-white/10'
          }`}
        >
          {tapConnect ? 'Connecting…' : 'Connect'}
        </button>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More actions"
          aria-expanded={menuOpen}
          className="rounded-full px-2 pb-2 text-lg leading-none text-slate-200 hover:bg-white/10"
        >
          ⋯
        </button>
      </div>

      {menuOpen && (
        <>
          <button aria-hidden tabIndex={-1} className="fixed inset-0 z-20 cursor-default" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-3 top-14 z-30 w-44 overflow-hidden rounded-xl border border-white/10 bg-panel/95 py-1 text-sm shadow-xl backdrop-blur">
            {[
              { label: 'New architecture', fn: () => confirm('Start a new, empty architecture?') && newProject() },
              { label: 'Import…', fn: () => fileInput.current?.click() },
              { label: 'Export', fn: () => exportToFile(toProject()) },
            ].map((item) => (
              <button
                key={item.label}
                onClick={run(item.fn)}
                className="block w-full px-3 py-2 text-left text-slate-200 transition hover:bg-white/10"
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImport(file);
          e.target.value = '';
        }}
      />
    </>
  );
}
