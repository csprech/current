/**
 * Variant Execution Helper
 *
 * Image and video generation nodes can request 1–4 variations per run.
 * Each variant re-runs the node's executor in full (fresh node data, its own
 * fallback pass), so results accumulate in the node's history carousel.
 * Composes with array batching: N items × M variants runs N×M generations.
 */

import { logger } from "@/utils/logger";
import { useToast } from "@/components/Toast";
import type { WorkflowNode, WorkflowNodeData } from "@/types";
import type { NodeExecutionContext } from "./types";

export const MAX_VARIANTS = 4;

const VARIANT_OUTPUT_FIELDS = {
  nanoBanana: "outputImage",
  generateVideo: "outputVideo",
} as const;

type VariantNodeType = keyof typeof VARIANT_OUTPUT_FIELDS;

/** Clamped variants-per-run for a node; 1 for types without variant support. */
export function getVariantCount(node: WorkflowNode | undefined): number {
  if (!node?.type || !(node.type in VARIANT_OUTPUT_FIELDS)) return 1;
  const raw = (node.data as { variantCount?: unknown }).variantCount;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 1;
  return Math.max(1, Math.min(MAX_VARIANTS, Math.round(raw)));
}

/**
 * Run a node's executor once per requested variant.
 *
 * A variant failure does not abort the remaining variants. If every variant
 * fails the first error is rethrown; on partial failure the node is restored
 * to "complete" with the last successful output (a failed fallback pass can
 * have cleared it) and a warning toast reports the failed count.
 */
export async function runWithVariants(
  ctx: NodeExecutionContext,
  runOnce: () => Promise<void>
): Promise<void> {
  const { node, getFreshNode, updateNodeData, signal } = ctx;
  const count = getVariantCount(getFreshNode(node.id) ?? node);

  if (count <= 1) {
    await runOnce();
    return;
  }

  const outputField = VARIANT_OUTPUT_FIELDS[node.type as VariantNodeType];
  let successCount = 0;
  let firstError: unknown = null;
  let lastGoodOutput: unknown = null;

  for (let i = 0; i < count; i++) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    logger.info("node.execution", `Variant ${i + 1} of ${count}`, {
      nodeId: node.id,
      nodeType: node.type,
      variantIndex: i,
      variantTotal: count,
    });

    try {
      await runOnce();
      successCount++;
      lastGoodOutput = (getFreshNode(node.id)?.data as Record<string, unknown> | undefined)?.[outputField] ?? null;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      if (firstError === null) firstError = error;
    }
  }

  if (successCount === 0) {
    throw firstError instanceof Error ? firstError : new Error("All variants failed");
  }

  if (firstError !== null) {
    const failed = count - successCount;
    updateNodeData(node.id, {
      status: "complete",
      error: null,
      [outputField]: lastGoodOutput,
    } as Partial<WorkflowNodeData>);
    useToast
      .getState()
      .show(`${failed} of ${count} variations failed — kept ${successCount}`, "warning");
  }
}
