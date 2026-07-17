"use client";

import { useState, useMemo } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { calculatePredictedCost, formatCost } from "@/utils/costCalculator";
import { CostDialog } from "./CostDialog";

export function CostIndicator() {
  const [showDialog, setShowDialog] = useState(false);
  const nodes = useWorkflowStore((state) => state.nodes);
  const incurredCost = useWorkflowStore((state) => state.incurredCost);

  const predictedCost = useMemo(() => {
    return calculatePredictedCost(nodes);
  }, [nodes]);

  const hasAnyNodes = predictedCost.nodeCount > 0;

  if (!hasAnyNodes && incurredCost === 0) {
    return null;
  }

  // Show the total of priced models; a trailing "+" marks unpriced generations
  const unknown = predictedCost.unknownPricingCount;
  const displayCost = `${formatCost(predictedCost.totalCost)}${unknown > 0 ? "+" : ""}`;
  const title =
    unknown > 0
      ? `Estimated cost of priced models — ${unknown} generation${unknown === 1 ? "" : "s"} without pricing data`
      : "View cost details";

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="px-2 py-0.5 rounded text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
        title={title}
      >
        {displayCost}
      </button>

      {showDialog && (
        <CostDialog
          predictedCost={predictedCost}
          incurredCost={incurredCost}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  );
}
