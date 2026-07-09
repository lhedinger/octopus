import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type CoordinateExtent,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useArchStore } from '../store/useArchStore';
import { canConnect } from '../model/relationships';
import { TILE_SIZE } from '../model/grid';
import { BADGE_KINDS, lensMetric } from '../model/facets';
import type { FlowNode } from '../model/mapping';
import { ComponentNode } from './nodes/ComponentNode';

const nodeTypes = { component: ComponentNode };

const MAX_ZOOM = 6;
const MIN_ZOOM = 0.2;
// A component's interior is a finite, bounded world (compact — a few components).
const WORLD = 600;
const WORLD_MARGIN = 60;
const NESTED_EXTENT: CoordinateExtent = [
  [-WORLD_MARGIN, -WORLD_MARGIN],
  [WORLD + WORLD_MARGIN, WORLD + WORLD_MARGIN],
];
// Crossing happens when the component (entering) or the interior world (exiting)
// fills this fraction of the screen. The entry fill matches ENTER exactly so the
// grid lines coincide across the boundary. The exit band (EXIT_FILL..
// CHILD_START_FILL) mirrors the entry band (FADE_START..ENTER_FILL) so exits
// dissolve just like entries, and the gap gives generous hysteresis.
const ENTER_FILL = 0.7;
const CHILD_START_FILL = 0.7;
const EXIT_FILL = 0.4;
const ENTER_ZOOM_MIN = 2.5;
const FADE_START = 0.4;

// Fractal background grid: scales a constant factor (WORLD/TILE = TILE/SUB = 5)
// apart, so every line coincides with one a level up/down. Each layer's opacity
// follows its on-screen spacing, so the grid overlaps perfectly across drill
// levels and stays continuous as you zoom.
const GRID_SCALES = [24 / 5, 24, 120, 600, 3000];
const GRID_DENSE_PX = 6;
const GRID_RAMP_PX = 140;
const GRID_MAX_OP = 0.6;

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
  const depth = useArchStore((s) => s.path.length);
  const lens = useArchStore((s) => s.lens);
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
  const navigating = useRef(false);
  const fadeRaf = useRef<number>();

  // Tween the fresh layer from transparent to opaque so a newly entered/exited
  // level visibly fades in (rather than popping from the leftover fade-out value).
  const fadeLayerIn = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (fadeRaf.current) cancelAnimationFrame(fadeRaf.current);
    const DURATION = 220;
    const start = performance.now();
    el.style.setProperty('--layer-opacity', '0');
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - (1 - t) * (1 - t); // ease-out quad
      el.style.setProperty('--layer-opacity', String(eased));
      if (t < 1) fadeRaf.current = requestAnimationFrame(step);
      else fadeRaf.current = undefined;
    };
    fadeRaf.current = requestAnimationFrame(step);
  }, []);

  // Set each fractal grid layer's opacity from its on-screen spacing at this zoom.
  const applyGridOpacity = useCallback((zoomLevel: number) => {
    const el = wrapperRef.current;
    if (!el) return;
    for (let i = 0; i < GRID_SCALES.length; i++) {
      const spacing = GRID_SCALES[i] * zoomLevel;
      const op = Math.max(0, Math.min(1, (spacing - GRID_DENSE_PX) / GRID_RAMP_PX)) * GRID_MAX_OP;
      el.style.setProperty(`--g${i}`, String(op));
    }
  }, []);

  // Drill-down + fade for a given viewport. Returns true if it navigated.
  const navFor = useCallback(
    (vp: Viewport): boolean => {
      if (navigating.current) return false;
      const el = wrapperRef.current;
      if (!el) return false;
      const { clientWidth: W, clientHeight: H } = el;
      const minDim = Math.min(W, H);
      const z = vp.zoom;
      const { path, enter, exitTo } = useArchStore.getState();

      // Inside a level: exit once the interior world shrinks past the boundary,
      // and fade the interior out as it approaches — mirroring the entry fade so
      // exits read as a dissolve, not a snap. Above the band the interior stays
      // fully opaque and falls through, so a centred child can still be entered.
      if (path.length > 0) {
        const worldFill = (WORLD * z) / minDim;
        if (worldFill <= EXIT_FILL) {
          navigating.current = true;
          exitTo(path.length - 1);
          return true;
        }
        if (worldFill < CHILD_START_FILL) {
          const p = Math.min(1, (CHILD_START_FILL - worldFill) / (CHILD_START_FILL - EXIT_FILL));
          el.style.setProperty('--layer-opacity', String(1 - p));
          return false;
        }
      }

      // Which top-level component is nearest the screen centre, and how much it
      // fills. Nearest-within-a-tile rather than strict containment: in a
      // bounded interior the pan extent can clamp the zoom's focal point, so
      // the tile being zoomed into may sit slightly off-centre.
      const cx = (W / 2 - vp.x) / z;
      const cy = (H / 2 - vp.y) / z;
      const target = getNodes()
        .filter((n) => !n.parentId && n.type === 'component')
        .map((n) => ({ n, d: Math.hypot(cx - (n.position.x + TILE_SIZE / 2), cy - (n.position.y + TILE_SIZE / 2)) }))
        .filter((e) => e.d < TILE_SIZE)
        .sort((a, b) => a.d - b.d)[0]?.n;
      const fill = target ? (TILE_SIZE * z) / minDim : 0;

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
      applyGridOpacity(viewport.zoom);
      navFor(viewport);
    },
    [navFor, applyGridOpacity],
  );

  // --- One-thumb double-tap-and-drag zoom (Google-Maps style) ---
  const down = useRef<{ t: number; x: number; y: number; sel0?: string } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number; sel0?: string } | null>(null);
  const zoom = useRef<null | { startClientY: number; startZoom: number; fx: number; fy: number; flowX: number; flowY: number }>(null);

  const DOUBLE_TAP_MS = 320;
  const TAP_MAX_MS = 250;
  const TAP_MAX_MOVE = 12;
  const DOUBLE_TAP_DIST = 28;
  const ZOOM_PER_PX = 1 / 220;

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
    applyGridOpacity(newZoom);
    if (navFor(vp)) endZoom();
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

    down.current = { t: now, x: e.clientX, y: e.clientY, sel0: useArchStore.getState().selectedNodeId };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    const quick = performance.now() - d.t < TAP_MAX_MS && Math.hypot(e.clientX - d.x, e.clientY - d.y) < TAP_MAX_MOVE;
    lastTap.current = quick ? { t: performance.now(), x: e.clientX, y: e.clientY, sel0: d.sel0 } : null;
  };

  // After any navigation, place the camera so the crossing stays seamless.
  // useLayoutEffect so the fresh layer is set transparent *before* paint (no
  // flash of the leftover fade-out value), then tweened in.
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    // Hide the fresh layer before it paints; fadeLayerIn() tweens it up below.
    el?.style.setProperty('--layer-opacity', '0');
    const W = el?.clientWidth ?? 0;
    const H = el?.clientHeight ?? 0;
    const minDim = Math.min(W, H);
    const { focusNodeId, path } = useArchStore.getState();
    let landingZoom = 0.5;

    if (focusNodeId) {
      // Exited: land on the component we came out of, at the boundary scale, so
      // it continues from the interior filling the screen.
      const node = getNodes().find((n) => n.id === focusNodeId);
      if (node) {
        const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (EXIT_FILL * minDim) / TILE_SIZE));
        const cx = node.position.x + TILE_SIZE / 2;
        const cy = node.position.y + TILE_SIZE / 2;
        setViewport({ x: W / 2 - cx * z, y: H / 2 - cy * z, zoom: z });
        landingZoom = z;
      } else {
        fitView({ maxZoom: 0.5, duration: 250 });
      }
    } else if (path.length > 0) {
      // Entered: open the interior world at the matching scale, centred.
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (CHILD_START_FILL * minDim) / WORLD));
      const c = WORLD / 2;
      setViewport({ x: W / 2 - c * z, y: H / 2 - c * z, zoom: z });
      landingZoom = z;
    } else if (getNodes().length > 0) {
      fitView({ maxZoom: 0.5, duration: 300 });
    } else {
      setViewport({ x: W / 2 - TILE_SIZE, y: H / 2 - TILE_SIZE, zoom: 0.5 }, { duration: 300 });
    }

    applyGridOpacity(landingZoom);
    fadeLayerIn();
    const t = setTimeout(() => {
      navigating.current = false;
    }, 400);
    return () => {
      clearTimeout(t);
      if (fadeRaf.current) cancelAnimationFrame(fadeRaf.current);
    };
  }, [navVersion, fitView, setViewport, getNodes, applyGridOpacity, fadeLayerIn]);

  // Initialise the grid opacity for the starting viewport.
  useEffect(() => {
    applyGridOpacity(getViewport().zoom);
  }, [applyGridOpacity, getViewport]);

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
        // Inside a component, panning is bounded to that component's world.
        translateExtent={depth > 0 ? NESTED_EXTENT : undefined}
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
        {GRID_SCALES.map((gap, i) => (
          <Background key={gap} id={`grid${i}`} className={`gridlayer g${i}`} variant={BackgroundVariant.Lines} gap={gap} lineWidth={1} color="#3a4a63" />
        ))}
        <MiniMap
          pannable
          zoomable
          style={{ width: 150, height: 96 }}
          className={`!m-0 !right-3 !top-14 !bottom-auto sm:!top-auto sm:!bottom-3 !rounded-lg !border !border-white/10 transition-opacity duration-300 ${
            minimapShown ? 'opacity-80' : 'pointer-events-none opacity-0'
          }`}
          bgColor="#0f172a"
          maskColor="rgba(15,23,42,0.6)"
          // Under an active lens, the minimap mirrors the tile tinting.
          nodeColor={(n) =>
            (BADGE_KINDS.includes((n as FlowNode).data?.kind) ? lensMetric(lens, (n as FlowNode).data?.meta)?.color : undefined) ??
            '#38bdf8'
          }
          nodeStrokeColor="#1e293b"
        />
      </ReactFlow>
    </div>
  );
}
