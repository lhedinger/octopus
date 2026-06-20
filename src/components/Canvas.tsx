import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useArchStore } from '../store/useArchStore';
import type { ComponentKind } from '../model/types';
import { TILE_SIZE, SUB_GRID } from '../model/grid';
import type { FlowNode } from '../model/mapping';
import { ComponentNode } from './nodes/ComponentNode';

const nodeTypes = { component: ComponentNode };

export const PALETTE_DRAG_TYPE = 'application/octopus-kind';

function CanvasInner() {
  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useArchStore((s) => s.nodes);
  const edges = useArchStore((s) => s.edges);
  const onNodesChange = useArchStore((s) => s.onNodesChange);
  const onEdgesChange = useArchStore((s) => s.onEdgesChange);
  const onConnect = useArchStore((s) => s.onConnect);
  const addNode = useArchStore((s) => s.addNode);
  const tapNode = useArchStore((s) => s.tapNode);
  const select = useArchStore((s) => s.select);

  const onNodeClick: NodeMouseHandler<FlowNode> = useCallback((_, node) => tapNode(node.id), [tapNode]);
  const onEdgeClick: EdgeMouseHandler = useCallback((_, edge) => select(undefined, edge.id), [select]);
  const onPaneClick = useCallback(() => select(undefined, undefined), [select]);

  // The minimap is a peripheral: it fades in when the user starts moving the
  // viewport and hides again on any tap outside it.
  const [minimapShown, setMinimapShown] = useState(false);
  const onMoveStart = useCallback(() => setMinimapShown(true), []);
  useEffect(() => {
    if (!minimapShown) return;
    // A pan is a drag (no click), so a stray click here means a real tap
    // elsewhere — anywhere but the minimap dismisses it.
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.react-flow__minimap')) setMinimapShown(false);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [minimapShown]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData(PALETTE_DRAG_TYPE) as ComponentKind;
      if (!kind) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(kind, position);
    },
    [addNode, screenToFlowPosition],
  );

  return (
    <div ref={wrapper} className="h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onMoveStart={onMoveStart}
        fitView
        fitViewOptions={{ maxZoom: 0.5 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        minZoom={0.2}
        maxZoom={2}
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
          className={`!rounded-lg !border !border-white/10 transition-opacity duration-300 ${
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

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
