/**
 * Flush session-cached generations to a project's generations folder.
 *
 * Media generated on an untracked canvas lives only in the session cache
 * (see generationCache). When the user later saves the canvas as a project,
 * this writes those bytes to the new generations folder so carousel history
 * survives reloads — retroactively giving the history the durability it
 * would have had if the project existed from the start.
 */

import type {
  WorkflowNode,
  NanoBananaNodeData,
  GenerateVideoNodeData,
  GenerateAudioNodeData,
} from "@/types";
import { recallGeneration, rekeyGeneration, generationCacheKey } from "./generationCache";

interface PendingSave {
  nodeId: string;
  itemId: string;
  prompt: string;
  /** save-generation body field the media goes under */
  kind: "image" | "video" | "audio";
  historyField: "imageHistory" | "videoHistory" | "audioHistory";
  media: string;
}

/**
 * Executor-minted history ids are bare timestamps; ids assigned by the save
 * API are `${snippet}_${contentHash}`. Only timestamp ids can be unsaved —
 * anything else already lives on disk (the API renames on save).
 */
const UNSAVED_ID = /^\d+$/;

function collectPending(nodes: WorkflowNode[]): PendingSave[] {
  const pending: PendingSave[] = [];

  for (const node of nodes) {
    let historyField: PendingSave["historyField"];
    let kind: PendingSave["kind"];
    if (node.type === "nanoBanana") {
      historyField = "imageHistory";
      kind = "image";
    } else if (node.type === "generateVideo") {
      historyField = "videoHistory";
      kind = "video";
    } else if (node.type === "generateAudio") {
      historyField = "audioHistory";
      kind = "audio";
    } else {
      continue;
    }

    const data = node.data as NanoBananaNodeData | GenerateVideoNodeData | GenerateAudioNodeData;
    const history = (data as Record<string, unknown>)[historyField] as
      | Array<{ id: string; prompt?: string }>
      | undefined;

    for (const item of history ?? []) {
      if (!UNSAVED_ID.test(item.id)) continue;
      const media = recallGeneration(generationCacheKey(node.id, item.id));
      // blob: URLs can't be fetched server-side; data URLs and http(s) can
      if (!media || media.startsWith("blob:")) continue;
      pending.push({
        nodeId: node.id,
        itemId: item.id,
        prompt: item.prompt ?? "",
        kind,
        historyField,
        media,
      });
    }
  }

  return pending;
}

/**
 * Write every cached, not-yet-saved history item to the generations folder.
 * The API dedupes by content hash, so re-running is idempotent. Returns how
 * many items were saved; failures are left with their timestamp ids so the
 * next project save retries them.
 */
export async function flushSessionGenerationsToFolder(
  nodes: WorkflowNode[],
  generationsPath: string,
  getNodes: () => WorkflowNode[],
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void
): Promise<number> {
  const pending = collectPending(nodes);
  let saved = 0;

  for (const item of pending) {
    try {
      const response = await fetch("/api/save-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directoryPath: generationsPath,
          [item.kind]: item.media,
          prompt: item.prompt,
          imageId: item.itemId,
          createDirectory: true,
        }),
      });
      const result = await response.json();
      if (!result.success || !result.imageId) continue;
      saved++;

      if (result.imageId !== item.itemId) {
        rekeyGeneration(
          generationCacheKey(item.nodeId, item.itemId),
          generationCacheKey(item.nodeId, result.imageId)
        );
        const fresh = getNodes().find((n) => n.id === item.nodeId);
        const history = (fresh?.data as Record<string, unknown> | undefined)?.[
          item.historyField
        ] as Array<{ id: string }> | undefined;
        if (history) {
          const entryIndex = history.findIndex((h) => h.id === item.itemId);
          if (entryIndex !== -1) {
            const updated = [...history];
            updated[entryIndex] = { ...updated[entryIndex], id: result.imageId };
            updateNodeData(item.nodeId, { [item.historyField]: updated });
          }
        }
      }
    } catch {
      // Network hiccup — the timestamp id survives, so the next save retries
    }
  }

  return saved;
}
