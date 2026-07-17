"use client";

import { useWorkflowStore } from "@/store/workflowStore";
import { MAX_VARIANTS } from "@/store/execution/variantExecution";

interface VariantCountPickerProps {
  nodeId: string;
  value: number | undefined;
}

/** Segmented 1–4 control for how many variations one run generates. */
export function VariantCountPicker({ nodeId, value }: VariantCountPickerProps) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const current = Math.max(1, Math.min(MAX_VARIANTS, Math.round(value ?? 1)));

  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] text-neutral-400 shrink-0">Variations</label>
      <div
        className="flex gap-0.5 ml-auto"
        role="radiogroup"
        aria-label="Variations per run"
        title="How many results one run generates — each lands in the node's history"
      >
        {Array.from({ length: MAX_VARIANTS }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={current === n}
            aria-label={`${n} variation${n === 1 ? "" : "s"} per run`}
            className={`current-variant-option nodrag nopan ${current === n ? "current-variant-option--active" : ""}`}
            onClick={() => updateNodeData(nodeId, { variantCount: n })}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
