import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushSessionGenerationsToFolder } from "@/utils/flushSessionGenerations";
import {
  rememberGeneration,
  recallGeneration,
  generationCacheKey,
  clearGenerationCache,
} from "@/utils/generationCache";
import type { WorkflowNode } from "@/types";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function imageNode(id: string, historyIds: string[]): WorkflowNode {
  return {
    id,
    type: "nanoBanana",
    position: { x: 0, y: 0 },
    data: {
      imageHistory: historyIds.map((itemId) => ({ id: itemId, prompt: `prompt for ${itemId}` })),
    },
  } as unknown as WorkflowNode;
}

describe("flushSessionGenerationsToFolder", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    clearGenerationCache();
  });

  it("saves cached timestamp-id items and skips disk-named or uncached ones", async () => {
    const nodes = [imageNode("gen-1", ["1700000000001", "sunset_abc123", "1700000000002"])];
    // 001 is cached (unsaved this session); 002 is not (pre-reload history)
    rememberGeneration(generationCacheKey("gen-1", "1700000000001"), "data:image/png;base64,AAA");

    mockFetch.mockResolvedValue({
      json: async () => ({ success: true, imageId: "prompt_for_hash1" }),
    });

    const saved = await flushSessionGenerationsToFolder(nodes, "/proj/generations", () => nodes, vi.fn());

    expect(saved).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body).toMatchObject({
      directoryPath: "/proj/generations",
      image: "data:image/png;base64,AAA",
      imageId: "1700000000001",
      createDirectory: true,
    });
  });

  it("renames the history entry and cache key when the API assigns a disk id", async () => {
    const nodes = [imageNode("gen-1", ["1700000000001"])];
    rememberGeneration(generationCacheKey("gen-1", "1700000000001"), "data:image/png;base64,AAA");
    mockFetch.mockResolvedValue({
      json: async () => ({ success: true, imageId: "prompt_hash9" }),
    });
    const updateNodeData = vi.fn();

    await flushSessionGenerationsToFolder(nodes, "/proj/generations", () => nodes, updateNodeData);

    expect(updateNodeData).toHaveBeenCalledWith("gen-1", {
      imageHistory: [{ id: "prompt_hash9", prompt: "prompt for 1700000000001" }],
    });
    expect(recallGeneration(generationCacheKey("gen-1", "1700000000001"))).toBeNull();
    expect(recallGeneration(generationCacheKey("gen-1", "prompt_hash9"))).toBe("data:image/png;base64,AAA");
  });

  it("uses the video field for video nodes and skips blob URLs", async () => {
    const nodes: WorkflowNode[] = [
      {
        id: "vid-1",
        type: "generateVideo",
        position: { x: 0, y: 0 },
        data: {
          videoHistory: [
            { id: "1700000000005", prompt: "surf" },
            { id: "1700000000006", prompt: "unreachable" },
          ],
        },
      } as unknown as WorkflowNode,
    ];
    rememberGeneration(generationCacheKey("vid-1", "1700000000005"), "https://cdn.example/clip.mp4");
    rememberGeneration(generationCacheKey("vid-1", "1700000000006"), "blob:http://localhost/dead");
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, imageId: "surf_hash" }) });

    const saved = await flushSessionGenerationsToFolder(nodes, "/proj/generations", () => nodes, vi.fn());

    expect(saved).toBe(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.video).toBe("https://cdn.example/clip.mp4");
    expect(body.image).toBeUndefined();
  });

  it("leaves the timestamp id in place when the save fails, so a later save retries", async () => {
    const nodes = [imageNode("gen-1", ["1700000000001"])];
    rememberGeneration(generationCacheKey("gen-1", "1700000000001"), "data:image/png;base64,AAA");
    mockFetch.mockRejectedValue(new TypeError("network down"));
    const updateNodeData = vi.fn();

    const saved = await flushSessionGenerationsToFolder(nodes, "/proj/generations", () => nodes, updateNodeData);

    expect(saved).toBe(0);
    expect(updateNodeData).not.toHaveBeenCalled();
    expect(recallGeneration(generationCacheKey("gen-1", "1700000000001"))).toBe("data:image/png;base64,AAA");
  });
});
