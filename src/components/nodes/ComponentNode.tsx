import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNode } from '../../model/mapping';
import { ComponentArt } from '../../render/ComponentArt';
import { useGeneratedImage } from '../../render/ai/useGeneratedImage';
import { useArchStore } from '../../store/useArchStore';
import { TILE_SIZE, TILE_PADDING } from '../../model/grid';

// The whole node fills exactly one tile; the art takes the space left after
// padding and the label strip.
const LABEL_HEIGHT = 20;
const ART_SIZE = TILE_SIZE - TILE_PADDING * 2 - LABEL_HEIGHT;

export function ComponentNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { kind, label, description } = data;
  const tapConnect = useArchStore((s) => s.tapConnect);
  const connectSource = useArchStore((s) => s.connectSource);
  const aiImage = useGeneratedImage(kind, label, description);

  const isSource = connectSource === id;

  return (
    <div
      style={{ width: TILE_SIZE, height: TILE_SIZE, padding: TILE_PADDING }}
      className={[
        'flex flex-col items-center rounded-xl border-2 bg-panelLight/90 shadow-lg backdrop-blur transition',
        selected ? 'border-accent' : 'border-white/10',
        isSource ? 'ring-4 ring-accent/60' : '',
        tapConnect ? 'cursor-crosshair' : '',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-accent" />
      <div
        style={{ width: ART_SIZE, height: ART_SIZE }}
        className="pointer-events-none flex items-center justify-center"
      >
        {aiImage ? (
          <img src={aiImage} alt={`${kind} ${label}`} className="h-full w-full rounded-lg object-contain" />
        ) : (
          <ComponentArt kind={kind} name={label} description={description} size={ART_SIZE} />
        )}
      </div>
      <div
        style={{ height: LABEL_HEIGHT }}
        className="flex w-full items-center justify-center truncate text-center text-[11px] font-semibold leading-none text-slate-100"
        title={label}
      >
        {label}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !bg-accent" />
    </div>
  );
}
