"use client";

import { CurrentPanel } from "@/components/current/CurrentPanel";
import { useWorkflowStore } from "@/store/workflowStore";
import { NODE_CATALOG_BY_TYPE } from "./nodeCatalog";
import type { NodeType } from "@/types";
import { deriveNodeStatusFromData } from "@/components/nodes/nodePresentation";

export function ActivityPanel({ onClose }: { onClose: () => void }) {
  const nodes = useWorkflowStore((state) => state.nodes);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const currentNodeIds = useWorkflowStore((state) => state.currentNodeIds);
  const skippedNodeIds = useWorkflowStore((state) => state.skippedNodeIds);
  const dimmedNodeIds = useWorkflowStore((state) => state.dimmedNodeIds);
  const groups = useWorkflowStore((state) => state.groups);

  const rows = nodes.map((node) => {
    const data = node.data as Record<string, unknown>;
    const current = currentNodeIds.includes(node.id);
    const skipped = skippedNodeIds.has(node.id);
    const locked = Boolean(node.groupId && groups[node.groupId]?.locked);
    const disabled = dimmedNodeIds.has(node.id);
    const semanticStatus = deriveNodeStatusFromData(node.type as NodeType, data, {
      running: current ? true : undefined,
      skipped: skipped ? true : undefined,
      locked: locked ? true : undefined,
      disabled: disabled ? true : undefined,
    });
    const progress = typeof data.progress === "number" ? Math.round(data.progress) : null;
    const status = semanticStatus.state === "idle" && isRunning ? "Waiting" : semanticStatus.label;
    return {
      id: node.id,
      label: data.customTitle as string || NODE_CATALOG_BY_TYPE.get(node.type as NodeType)?.label || node.type || "Node",
      status,
      progress,
      error: semanticStatus.state === "error" ? semanticStatus.detail : null,
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
