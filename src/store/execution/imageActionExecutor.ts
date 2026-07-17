/**
 * Image Action Executor
 *
 * Runs a deterministic local image operation (rotate, flip, blur, adjust,
 * aspect change, composite, text) on-device via canvas. No API call, no cost.
 */

import type { ImageActionNodeData } from "@/types";
import type { NodeExecutionContext } from "./types";
import { applyImageOperation, type ImageActionOperation } from "@/utils/imageOps";

export async function executeImageAction(ctx: NodeExecutionContext): Promise<void> {
  const { node, getConnectedInputs, updateNodeData, signal } = ctx;
  const nodeData = node.data as ImageActionNodeData;

  updateNodeData(node.id, { status: "loading", error: null });

  try {
    const inputs = getConnectedInputs(node.id);

    const outputImage = await applyImageOperation(
      inputs.images,
      nodeData.operation as ImageActionOperation,
      nodeData.params
    );

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    updateNodeData(node.id, {
      outputImage,
      outputImageRef: undefined,
      status: "complete",
      error: null,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      updateNodeData(node.id, { status: "idle", error: null });
      throw error;
    }

    const message = error instanceof Error ? error.message : "Image operation failed";
    updateNodeData(node.id, { status: "error", error: message });
    throw error instanceof Error ? error : new Error(message);
  }
}
