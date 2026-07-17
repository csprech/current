/**
 * Video Action Executor
 *
 * Runs a deterministic local video operation (reverse, speed, boomerang,
 * mute) on-device via WebCodecs. No API call, no cost.
 */

import type { VideoActionNodeData } from "@/types";
import { revokeBlobUrl } from "@/store/utils/executionUtils";
import type { NodeExecutionContext } from "./types";

export async function executeVideoAction(ctx: NodeExecutionContext): Promise<void> {
  const { node, getConnectedInputs, updateNodeData, getNodes, signal } = ctx;
  const nodeData = node.data as VideoActionNodeData;

  if (nodeData.encoderSupported === false) {
    updateNodeData(node.id, {
      status: "error",
      error: "Browser does not support video encoding",
      progress: 0,
    });
    throw new Error("Browser does not support video encoding");
  }

  updateNodeData(node.id, { status: "loading", progress: 0, error: null });

  try {
    const inputs = getConnectedInputs(node.id);

    if (inputs.videos.length === 0) {
      throw new Error("Connect a video input first");
    }

    const videoBlob = await fetch(inputs.videos[0]).then((r) => r.blob());

    const { applyVideoOperation } = await import("@/utils/videoOps");
    const outputBlob = await applyVideoOperation(
      videoBlob,
      nodeData.operation as import("@/utils/videoOps").VideoActionOperation,
      nodeData.params,
      (progress) => {
        updateNodeData(node.id, { progress });
      }
    );

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    // Revoke old blob URL before replacing
    const oldData = getNodes().find((n) => n.id === node.id)?.data as
      | Record<string, unknown>
      | undefined;
    revokeBlobUrl(oldData?.outputVideo as string | undefined);

    let outputVideo: string;
    if (outputBlob.size > 20 * 1024 * 1024) {
      outputVideo = URL.createObjectURL(outputBlob);
    } else {
      const reader = new FileReader();
      outputVideo = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("FileReader error while reading video action output"));
        reader.onabort = () => reject(new Error("FileReader aborted while reading video action output"));
        reader.readAsDataURL(outputBlob);
      });
    }

    updateNodeData(node.id, {
      outputVideo,
      status: "complete",
      progress: 100,
      error: null,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      updateNodeData(node.id, { status: "idle", progress: 0, error: null });
      throw error;
    }

    const message = error instanceof Error ? error.message : "Video operation failed";
    updateNodeData(node.id, { status: "error", error: message, progress: 0 });
    throw error instanceof Error ? error : new Error(message);
  }
}
