"use client";

import { useState, useCallback, useMemo } from "react";
import {
  BaseEdge,
  EdgeProps,
  getSmoothStepPath,
  getBezierPath,
  useReactFlow,
} from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflowStore";
import { WorkflowEdgeData } from "@/types";
import { getSharedGradientId } from "./SharedEdgeGradients";
import { getHandlePresentation, normalizeHandleType } from "@/components/nodes/nodePresentation";

interface EdgeData extends WorkflowEdgeData {
  offsetX?: number;
  offsetY?: number;
}

export function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
  data,
  sourceHandleId,
  targetHandleId,
  source,
  target,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const edgeStyle = useWorkflowStore((state) => state.edgeStyle);
  const [isDragging, setIsDragging] = useState(false);

  // Narrow selector: returns boolean, only re-renders when selection relevance changes
  const isConnectedToSelection = useWorkflowStore((state) => {
    const selectedNodes = state.nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return false;
    return selectedNodes.some((n) => n.id === source || n.id === target);
  });

  const edgeData = data as EdgeData | undefined;
  const offsetX = edgeData?.offsetX ?? 0;
  const offsetY = edgeData?.offsetY ?? 0;
  const hasPause = edgeData?.hasPause ?? false;

  // Narrow selector: only re-renders when target loading status changes.
  // Any node type that is currently executing lights up its incoming wires —
  // generators, LLMs, local action nodes, all of them set status "loading".
  const isTargetLoading = useWorkflowStore((state) => {
    const targetNode = state.nodes.find((n) => n.id === target);
    return (targetNode?.data as { status?: string } | undefined)?.status === "loading";
  });

  // Status colors are reserved for semantic states; typed edges use the Current family.
  const edgeColor = useMemo(() => {
    if (hasPause) return "var(--current-warning)";
    return getHandlePresentation(normalizeHandleType(sourceHandleId || targetHandleId)).color;
  }, [hasPause, sourceHandleId, targetHandleId]);

  // Reference shared gradient by color key + selection state
  const gradientId = useMemo(() => {
    if (edgeData?.isLoop) {
      const selectionKey = isConnectedToSelection ? "active" : "dimmed";
      return getSharedGradientId("loop", selectionKey);
    }
    if (hasPause) {
      const selectionKey = isConnectedToSelection ? "active" : "dimmed";
      return getSharedGradientId("pause", selectionKey);
    }
    const colorKey = normalizeHandleType(sourceHandleId || targetHandleId);
    const selectionKey = isConnectedToSelection ? "active" : "dimmed";
    return getSharedGradientId(colorKey, selectionKey);
  }, [edgeData?.isLoop, hasPause, sourceHandleId, targetHandleId, isConnectedToSelection]);

  // Calculate the path based on edge style
  const [edgePath, labelX, labelY] = useMemo(() => {
    // Loop edges: smooth arc that exits/enters along handle directions, bowed below nodes
    if (edgeData?.isLoop) {
      const dist = Math.sqrt((targetX - sourceX) ** 2 + (targetY - sourceY) ** 2);
      const extent = Math.max(100, dist * 0.4);
      const drop = Math.max(120, dist * 0.4);

      // Direction vectors matching handle positions
      const dir: Record<string, [number, number]> = {
        top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0],
      };
      const [sdx, sdy] = dir[sourcePosition] ?? [1, 0];
      const [tdx, tdy] = dir[targetPosition] ?? [-1, 0];

      // Follow handle direction + push arc below the nodes
      const cp1x = sourceX + sdx * extent;
      const cp1y = sourceY + sdy * extent + drop;
      const cp2x = targetX + tdx * extent;
      const cp2y = targetY + tdy * extent + drop;

      const path = `M${sourceX},${sourceY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${targetX},${targetY}`;
      // Label at bezier midpoint (t=0.5)
      const lx = 0.125 * sourceX + 0.375 * cp1x + 0.375 * cp2x + 0.125 * targetX;
      const ly = 0.125 * sourceY + 0.375 * cp1y + 0.375 * cp2y + 0.125 * targetY;
      return [path, lx, ly] as [string, number, number];
    }

    if (edgeStyle === "curved") {
      return getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.25,
      });
    } else {
      return getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 8,
        offset: offsetX,
      });
    }
  }, [edgeStyle, edgeData?.isLoop, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, offsetX]);

  // Calculate handle positions on the path segments (only for angular mode)
  const handlePositions = useMemo(() => {
    if (edgeStyle === "curved") return [];

    const handles: { x: number; y: number; direction: "horizontal" | "vertical" }[] = [];

    const midX = (sourceX + targetX) / 2 + offsetX;
    const midY = (sourceY + targetY) / 2 + offsetY;

    // Middle segment handle
    if (Math.abs(targetX - sourceX) > 50) {
      handles.push({
        x: midX,
        y: midY,
        direction: "horizontal",
      });
    }

    return handles;
  }, [edgeStyle, sourceX, sourceY, targetX, targetY, offsetX, offsetY]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, direction: "horizontal" | "vertical") => {
      e.stopPropagation();
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const startOffsetX = offsetX;
      const startOffsetY = offsetY;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        setEdges((edges) =>
          edges.map((edge) => {
            if (edge.id === id) {
              return {
                ...edge,
                data: {
                  ...edge.data,
                  offsetX: direction === "horizontal" ? startOffsetX + deltaX : startOffsetX,
                  offsetY: direction === "vertical" ? startOffsetY + deltaY : startOffsetY,
                },
              };
            }
            return edge;
          })
        );
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [id, offsetX, offsetY, setEdges]
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: `url(#${gradientId})`,
          strokeWidth: 3,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />

      {/* Animated pulse overlay while the target node executes: a soft halo
          plus dashes flowing source → target. The flow animation lives on the
          dashed path (the halo has no dasharray to animate) and disables
          under prefers-reduced-motion, leaving the static halo as the cue. */}
      {isTargetLoading && (
        <>
          {/* Outer glow — replaces blur(6px) filter for better perf on Windows */}
          <path
            d={edgePath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={20}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.06}
          />
          {/* Inner glow */}
          <path
            d={edgePath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.12}
          />
          {/* Flowing dashes — dasharray 20+30 matches the keyframe's 50 offset
              for a seamless loop */}
          <path
            className="current-connector-pulse"
            d={edgePath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="20 30"
          />
        </>
      )}

      {/* Invisible wider path for easier selection */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={15}
        stroke="transparent"
        className="react-flow__edge-interaction"
      />

      {/* Pause indicator near target connection point */}
      {hasPause && (
        <g transform={`translate(${targetX - 24}, ${targetY})`}>
          {/* Background circle */}
          <circle
            r={10}
            fill="var(--current-surface-elevated)"
            stroke={edgeColor}
            strokeWidth={2}
          />
          {/* Pause bars */}
          <rect x={-4} y={-5} width={2.5} height={10} fill={edgeColor} rx={1} />
          <rect x={1.5} y={-5} width={2.5} height={10} fill={edgeColor} rx={1} />
        </g>
      )}

      {/* Loop indicator at edge midpoint */}
      {edgeData?.isLoop && (
        <foreignObject
          x={labelX - 28}
          y={labelY - 12}
          width={56}
          height={24}
          className="pointer-events-none"
        >
          <div
            className="flex items-center justify-center gap-1 rounded-full border bg-neutral-800/90 px-2 py-0.5 text-[10px] font-medium"
            style={{ borderColor: "var(--current-blue)", color: "var(--current-blue)" }}
          >
            <span>↻</span>
            <span>{edgeData.loopCount || 3}×</span>
          </div>
        </foreignObject>
      )}

      {/* Draggable handles on segments */}
      {(selected || isDragging) &&
        handlePositions.map((handle, index) => (
          <g key={index}>
            <circle
              cx={handle.x}
              cy={handle.y}
              r={6}
              fill="white"
              stroke="var(--current-blue)"
              strokeWidth={2}
              style={{
                cursor: handle.direction === "horizontal" ? "ew-resize" : "ns-resize",
              }}
              onMouseDown={(e) => handleMouseDown(e, handle.direction)}
            />
          </g>
        ))}
    </>
  );
}
