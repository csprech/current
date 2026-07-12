"use client";

import { CurrentPanel } from "@/components/current/CurrentPanel";
import { useWorkflowStore } from "@/store/workflowStore";
import { NODE_CATALOG_BY_TYPE } from "./nodeCatalog";
import type { NodeType } from "@/types";

export function ActivityPanel({ onClose }: { onClose: () => void }) {
  const nodes = useWorkflowStore((state) => state.nodes);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const currentNodeIds = useWorkflowStore((state) => state.currentNodeIds);
  const skippedNodeIds = useWorkflowStore((state) => state.skippedNodeIds);

  const rows = nodes.map((node) => {
    const data = node.data as Record<string, unknown>;
    const current = currentNodeIds.includes(node.id);
    const skipped = skippedNodeIds.has(node.id);
    const error = typeof data.error === "string" && data.error ? data.error : null;
    const progress = typeof data.progress === "number" ? Math.round(data.progress) : null;
    const complete = Boolean(data.outputImage || data.outputVideo || data.outputAudio || data.outputText || data.image || data.video || data.audio)
      || (Array.isArray(data.images) && data.images.length > 0)
      || (Array.isArray(data.videos) && data.videos.length > 0);
    const status = error ? "Error" : skipped ? "Skipped" : current || data.isLoading ? "Running" : complete ? "Complete" : isRunning ? "Waiting" : "Ready";
    return {
      id: node.id,
      label: data.customTitle as string || NODE_CATALOG_BY_TYPE.get(node.type as NodeType)?.label || node.type || "Node",
      status,
      progress,
      error,
      priority: status === "Running" ? 0 : status === "Waiting" ? 1 : 2,
    };
  }).sort((a, b) => a.priority - b.priority);

  return (
    <CurrentPanel side="right" title="Activity" onClose={onClose}>
      <div className="current-activity" aria-live="polite">
        {rows.length === 0 ? <p className="current-empty-state">No workflow activity yet.</p> : rows.map((row) => (
          <div className="current-activity__row" key={row.id}>
            <div>
              <strong>{row.label}</strong>
              {row.error && <p>{row.error}</p>}
            </div>
            <span data-status={row.status.toLowerCase()}>{row.progress !== null && row.status === "Running" ? `${row.progress}%` : row.status}</span>
          </div>
        ))}
      </div>
    </CurrentPanel>
  );
}
