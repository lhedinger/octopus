import type { EdgeKind } from '../model/types';
import { paletteEntry } from '../model/palette';
import { useArchStore } from '../store/useArchStore';

const EDGE_KINDS: EdgeKind[] = ['sync', 'async', 'data'];
const field = 'w-full rounded-lg border border-white/10 bg-panel px-2 py-1.5 text-sm text-slate-100 focus:border-accent focus:outline-none';
const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400';

export function Inspector() {
  const selectedNodeId = useArchStore((s) => s.selectedNodeId);
  const selectedEdgeId = useArchStore((s) => s.selectedEdgeId);
  const node = useArchStore((s) => s.nodes.find((n) => n.id === s.selectedNodeId));
  const edge = useArchStore((s) => s.edges.find((e) => e.id === s.selectedEdgeId));
  const updateNodeData = useArchStore((s) => s.updateNodeData);
  const updateEdge = useArchStore((s) => s.updateEdge);

  if (!selectedNodeId && !selectedEdgeId) {
    return (
      <div className="p-4 text-sm text-slate-400">
        Tap a component to edit it, or tap two components in <span className="text-accent">Connect</span> mode to link them.
      </div>
    );
  }

  if (node) {
    return (
      <div className="space-y-3 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-accent">{paletteEntry(node.data.kind).label}</div>
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
            className={`${field} h-24 resize-none`}
            value={node.data.description ?? ''}
            onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
            placeholder="What does this component do?"
          />
        </div>
      </div>
    );
  }

  if (edge) {
    const kind = (edge.data?.kind as EdgeKind | undefined) ?? 'sync';
    return (
      <div className="space-y-3 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-accent">Connection</div>
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
          <select className={field} value={kind} onChange={(e) => updateEdge(edge.id, { kind: e.target.value as EdgeKind })}>
            {EDGE_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return null;
}
