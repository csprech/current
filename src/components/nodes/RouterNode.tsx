"use client";

import { memo, useMemo, useEffect } from "react";
import { CurrentHandle as Handle } from "./CurrentHandle";
import { Position, useUpdateNodeInternals, useReactFlow, NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import type { WorkflowNode, RouterNodeData } from "@/types";
import { getHandlePresentation } from "./nodePresentation";

const ALL_HANDLE_TYPES = ["image", "text", "video", "audio", "3d", "easeCurve"] as const;

const HANDLE_COLORS: Record<(typeof ALL_HANDLE_TYPES)[number], string> = {
  image: getHandlePresentation("image").color,
  text: getHandlePresentation("text").color,
  video: getHandlePresentation("video").color,
  audio: getHandlePresentation("audio").color,
  "3d": getHandlePresentation("3d").color,
  easeCurve: getHandlePresentation("easeCurve").color,
};

export const RouterNode = memo(({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const nodeData = data as RouterNodeData;
  const edges = useWorkflowStore((state) => state.edges);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const updateNodeInternals = useUpdateNodeInternals();
  const { setNodes } = useReactFlow();

  // Derive active input types from incoming edge connections
  const activeInputTypes = useMemo(() => {
    const typeSet = new Set<(typeof ALL_HANDLE_TYPES)[number]>();

    edges
      .filter((edge) => edge.target === id)
      .forEach((edge) => {
        const handleType = edge.targetHandle;
        if (handleType && ALL_HANDLE_TYPES.includes(handleType as typeof ALL_HANDLE_TYPES[number])) {
          typeSet.add(handleType as typeof ALL_HANDLE_TYPES[number]);
        }
      });

    return Array.from(typeSet).sort();
  }, [edges, id]);

  // Show generic handles when not all types are connected
  const showGenericHandles = activeInputTypes.length < ALL_HANDLE_TYPES.length;

  // Calculate handle positioning
  const handleSpacing = 24;
  const baseOffset = 38; // Clear the header bar

  // Dynamic height based on total handle count (active + placeholder)
  const totalHandleSlots = activeInputTypes.length + (showGenericHandles ? 1 : 0);
  const lastHandleTop = baseOffset + (Math.max(totalHandleSlots, 1) - 1) * handleSpacing;
  const minHeight = lastHandleTop + 20;

  // Resize node and notify React Flow when handle count changes
  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          const currentHeight = (node.style?.height as number) || 0;
          if (currentHeight < minHeight) {
            return { ...node, style: { ...node.style, height: minHeight } };
          }
        }
        return node;
      })
    );
    updateNodeInternals(id);
  }, [activeInputTypes.length, id, minHeight, setNodes, updateNodeInternals]);

  return (
    <BaseNode
      id={id}
      selected={selected}
      nodeData={nodeData}
      nodeType="router"
      stateDetail={activeInputTypes.length > 0
        ? `${activeInputTypes.length} active route${activeInputTypes.length === 1 ? "" : "s"}`
        : "No active routes"}
      minWidth={200}
      minHeight={minHeight}
    >
      {/* Input handles (left) */}
      {activeInputTypes.map((type, index) => (
        <Handle
          key={`input-${type}`}
          type="target"
          position={Position.Left}
          id={type}
          data-handletype={type}
          style={{
            top: baseOffset + index * handleSpacing,
            backgroundColor: HANDLE_COLORS[type],
            width: 12,
            height: 12,
            border: "2px solid var(--current-surface-elevated)",
          }}
        />
      ))}
      {showGenericHandles && (
        <Handle
          type="target"
          position={Position.Left}
          id="generic-input"
          style={{
            top: baseOffset + activeInputTypes.length * handleSpacing,
            backgroundColor: getHandlePresentation("generic").color,
            width: 12,
            height: 12,
            border: "2px solid var(--current-surface-elevated)",
          }}
        />
      )}

      {/* Output handles (right) */}
      {activeInputTypes.map((type, index) => (
        <Handle
          key={`output-${type}`}
          type="source"
          position={Position.Right}
          id={type}
          data-handletype={type}
          style={{
            top: baseOffset + index * handleSpacing,
            backgroundColor: HANDLE_COLORS[type],
            width: 12,
            height: 12,
            border: "2px solid var(--current-surface-elevated)",
          }}
        />
      ))}

    </BaseNode>
  );
});

RouterNode.displayName = "RouterNode";
