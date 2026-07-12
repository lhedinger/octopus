import { useState } from 'react';
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import type { FlowNode } from '../../model/mapping';
import { ComponentArt } from '../../render/ComponentArt';
import { useGeneratedImage } from '../../render/ai/useGeneratedImage';
import { useArchStore } from '../../store/useArchStore';
import { canConnect } from '../../model/relationships';
import { STORAGE_PALETTE } from '../../model/palette';
import { TILE_SIZE, TILE_PADDING } from '../../model/grid';
import { ASPECTS, BADGE_KINDS, aspectByKey, aspectsOf, lensMetric } from '../../model/aspects';

const LABEL_HEIGHT = 20;
const iconBtn = 'flex h-8 w-8 items-center justify-center rounded-lg text-base text-slate-200 transition hover:bg-white/10';

/** RTS-style status chips on the tile: one per badge-carrying aspect. */
function FacetBadges({ meta, onOpen }: { meta?: Record<string, unknown>; onOpen: () => void }) {
  const data = aspectsOf(meta);
  return (
    <div className="nodrag absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 gap-0.5">
      {ASPECTS.filter((a) => a.badge !== false).map((a) => (
        <button
          key={a.key}
          title={a.title}
          aria-label={`${a.title} status`}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          style={{ backgroundColor: a.color(data[a.key]) }}
          className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] leading-none shadow ring-1 ring-black/40 transition hover:scale-125"
        >
          {a.icon}
        </button>
      ))}
    </div>
  );
}

/** Anchored card with the details behind the badges. */
function FacetFactsCard({ meta, onClose }: { meta?: Record<string, unknown>; onClose: () => void }) {
  const data = aspectsOf(meta);
  // Badge aspects always show; lens-only aspects (health, drift) only with data.
  const sections = ASPECTS.filter((a) => a.badge !== false || data[a.key]).map((a) => ({
    key: a.key,
    title: `${a.icon} ${a.title}`,
    headline: a.headline(data[a.key]),
    items: data[a.key]?.items,
  }));
  return (
    <div className="nodrag w-56 rounded-xl border border-white/10 bg-panel/95 p-2 text-left shadow-xl backdrop-blur">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">Component facts</span>
        <button onClick={onClose} aria-label="Close facts" className="rounded px-1 text-slate-400 hover:bg-white/10 hover:text-slate-100">✕</button>
      </div>
      <div className="space-y-1.5">
        {sections.map((s) => (
          <div key={s.key}>
            <div className="flex items-baseline justify-between text-xs text-slate-200">
              <span>{s.title}</span>
              <span className="font-semibold">{s.headline}</span>
            </div>
            {s.items && s.items.length > 0 && (
              s.key === 'build' ? (
                // The pipeline reads as a mini-flow: stage → stage → stage.
                <div className="mt-1 flex flex-wrap items-center gap-0.5 text-[10px] leading-tight text-slate-300">
                  {s.items.map((i, idx) => (
                    <span key={i} className="flex items-center gap-0.5">
                      {idx > 0 && <span className="text-accent">→</span>}
                      <span className="rounded bg-panelLight px-1 py-0.5">{i}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <ul className="mt-0.5 space-y-0.5 pl-4 text-[11px] leading-tight text-slate-400">
                  {s.items.map((i) => (
                    <li key={i} className="list-disc">{i}</li>
                  ))}
                </ul>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComponentNode({ id, data }: NodeProps<FlowNode>) {
  const { kind, label, description, attached, fixed, meta } = data;
  const tapConnect = useArchStore((s) => s.tapConnect);
  const connectSource = useArchStore((s) => s.connectSource);
  const sourceKind = useArchStore((s) => s.nodes.find((n) => n.id === s.connectSource)?.data.kind);
  const selected = useArchStore((s) => s.selectedNodeId === id);
  const lens = useArchStore((s) => s.lens);
  const env = useArchStore((s) => s.env);
  const updateNodeData = useArchStore((s) => s.updateNodeData);
  const addStorage = useArchStore((s) => s.addStorage);
  const deleteNode = useArchStore((s) => s.deleteNode);
  const aiImage = useGeneratedImage(kind, label, description);

  const [renaming, setRenaming] = useState(false);
  const [panel, setPanel] = useState<'none' | 'storage' | 'details'>('none');
  const [factsOpen, setFactsOpen] = useState(false);

  const isSource = connectSource === id;
  const isValidTarget = tapConnect && !!connectSource && !isSource && !!sourceKind && canConnect(sourceKind, kind).ok;
  const showMenu = selected && !tapConnect;

  // Build/test/deploy state applies to codebase tiles (not storage/facets).
  const hasBadges = !attached && !fixed && BADGE_KINDS.includes(kind);
  const metric = hasBadges ? lensMetric(lens, meta) : undefined;
  const lensDimmed = lens !== 'none' && !hasBadges;

  // Health is the one always-on ambient signal (RTS unit health).
  const health = hasBadges ? aspectsOf(meta).health : undefined;

  // Environment view: stamp the deployed version, dim what isn't deployed there.
  const envs = meta?.environments as Record<string, { version?: string; status?: string }> | undefined;
  const envInfo = env !== 'none' && hasBadges ? envs?.[env] : undefined;
  const envDimmed = env !== 'none' && hasBadges && !envInfo;
  const envColor = envInfo?.status === 'degraded' ? '#fbbf24' : envInfo?.status === 'down' ? '#f87171' : '#34d399';

  // Attachments render at half a tile; free components fill a whole tile.
  const tile = attached ? TILE_SIZE / 2 : TILE_SIZE;
  const pad = attached ? 4 : TILE_PADDING;
  const labelH = attached ? 12 : LABEL_HEIGHT;
  const art = tile - pad * 2 - labelH;
  const fontSize = attached ? 8 : 11;

  return (
    <div
      style={{ width: tile, height: tile, padding: pad }}
      className={[
        'relative flex flex-col items-center rounded-xl border-2 bg-panelLight/90 shadow-lg backdrop-blur transition',
        selected ? 'border-accent' : isValidTarget ? 'border-emerald-400' : 'border-white/10',
        isSource ? 'ring-4 ring-accent/60' : '',
        isValidTarget ? 'ring-2 ring-emerald-400/50' : '',
        tapConnect && !attached ? 'cursor-crosshair' : '',
        lensDimmed || envDimmed ? 'opacity-30' : '',
      ].join(' ')}
    >
      {attached && <span className="absolute -top-2.5 left-1/2 h-2.5 w-px -translate-x-1/2 bg-white/25" />}

      {hasBadges && <FacetBadges meta={meta} onOpen={() => setFactsOpen((v) => !v)} />}

      {health?.status && (
        <span
          aria-label={`health: ${health.status}`}
          style={{ backgroundColor: aspectByKey('health')!.color(health) }}
          className="absolute -right-1 -top-1 z-10 h-3 w-3 rounded-full ring-2 ring-panel"
        />
      )}

      {envInfo && (
        <span
          style={{ backgroundColor: envColor }}
          className="pointer-events-none absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px text-[10px] font-bold leading-tight text-panel shadow"
        >
          {envInfo.version ?? '✓'}
        </span>
      )}

      {/* Active lens: colour ring + the metric stamped on the tile. */}
      {metric && (
        <>
          <span
            aria-hidden
            style={{ boxShadow: `0 0 0 3px ${metric.color}` }}
            className="pointer-events-none absolute inset-0 rounded-xl"
          />
          <span
            style={{ backgroundColor: metric.color }}
            className="pointer-events-none absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px text-[10px] font-bold leading-tight text-panel shadow"
          >
            {metric.label}
          </span>
        </>
      )}

      <NodeToolbar isVisible={hasBadges && factsOpen} position={Position.Bottom} offset={10}>
        <FacetFactsCard meta={meta} onClose={() => setFactsOpen(false)} />
      </NodeToolbar>

      <NodeToolbar isVisible={showMenu} position={Position.Top} offset={10}>
        <div className="nodrag flex flex-col gap-1 rounded-xl border border-white/10 bg-panel/90 p-1 shadow-xl backdrop-blur">
          <div className="flex gap-0.5">
            <button className={iconBtn} title="Rename" onClick={() => { setRenaming(true); setPanel('none'); }}>✎</button>
            {kind === 'microservice' && (
              <button className={`${iconBtn} ${panel === 'storage' ? '!bg-white/10 !text-accent' : ''}`} title="Add storage" onClick={() => setPanel((p) => (p === 'storage' ? 'none' : 'storage'))}>＋</button>
            )}
            <button className={`${iconBtn} ${panel === 'details' ? '!bg-white/10 !text-accent' : ''}`} title="Description" onClick={() => setPanel((p) => (p === 'details' ? 'none' : 'details'))}>☰</button>
            {!fixed && (
              <button className={`${iconBtn} hover:!bg-red-500/15 hover:!text-red-300`} title="Delete" onClick={() => deleteNode(id)}>🗑</button>
            )}
          </div>

          {panel === 'storage' && (
            <div className="flex flex-col gap-0.5 border-t border-white/10 pt-1">
              {STORAGE_PALETTE.map((s) => (
                <button key={s.kind} className="rounded-lg px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-white/10" onClick={() => addStorage(id, s.kind)}>
                  ＋ {s.label}
                </button>
              ))}
            </div>
          )}

          {panel === 'details' && (
            <div className="border-t border-white/10 pt-1">
              <textarea
                autoFocus
                value={description ?? ''}
                onChange={(e) => updateNodeData(id, { description: e.target.value })}
                placeholder={kind === 'microservice' ? 'Description (shapes the generated image)…' : 'Description…'}
                className="h-16 w-48 resize-none rounded-lg bg-panelLight px-2 py-1 text-xs text-slate-100 focus:outline-none"
              />
            </div>
          )}
        </div>
      </NodeToolbar>

      {!attached && !fixed && <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-accent" />}

      <div style={{ width: art, height: art }} className="pointer-events-none flex items-center justify-center">
        {aiImage ? (
          <img src={aiImage} alt={`${kind} ${label}`} className="h-full w-full rounded-lg object-contain" />
        ) : (
          <ComponentArt kind={kind} name={label} description={description} size={art} />
        )}
      </div>

      {renaming ? (
        <input
          autoFocus
          value={label}
          style={{ height: labelH, fontSize }}
          className="nodrag w-full rounded bg-panel px-1 text-center font-semibold text-slate-100 focus:outline-none"
          onChange={(e) => updateNodeData(id, { label: e.target.value })}
          onBlur={() => setRenaming(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setRenaming(false); }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          style={{ height: labelH, fontSize }}
          className="flex w-full items-center justify-center truncate text-center font-semibold leading-none text-slate-100"
          title={label}
        >
          {label}
        </div>
      )}

      {!attached && !fixed && <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !bg-accent" />}
    </div>
  );
}
