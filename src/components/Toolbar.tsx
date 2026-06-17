import { useRef } from 'react';
import { useArchStore } from '../store/useArchStore';
import { exportToFile, parseImportedDocument } from '../store/persistence';

export function Toolbar() {
  const fileInput = useRef<HTMLInputElement>(null);
  const docName = useArchStore((s) => s.docName);
  const setDocName = useArchStore((s) => s.setDocName);
  const tapConnect = useArchStore((s) => s.tapConnect);
  const setTapConnect = useArchStore((s) => s.setTapConnect);
  const deleteSelected = useArchStore((s) => s.deleteSelected);
  const hasSelection = useArchStore((s) => Boolean(s.selectedNodeId || s.selectedEdgeId));
  const newDocument = useArchStore((s) => s.newDocument);
  const loadFromDocument = useArchStore((s) => s.loadFromDocument);
  const toDocument = useArchStore((s) => s.toDocument);

  const onImport = async (file: File) => {
    try {
      const doc = parseImportedDocument(await file.text());
      loadFromDocument(doc);
    } catch {
      alert('Could not import: not a valid Octopus document.');
    }
  };

  const btn = 'rounded-lg border border-white/10 bg-panelLight px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-accent active:scale-95 disabled:opacity-40';

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-panel px-3 py-2">
      <span className="mr-1 select-none text-lg" aria-hidden>🐙</span>
      <input
        value={docName}
        onChange={(e) => setDocName(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-slate-100 hover:border-white/10 focus:border-accent focus:outline-none sm:flex-none sm:w-64"
        aria-label="Document name"
      />
      <button className={`${btn} ${tapConnect ? '!border-accent !text-accent' : ''}`} onClick={() => setTapConnect(!tapConnect)} aria-pressed={tapConnect}>
        {tapConnect ? 'Connecting…' : 'Connect'}
      </button>
      <button className={btn} onClick={deleteSelected} disabled={!hasSelection}>Delete</button>
      <button className={btn} onClick={() => exportToFile(toDocument())}>Export</button>
      <button className={btn} onClick={() => fileInput.current?.click()}>Import</button>
      <button className={btn} onClick={() => { if (confirm('Start a new, empty architecture?')) newDocument(); }}>New</button>
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
    </header>
  );
}
