import type { EdgeKind } from '../model/types';
import { paletteEntry } from '../model/palette';
import { useArchStore } from '../store/useArchStore';

const EDGE_KINDS: EdgeKind[] = ['sync', 'async', 'data'];
const field = 'w-full rounded-lg border border-white/10 bg-panel px-2 py-1.5 text-sm text-slate-100 focus:border-accent focus:outline-none';
const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400';

/**
 * Contextual editor. Renders nothing until a component or connection is
 * selected, then floats a compact card over the canvas (top-right on desktop,
 * above the dock on mobile) — so it never reserves space when unused.
 */
export function Inspector() {
  const selectedNodeId = useArchStore((s) => s.selectedNodeId);
  const selectedEdgeId = useArchStore((s) => s.selectedEdgeId);
  const node = useArchStore((s) => s.nodes.find((n) => n.id === s.selectedNodeId));
  const edge = useArchStore((s) => s.edges.find((e) => e.id === s.selectedEdgeId));
  const updateNodeData = useArchStore((s) => s.updateNodeData);
  const updateEdge = useArchStore((s) => s.updateEdge);
  const deleteSelected = useArchStore((s) => s.deleteSelected);
  const select = useArchStore((s) => s.select);

  if ((!node && !edge) || (!selectedNodeId && !selectedEdgeId)) return null;

  const title = node ? paletteEntry(node.data.kind).label : 'Connection';

  return (
    <div className="absolute bottom-[6.25rem] left-3 right-3 z-20 rounded-2xl border border-white/10 bg-panel/90 p-3 shadow-xl backdrop-blur sm:bottom-auto sm:left-auto sm:right-3 sm:top-16 sm:w-72">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">{title}</span>
        <button
          onClick={() => select(undefined, undefined)}
          aria-label="Close"
          className="rounded p-1 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
        >
          ✕
        </button>
      </div>

      {node && (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Name</label>
            <input className={field} value={node.data.label} onChange={(e) => updateNodeData(node.id, { label: e.target.value })} />
            {node.data.kind === 'microservice' && (
              <p className="mt-1 text-[11px] text-slate-500">Name &amp; description drive this microservice's generated image.</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${field} h-20 resize-none`}
              value={node.data.description ?? ''}
              onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
              placeholder="What does this component do?"
            />
          </div>
        </div>
      )}

      {edge && (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Label</label>
            <input
              className={field}
              value={typeof edge.label === 'string' ? edge.label : ''}
              onChange={(e) => updateEdge(edge.id, { label: e.target.value })}
              placeholder="e.g. reads, publishes"
            />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select className={field} value={(edge.data?.kind as EdgeKind | undefined) ?? 'sync'} onChange={(e) => updateEdge(edge.id, { kind: e.target.value as EdgeKind })}>
              {EDGE_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button
        onClick={deleteSelected}
        className="mt-3 w-full rounded-lg border border-red-500/30 px-2 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
      >
        Delete
      </button>
    </div>
  );
}
