import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useArchStore } from '../store/useArchStore';
import { canConnect } from '../model/relationships';
import { TILE_SIZE, SUB_GRID } from '../model/grid';
import type { FlowNode } from '../model/mapping';
import { ComponentNode } from './nodes/ComponentNode';

const nodeTypes = { component: ComponentNode };

const MAX_ZOOM = 6;
// Enter a component once it fills this fraction of the smaller screen dimension.
const ENTER_FILL = 0.7;
const ENTER_ZOOM_MIN = 2.5;
// Zoom out below this inside a nested level to climb back up.
const EXIT_ZOOM = 0.24;

export function Canvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { getNodes, fitView, setViewport } = useReactFlow();

  const nodes = useArchStore((s) => s.nodes);
  const edges = useArchStore((s) => s.edges);
  const onNodesChange = useArchStore((s) => s.onNodesChange);
  const onEdgesChange = useArchStore((s) => s.onEdgesChange);
  const onConnect = useArchStore((s) => s.onConnect);
  const tapNode = useArchStore((s) => s.tapNode);
  const select = useArchStore((s) => s.select);
  const navVersion = useArchStore((s) => s.navVersion);

  const isValidConnection = useCallback((c: { source?: string | null; target?: string | null }) => {
    const ns = useArchStore.getState().nodes;
    const s = ns.find((n) => n.id === c.source);
    const t = ns.find((n) => n.id === c.target);
    return !!s && !!t && canConnect(s.data.kind, t.data.kind).ok;
  }, []);

  const onNodeClick: NodeMouseHandler<FlowNode> = useCallback((_, node) => tapNode(node.id), [tapNode]);
  const onEdgeClick: EdgeMouseHandler = useCallback((_, edge) => select(undefined, edge.id), [select]);
  const onPaneClick = useCallback(() => select(undefined, undefined), [select]);

  // The minimap is a peripheral: it fades in while moving and hides on any tap outside it.
  const [minimapShown, setMinimapShown] = useState(false);

  // Guards re-triggering navigation during the post-navigation refit.
  const navigating = useRef(false);

  // Semantic zoom: zoom into a component to drill in, zoom out to climb up.
  const onMove = useCallback(
    (_: unknown, viewport: Viewport) => {
      setMinimapShown(true);
      if (navigating.current) return;
      const el = wrapperRef.current;
      if (!el) return;
      const { clientWidth: W, clientHeight: H } = el;
      const z = viewport.zoom;
      const { path, enter, exitTo } = useArchStore.getState();

      if (path.length > 0 && z <= EXIT_ZOOM) {
        navigating.current = true;
        exitTo(path.length - 1);
        return;
      }
      if (z >= ENTER_ZOOM_MIN && TILE_SIZE * z >= ENTER_FILL * Math.min(W, H)) {
        const cx = (W / 2 - viewport.x) / z;
        const cy = (H / 2 - viewport.y) / z;
        const target = getNodes().find(
          (n) =>
            !n.parentId &&
            n.type === 'component' &&
            cx >= n.position.x &&
            cx <= n.position.x + TILE_SIZE &&
            cy >= n.position.y &&
            cy <= n.position.y + TILE_SIZE,
        );
        if (target) {
          navigating.current = true;
          enter(target.id);
        }
      }
    },
    [getNodes],
  );

  // After any navigation, frame the new level (or center an empty one on the
  // area where tap-placed components first appear).
  useEffect(() => {
    if (getNodes().length > 0) {
      fitView({ maxZoom: 0.5, duration: 300 });
    } else {
      const el = wrapperRef.current;
      const W = el?.clientWidth ?? 0;
      const Hh = el?.clientHeight ?? 0;
      setViewport({ x: W / 2 - TILE_SIZE, y: Hh / 2 - TILE_SIZE, zoom: 0.5 }, { duration: 300 });
    }
    const t = setTimeout(() => {
      navigating.current = false;
    }, 400);
    return () => clearTimeout(t);
  }, [navVersion, fitView, setViewport, getNodes]);

  useEffect(() => {
    if (!minimapShown) return;
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.react-flow__minimap')) setMinimapShown(false);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [minimapShown]);

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onMove={onMove}
        fitView
        fitViewOptions={{ maxZoom: 0.5 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        minZoom={0.2}
        maxZoom={MAX_ZOOM}
        proOptions={{ hideAttribution: true }}
        zoomOnPinch
        zoomOnScroll
        snapToGrid
        snapGrid={[TILE_SIZE, TILE_SIZE]}
      >
        <Background id="subgrid" variant={BackgroundVariant.Lines} gap={SUB_GRID} lineWidth={1} color="#172033" />
        <Background id="tiles" variant={BackgroundVariant.Lines} gap={TILE_SIZE} lineWidth={1} color="#2b3a52" />
        <MiniMap
          pannable
          zoomable
          style={{ width: 150, height: 96 }}
          className={`!m-0 !right-3 !top-14 !bottom-auto sm:!top-auto sm:!bottom-3 !rounded-lg !border !border-white/10 transition-opacity duration-300 ${
            minimapShown ? 'opacity-80' : 'pointer-events-none opacity-0'
          }`}
          bgColor="#0f172a"
          maskColor="rgba(15,23,42,0.6)"
          nodeColor="#38bdf8"
          nodeStrokeColor="#1e293b"
        />
      </ReactFlow>
    </div>
  );
}
