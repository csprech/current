"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useWorkflowStore } from "@/store/workflowStore";
import { useMediaViewerStore } from "@/store/mediaViewerStore";
import { formatCost, estimateNodeRunCost } from "@/utils/costCalculator";
import { downloadMedia } from "@/utils/downloadMedia";
import type {
  CarouselImageItem,
  CarouselVideoItem,
  NanoBananaNodeData,
  GenerateVideoNodeData,
  WorkflowNode,
} from "@/types";

type ViewerMediaType = "image" | "video";

interface HistoryEntry {
  id: string;
  timestamp: number;
  prompt: string;
  model: string;
}

/** Session cache of loaded history media, keyed by `${nodeId}:${itemId}`. */
const mediaCache = new Map<string, string>();

async function loadHistoryMedia(
  generationsPath: string | null,
  cacheKey: string,
  itemId: string
): Promise<string | null> {
  const cached = mediaCache.get(cacheKey);
  if (cached) return cached;
  if (!generationsPath) return null;

  try {
    const response = await fetch("/api/load-generation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ directoryPath: generationsPath, imageId: itemId }),
    });
    const result = await response.json();
    if (!result.success) return null;
    const media = result.video || result.image || null;
    if (media) mediaCache.set(cacheKey, media);
    return media;
  } catch {
    return null;
  }
}

function viewerConfig(node: WorkflowNode): {
  mediaType: ViewerMediaType;
  history: HistoryEntry[];
  committedIndex: number;
  committedMedia: string | null;
} | null {
  if (node.type === "nanoBanana") {
    const data = node.data as NanoBananaNodeData;
    return {
      mediaType: "image",
      history: ((data.imageHistory || []) as CarouselImageItem[]).map((h) => ({
        id: h.id,
        timestamp: h.timestamp,
        prompt: h.prompt,
        model: h.model,
      })),
      committedIndex: data.selectedHistoryIndex || 0,
      committedMedia: data.outputImage,
    };
  }
  if (node.type === "generateVideo") {
    const data = node.data as GenerateVideoNodeData;
    return {
      mediaType: "video",
      history: ((data.videoHistory || []) as CarouselVideoItem[]).map((h) => ({
        id: h.id,
        timestamp: h.timestamp,
        prompt: h.prompt,
        model: h.model,
      })),
      committedIndex: data.selectedVideoHistoryIndex || 0,
      committedMedia: data.outputVideo ?? null,
    };
  }
  return null;
}

function ImageThumb({
  cacheKey,
  itemId,
  generationsPath,
  seed,
}: {
  cacheKey: string;
  itemId: string;
  generationsPath: string | null;
  seed: string | null;
}) {
  const [src, setSrc] = useState<string | null>(mediaCache.get(cacheKey) ?? seed);

  useEffect(() => {
    if (src) {
      if (!mediaCache.has(cacheKey)) mediaCache.set(cacheKey, src);
      return;
    }
    let cancelled = false;
    loadHistoryMedia(generationsPath, cacheKey, itemId).then((media) => {
      if (!cancelled && media) setSrc(media);
    });
    return () => {
      cancelled = true;
    };
  }, [src, cacheKey, itemId, generationsPath]);

  if (!src) {
    return <div className="current-viewer__thumb-placeholder" aria-hidden="true" />;
  }
  return <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />;
}

export function NodeMediaViewerModal() {
  const viewerNodeId = useMediaViewerStore((state) => state.nodeId);
  const close = useMediaViewerStore((state) => state.close);
  const node = useWorkflowStore((state) =>
    viewerNodeId ? state.nodes.find((n) => n.id === viewerNodeId) : undefined
  );
  const generationsPath = useWorkflowStore((state) => state.generationsPath);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const addNode = useWorkflowStore((state) => state.addNode);

  const config = node ? viewerConfig(node) : null;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const historyLength = config?.history.length ?? 0;

  // Reset local selection each time the viewer opens on a node
  useEffect(() => {
    if (!viewerNodeId) return;
    const freshNode = useWorkflowStore.getState().nodes.find((n) => n.id === viewerNodeId);
    const freshConfig = freshNode ? viewerConfig(freshNode) : null;
    if (!freshConfig) return;
    setSelectedIndex(Math.min(freshConfig.committedIndex, Math.max(0, freshConfig.history.length - 1)));
    // Seed the cache with the media already in memory on the node
    const committedItem = freshConfig.history[freshConfig.committedIndex];
    if (committedItem && freshConfig.committedMedia) {
      mediaCache.set(`${viewerNodeId}:${committedItem.id}`, freshConfig.committedMedia);
    }
  }, [viewerNodeId]);

  const selectedItem = config?.history[selectedIndex] ?? null;

  // Load the media for the locally selected history item
  useEffect(() => {
    if (!viewerNodeId || !selectedItem) {
      setSelectedMedia(config?.committedMedia ?? null);
      return;
    }
    const cacheKey = `${viewerNodeId}:${selectedItem.id}`;
    const cached = mediaCache.get(cacheKey);
    if (cached) {
      setSelectedMedia(cached);
      return;
    }
    let cancelled = false;
    setIsLoadingMedia(true);
    setSelectedMedia(null);
    loadHistoryMedia(generationsPath, cacheKey, selectedItem.id).then((media) => {
      if (cancelled) return;
      setIsLoadingMedia(false);
      setSelectedMedia(media);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerNodeId, selectedItem?.id, generationsPath]);

  const handleUseAsOutput = useCallback(() => {
    if (!viewerNodeId || !node || !config || !selectedItem || !selectedMedia) return;
    if (config.mediaType === "image") {
      updateNodeData(viewerNodeId, {
        outputImage: selectedMedia,
        selectedHistoryIndex: selectedIndex,
        status: "idle",
        error: null,
      });
    } else {
      updateNodeData(viewerNodeId, {
        outputVideo: selectedMedia,
        selectedVideoHistoryIndex: selectedIndex,
        status: "idle",
        error: null,
      });
    }
  }, [viewerNodeId, node, config, selectedItem, selectedMedia, selectedIndex, updateNodeData]);

  const handlePromote = useCallback(() => {
    if (!node || !config || !selectedMedia) return;
    const width = (node.measured?.width as number) || (node.style?.width as number) || 300;
    const position = { x: node.position.x + width + 80, y: node.position.y };
    if (config.mediaType === "image") {
      addNode("imageInput", position, {
        image: selectedMedia,
        filename: `history-${selectedItem?.id ?? "item"}.png`,
      });
    } else {
      addNode("videoInput", position, {
        video: selectedMedia,
        filename: `history-${selectedItem?.id ?? "item"}.mp4`,
      });
    }
    close();
  }, [node, config, selectedMedia, selectedItem, addNode, close]);

  // Keyboard: Esc closes, arrows browse, Enter commits selection
  useEffect(() => {
    if (!viewerNodeId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedIndex((i) => (historyLength === 0 ? 0 : (i + 1) % historyLength));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedIndex((i) => (historyLength === 0 ? 0 : (i - 1 + historyLength) % historyLength));
      } else if (event.key === "Enter") {
        event.preventDefault();
        handleUseAsOutput();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerNodeId, historyLength, close, handleUseAsOutput]);

  const estimatedCost = useMemo(() => (node ? estimateNodeRunCost(node) : null), [node]);

  if (!viewerNodeId || !node || !config) return null;

  const isCommitted = selectedIndex === config.committedIndex;
  const nodeData = node.data as NanoBananaNodeData | GenerateVideoNodeData;

  return createPortal(
    <div
      className="current-viewer fixed inset-0 z-[13000] flex"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      <div className="current-viewer__backdrop absolute inset-0" onClick={close} />

      <div className="relative flex flex-1 m-6 gap-4 min-h-0">
        {/* Main preview */}
        <div className="current-viewer__stage flex-1 min-w-0 flex items-center justify-center rounded-xl overflow-hidden">
          {isLoadingMedia ? (
            <svg className="w-8 h-8 animate-spin text-neutral-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : selectedMedia ? (
            config.mediaType === "image" ? (
              <img src={selectedMedia} alt="Selected generation" className="max-w-full max-h-full object-contain" />
            ) : (
              <video src={selectedMedia} controls autoPlay loop className="max-w-full max-h-full" />
            )
          ) : (
            <span className="text-neutral-500 text-sm">
              {historyLength === 0 ? "No generations yet — run the node first" : "Media unavailable"}
            </span>
          )}
        </div>

        {/* Side rail: metadata + actions + history grid */}
        <div className="current-viewer__rail w-72 shrink-0 flex flex-col gap-3 rounded-xl p-3 min-h-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-100 truncate">
                {(nodeData.customTitle || (config.mediaType === "image" ? "Generate Image" : "Generate Video"))}
              </div>
              <div className="text-[11px] text-neutral-400 truncate">
                {selectedItem?.model || nodeData.selectedModel?.displayName || ""}
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close viewer"
              className="current-media-action shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {selectedItem && (
            <dl className="current-viewer__meta text-[11px] space-y-1.5">
              {selectedItem.prompt && (
                <div>
                  <dt className="text-neutral-500">Prompt</dt>
                  <dd className="text-neutral-200 max-h-24 overflow-y-auto whitespace-pre-wrap break-words">
                    {selectedItem.prompt}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Generated</dt>
                <dd className="text-neutral-200">{new Date(selectedItem.timestamp).toLocaleString()}</dd>
              </div>
              {estimatedCost !== null && (
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Est. cost / run</dt>
                  <dd className="text-neutral-200">{formatCost(estimatedCost)}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              disabled={!selectedMedia || isCommitted}
              onClick={handleUseAsOutput}
              className="current-viewer__action current-viewer__action--primary"
            >
              {isCommitted ? "Current node output" : "Use as node output"}
            </button>
            <button
              type="button"
              disabled={!selectedMedia}
              onClick={handlePromote}
              className="current-viewer__action"
            >
              Promote to input node
            </button>
            <button
              type="button"
              disabled={!selectedMedia}
              onClick={() =>
                selectedMedia && downloadMedia(selectedMedia, config.mediaType).catch(() => {})
              }
              className="current-viewer__action"
            >
              Download
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="text-[11px] text-neutral-500 mb-1.5">
              History ({historyLength})
            </div>
            <div className="grid grid-cols-3 gap-1.5" role="listbox" aria-label="Generation history">
              {config.history.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => setSelectedIndex(index)}
                  className={`current-viewer__thumb ${index === selectedIndex ? "current-viewer__thumb--selected" : ""}`}
                  title={item.prompt || new Date(item.timestamp).toLocaleString()}
                >
                  {config.mediaType === "image" ? (
                    <ImageThumb
                      cacheKey={`${viewerNodeId}:${item.id}`}
                      itemId={item.id}
                      generationsPath={generationsPath}
                      seed={index === config.committedIndex ? config.committedMedia : null}
                    />
                  ) : (
                    <span className="current-viewer__thumb-video">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span className="text-[9px]">{index + 1}</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
