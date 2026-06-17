import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNode } from '../../model/mapping';
import { ComponentArt } from '../../render/ComponentArt';
import { useGeneratedImage } from '../../render/ai/useGeneratedImage';
import { useArchStore } from '../../store/useArchStore';

export function ComponentNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { kind, label, description } = data;
  const tapConnect = useArchStore((s) => s.tapConnect);
  const connectSource = useArchStore((s) => s.connectSource);
  const aiImage = useGeneratedImage(kind, label, description);

  const isSource = connectSource === id;

  return (
    <div
      className={[
        'flex w-28 flex-col items-center rounded-2xl border-2 bg-panelLight/90 px-2 pb-2 pt-1 shadow-lg backdrop-blur transition',
        selected ? 'border-accent' : 'border-white/10',
        isSource ? 'ring-4 ring-accent/60' : '',
        tapConnect ? 'cursor-crosshair' : '',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-accent" />
      <div className="pointer-events-none flex h-24 w-24 items-center justify-center">
        {aiImage ? (
          <img src={aiImage} alt={`${kind} ${label}`} className="h-24 w-24 rounded-xl object-contain" />
        ) : (
          <ComponentArt kind={kind} name={label} description={description} size={96} />
        )}
      </div>
      <div className="w-full truncate text-center text-xs font-semibold text-slate-100" title={label}>
        {label}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !bg-accent" />
    </div>
  );
}
