import { useMemo } from 'react';
import { ViewportPortal } from '@xyflow/react';
import { useArchStore } from '../store/useArchStore';
import { computeZones } from '../model/zones';

/**
 * Translucent labeled hulls behind the tiles, grouping components by bounded
 * context or owning team. Rendered in flow coordinates via ViewportPortal so
 * they pan/zoom with the map and follow drags live.
 */
export function ZoneLayer() {
  const nodes = useArchStore((s) => s.nodes);
  const mode = useArchStore((s) => s.zones);
  const zones = useMemo(() => computeZones(nodes, mode), [nodes, mode]);
  if (zones.length === 0) return null;

  return (
    <ViewportPortal>
      {zones.map((z) => (
        <div
          key={z.name}
          style={{
            position: 'absolute',
            transform: `translate(${z.x}px, ${z.y}px)`,
            width: z.width,
            height: z.height,
            zIndex: -10,
            background: `hsl(${z.hue} 60% 55% / 0.09)`,
            border: `1.5px solid hsl(${z.hue} 60% 60% / 0.4)`,
            borderRadius: 24,
          }}
          className="pointer-events-none"
        >
          <span
            style={{ color: `hsl(${z.hue} 70% 70%)` }}
            className="absolute left-3 top-1.5 text-sm font-semibold uppercase tracking-wider opacity-80"
          >
            {z.name}
          </span>
        </div>
      ))}
    </ViewportPortal>
  );
}
