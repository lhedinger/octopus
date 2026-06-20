import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNode } from '../../model/mapping';
import { ComponentArt } from '../../render/ComponentArt';
import { useGeneratedImage } from '../../render/ai/useGeneratedImage';
import { useArchStore } from '../../store/useArchStore';
import { canConnect } from '../../model/relationships';
import { TILE_SIZE, TILE_PADDING } from '../../model/grid';

const LABEL_HEIGHT = 20;

export function ComponentNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { kind, label, description, attached } = data;
  const tapConnect = useArchStore((s) => s.tapConnect);
  const connectSource = useArchStore((s) => s.connectSource);
  const sourceKind = useArchStore((s) => s.nodes.find((n) => n.id === s.connectSource)?.data.kind);
  const aiImage = useGeneratedImage(kind, label, description);

  const isSource = connectSource === id;
  // While picking a connection target, highlight the ones that are valid.
  const isValidTarget =
    tapConnect && !!connectSource && !isSource && !!sourceKind && canConnect(sourceKind, kind).ok;

  // Attachments render at half a tile; free components fill a whole tile.
  const tile = attached ? TILE_SIZE / 2 : TILE_SIZE;
  const pad = attached ? 4 : TILE_PADDING;
  const labelH = attached ? 12 : LABEL_HEIGHT;
  const art = tile - pad * 2 - labelH;

  return (
    <div
      style={{ width: tile, height: tile, padding: pad }}
      className={[
        'relative flex flex-col items-center rounded-xl border-2 bg-panelLight/90 shadow-lg backdrop-blur transition',
        selected ? 'border-accent' : isValidTarget ? 'border-emerald-400' : 'border-white/10',
        isSource ? 'ring-4 ring-accent/60' : '',
        isValidTarget ? 'ring-2 ring-emerald-400/50' : '',
        tapConnect && !attached ? 'cursor-crosshair' : '',
      ].join(' ')}
    >
      {/* Connector tying an attachment up to its host. */}
      {attached && <span className="absolute -top-2.5 left-1/2 h-2.5 w-px -translate-x-1/2 bg-white/25" />}

      {!attached && <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-accent" />}
      <div style={{ width: art, height: art }} className="pointer-events-none flex items-center justify-center">
        {aiImage ? (
          <img src={aiImage} alt={`${kind} ${label}`} className="h-full w-full rounded-lg object-contain" />
        ) : (
          <ComponentArt kind={kind} name={label} description={description} size={art} />
        )}
      </div>
      <div
        style={{ height: labelH, fontSize: attached ? 8 : 11 }}
        className="flex w-full items-center justify-center truncate text-center font-semibold leading-none text-slate-100"
        title={label}
      >
        {label}
      </div>
      {!attached && <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !bg-accent" />}
    </div>
  );
}
