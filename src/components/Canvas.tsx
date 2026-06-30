import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const MIN_ZOOM = 0.2;
// Enter a component once it fills this fraction of the smaller screen dimension.
const ENTER_FILL = 0.7;
const ENTER_ZOOM_MIN = 2.5;
// Begin fading the current layer out once a centered component fills this much.
const FADE_START = 0.4;
// Zoom out below this inside a nested level to climb back up.
const EXIT_ZOOM = 0.24;

// One-thumb double-tap-and-drag zoom (Google-Maps style).
const DOUBLE_TAP_MS = 320;
const TAP_MAX_MS = 250;
const TAP_MAX_MOVE = 12;
const DOUBLE_TAP_DIST = 28;
const ZOOM_PER_PX = 1 / 220; // px of drag per doubling/halving of zoom

interface TapInfo {
  t: number;
  x: number;
  y: number;
  /** Selected node id *before* this tap, so we can honour "ignore unselected". */
  sel0?: string;
}

export function Canvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { getNodes, fitView, setViewport, getViewport } = useReactFlow();

  const rawNodes = useArchStore((s) => s.nodes);
  const selectedNodeId = useArchStore((s) => s.selectedNodeId);
  // Only the selected component can be dragged — so an unselected one can't be
  // moved by accident; a first tap selects it, then it becomes draggable.
  const nodes = useMemo(
    () => rawNodes.map((n) => (n.draggable === false ? n : { ...n, draggable: n.id === selectedNodeId })),
    [rawNodes, selectedNodeId],
  );
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

  const [minimapShown, setMinimapShown] = useState(false);
  // Guards re-triggering navigation during the post-navigation refit.
  const navigating = useRef(false);

  // Drill-down + fade for a given viewport. Returns true if it navigated.
  const navFor = useCallback(
    (vp: Viewport): boolean => {
      if (navigating.current) return false;
      const el = wrapperRef.current;
      if (!el) return false;
      const { clientWidth: W, clientHeight: H } = el;
      const z = vp.zoom;
      const { path, enter, exitTo } = useArchStore.getState();

      if (path.length > 0 && z <= EXIT_ZOOM) {
        navigating.current = true;
        exitTo(path.length - 1);
        return true;
      }

      const cx = (W / 2 - vp.x) / z;
      const cy = (H / 2 - vp.y) / z;
      const target = getNodes().find(
        (n) =>
          !n.parentId &&
          n.type === 'component' &&
          cx >= n.position.x &&
          cx <= n.position.x + TILE_SIZE &&
          cy >= n.position.y &&
          cy <= n.position.y + TILE_SIZE,
      );
      const fill = target ? (TILE_SIZE * z) / Math.min(W, H) : 0;

      if (target && z >= ENTER_ZOOM_MIN && fill >= ENTER_FILL) {
        navigating.current = true;
        enter(target.id);
        return true;
      }

      const p = fill <= FADE_START ? 0 : Math.min(1, (fill - FADE_START) / (ENTER_FILL - FADE_START));
      el.style.setProperty('--layer-opacity', String(1 - p));
      return false;
    },
    [getNodes],
  );

  // Pinch / scroll zoom flows through React Flow's onMove.
  const onMove = useCallback(
    (_: unknown, viewport: Viewport) => {
      setMinimapShown(true);
      navFor(viewport);
    },
    [navFor],
  );

  // --- One-thumb double-tap-and-drag zoom ---
  const down = useRef<TapInfo | null>(null);
  const lastTap = useRef<TapInfo | null>(null);
  const zoom = useRef<null | { startClientY: number; startZoom: number; fx: number; fy: number; flowX: number; flowY: number }>(null);

  const endZoom = () => {
    window.removeEventListener('pointermove', onZoomMove);
    window.removeEventListener('pointerup', onZoomEnd);
    window.removeEventListener('pointercancel', onZoomEnd);
    zoom.current = null;
  };

  const onZoomMove = (e: PointerEvent) => {
    const g = zoom.current;
    if (!g) return;
    const dy = g.startClientY - e.clientY; // up => zoom in
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, g.startZoom * Math.pow(2, dy * ZOOM_PER_PX)));
    const vp = { x: g.fx - g.flowX * newZoom, y: g.fy - g.flowY * newZoom, zoom: newZoom };
    setViewport(vp);
    setMinimapShown(true);
    if (navFor(vp)) endZoom(); // a level change ends the gesture
  };

  const onZoomEnd = () => endZoom();

  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const now = performance.now();
    const prev = lastTap.current;
    const isDouble = !!prev && now - prev.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < DOUBLE_TAP_DIST;

    if (isDouble) {
      const nodeEl = (e.target as HTMLElement).closest('.react-flow__node') as HTMLElement | null;
      const nodeId = nodeEl?.getAttribute('data-id') ?? undefined;
      // Ignore when the gesture begins on a component that wasn't selected before it started.
      if (nodeEl && nodeId !== prev!.sel0) {
        lastTap.current = null;
        down.current = null;
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const vp = getViewport();
      const rect = wrapperRef.current!.getBoundingClientRect();
      const fx = e.clientX - rect.left;
      const fy = e.clientY - rect.top;
      zoom.current = { startClientY: e.clientY, startZoom: vp.zoom, fx, fy, flowX: (fx - vp.x) / vp.zoom, flowY: (fy - vp.y) / vp.zoom };
      lastTap.current = null;
      down.current = null;
      window.addEventListener('pointermove', onZoomMove);
      window.addEventListener('pointerup', onZoomEnd);
      window.addEventListener('pointercancel', onZoomEnd);
      return;
    }

    // First tap — remember it (with the pre-tap selection) for double-tap detection.
    down.current = { t: now, x: e.clientX, y: e.clientY, sel0: useArchStore.getState().selectedNodeId };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    const quick = performance.now() - d.t < TAP_MAX_MS && Math.hypot(e.clientX - d.x, e.clientY - d.y) < TAP_MAX_MOVE;
    lastTap.current = quick ? { t: performance.now(), x: e.clientX, y: e.clientY, sel0: d.sel0 } : null;
  };

  // After any navigation, frame the new level and fade the new layer in.
  useEffect(() => {
    const el = wrapperRef.current;
    el?.style.setProperty('--layer-opacity', '1');
    const W = el?.clientWidth ?? 0;
    const Hh = el?.clientHeight ?? 0;
    const focusId = useArchStore.getState().focusNodeId;
    const focus = focusId ? getNodes().find((n) => n.id === focusId) : undefined;

    if (focus) {
      // Stepped out of a component: land centred on it at a comfortable size,
      // so it reads as backing out of the box rather than jumping far away.
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (0.4 * Math.min(W, Hh)) / TILE_SIZE));
      const cx = focus.position.x + TILE_SIZE / 2;
      const cy = focus.position.y + TILE_SIZE / 2;
      setViewport({ x: W / 2 - cx * z, y: Hh / 2 - cy * z, zoom: z }, { duration: 300 });
    } else if (getNodes().length > 0) {
      fitView({ maxZoom: 0.5, duration: 300 });
    } else {
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
    <div ref={wrapperRef} className="h-full w-full" onPointerDownCapture={onPointerDownCapture} onPointerUp={onPointerUp}>
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
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        proOptions={{ hideAttribution: true }}
        zoomOnPinch
        zoomOnScroll
        zoomOnDoubleClick={false}
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
