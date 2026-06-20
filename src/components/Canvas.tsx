import { useCallback, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
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
import { GRID_SIZE } from '../model/grid';
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
        fitView
        proOptions={{ hideAttribution: true }}
        zoomOnPinch
        panOnScroll
        selectionOnDrag
        snapToGrid
        snapGrid={[GRID_SIZE, GRID_SIZE]}
      >
        <Background variant={BackgroundVariant.Lines} gap={GRID_SIZE} lineWidth={1} color="#1e293b" />
        <Background variant={BackgroundVariant.Lines} gap={GRID_SIZE * 5} lineWidth={1} color="#293548" />
        <Controls className="!bg-panelLight !text-slate-200" />
        <MiniMap
          pannable
          zoomable
          className="!hidden sm:!block"
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
