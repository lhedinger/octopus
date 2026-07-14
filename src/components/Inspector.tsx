import type { EdgeKind } from '../model/types';
import { useArchStore } from '../store/useArchStore';

const EDGE_KINDS: EdgeKind[] = ['sync', 'async', 'data', 'flow'];
const field = 'w-full rounded-lg border border-white/10 bg-panel px-2 py-1.5 text-sm text-slate-100 focus:border-accent focus:outline-none';
const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400';

/**
 * Connection editor. Components are edited via the anchored context menu on the
 * node itself; this only handles a selected connection line, floating as a
 * compact card that appears on selection and reserves no space otherwise.
 */
export function Inspector() {
  const selectedEdgeId = useArchStore((s) => s.selectedEdgeId);
  const edge = useArchStore((s) => s.edges.find((e) => e.id === s.selectedEdgeId));
  const updateEdge = useArchStore((s) => s.updateEdge);
  const deleteSelected = useArchStore((s) => s.deleteSelected);
  const select = useArchStore((s) => s.select);

  if (!selectedEdgeId || !edge) return null;

  const meta = edge.data?.meta as
    | {
        contract?: string[];
        traffic?: number;
        contractVersion?: string;
        deprecated?: boolean;
        auth?: string;
        latency?: { p50?: number; p99?: number };
        errorRate?: number;
        golden?: boolean;
      }
    | undefined;

  return (
    <div className="absolute bottom-[6.25rem] left-3 right-3 z-20 rounded-2xl border border-white/10 bg-panel/90 p-3 shadow-xl backdrop-blur sm:bottom-auto sm:left-auto sm:right-3 sm:top-16 sm:w-72">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">Connection</span>
        <button
          onClick={() => select(undefined, undefined)}
          aria-label="Close"
          className="rounded p-1 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
        >
          ✕
        </button>
      </div>

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

        {meta?.contract && meta.contract.length > 0 && (
          <div>
            <label className={labelCls}>
              Contract{meta.contractVersion ? ` · ${meta.contractVersion}` : ''}
              {meta.deprecated && <span className="ml-1 rounded bg-amber-500/20 px-1 normal-case text-amber-300">deprecated</span>}
            </label>
            <ul className="space-y-0.5 rounded-lg bg-panelLight/60 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-slate-300">
              {meta.contract.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {(meta?.traffic !== undefined || meta?.auth || meta?.latency || meta?.errorRate !== undefined || meta?.golden) && (
          <div className="space-y-0.5 text-xs text-slate-400">
            {meta.golden && <p className="text-amber-300">⭐ On the golden path</p>}
            {meta.auth && <p>Auth: {meta.auth}</p>}
            {meta.traffic !== undefined && <p>Traffic: ~{meta.traffic} req/s</p>}
            {meta.latency && <p>Latency: {meta.latency.p50 !== undefined ? `p50 ${meta.latency.p50}ms` : ''}{meta.latency.p99 !== undefined ? ` · p99 ${meta.latency.p99}ms` : ''}</p>}
            {meta.errorRate !== undefined && <p>Error rate: {meta.errorRate}%</p>}
          </div>
        )}
      </div>

      <button
        onClick={deleteSelected}
        className="mt-3 w-full rounded-lg border border-red-500/30 px-2 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
      >
        Delete
      </button>
    </div>
  );
}
