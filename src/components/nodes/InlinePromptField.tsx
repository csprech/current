"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkflowStore } from "@/store/workflowStore";

interface InlinePromptFieldProps {
  nodeId: string;
  value: string | undefined;
  /** overlay: floats over the node's media area. block: participates in normal flow. */
  variant?: "overlay" | "block";
  /** Extra classes for the outer wrapper — used by overlay callers to set the bottom offset. */
  className?: string;
  placeholder?: string;
}

function isTextTargetHandle(handleId: string | null | undefined): boolean {
  return !!handleId && (handleId === "text" || handleId.startsWith("text-") || handleId.includes("prompt"));
}

/**
 * Prompt typed directly on a generation node. Connected text always takes
 * precedence — when a text edge is attached the field collapses to a
 * "Prompt linked" chip.
 */
export function InlinePromptField({
  nodeId,
  value,
  variant = "overlay",
  className = "",
  placeholder = "Describe what to generate…",
}: InlinePromptFieldProps) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const hasConnectedText = useWorkflowStore((state) =>
    state.edges.some(
      (edge) => edge.target === nodeId && !edge.data?.isLoop && isTextTargetHandle(edge.targetHandle)
    )
  );
  const [localValue, setLocalValue] = useState(value ?? "");
  const [isEditing, setIsEditing] = useState(false);

  // Sync from store when not actively editing (avoids cursor jumps)
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value ?? "");
    }
  }, [value, isEditing]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (localValue !== (value ?? "")) {
      updateNodeData(nodeId, { inlinePrompt: localValue });
    }
  }, [localValue, value, nodeId, updateNodeData]);

  const wrapperClass =
    variant === "overlay"
      ? `absolute left-1 right-1 z-10 ${className || "bottom-1"}`
      : `w-full ${className}`;

  if (hasConnectedText) {
    return (
      <div className={`${wrapperClass} pointer-events-none flex`}>
        <span
          className="current-inline-prompt__linked inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
          title="Prompt comes from a connected node. Disconnect the text edge to type a prompt here."
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          Prompt linked
        </span>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        rows={isEditing || localValue ? 2 : 1}
        placeholder={placeholder}
        aria-label="Prompt"
        className="current-inline-prompt nodrag nopan nowheel w-full px-2 py-1.5 text-[10px] leading-relaxed rounded-md resize-none focus:outline-none"
      />
    </div>
  );
}
