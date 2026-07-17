import { describe, it, expect, vi, beforeEach } from "vitest";
import { runWithVariants, getVariantCount } from "../variantExecution";
import type { NodeExecutionContext } from "../types";
import type { WorkflowNode } from "@/types";

const showToast = vi.fn();
vi.mock("@/components/Toast", () => ({
  useToast: { getState: () => ({ show: showToast }) },
}));

vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function makeNode(type: string, data: Record<string, unknown> = {}): WorkflowNode {
  return { id: "gen-1", type, position: { x: 0, y: 0 }, data } as WorkflowNode;
}

function makeCtx(node: WorkflowNode): NodeExecutionContext {
  return {
    node,
    getFreshNode: vi.fn().mockImplementation(() => node),
    updateNodeData: vi.fn(),
    getConnectedInputs: vi.fn(),
    getEdges: vi.fn().mockReturnValue([]),
    getNodes: vi.fn().mockReturnValue([node]),
  } as unknown as NodeExecutionContext;
}

beforeEach(() => vi.clearAllMocks());

describe("getVariantCount", () => {
  it("defaults to 1 and clamps to the 1-4 range", () => {
    expect(getVariantCount(makeNode("nanoBanana"))).toBe(1);
    expect(getVariantCount(makeNode("nanoBanana", { variantCount: 3 }))).toBe(3);
    expect(getVariantCount(makeNode("nanoBanana", { variantCount: 9 }))).toBe(4);
    expect(getVariantCount(makeNode("nanoBanana", { variantCount: 0 }))).toBe(1);
    expect(getVariantCount(makeNode("nanoBanana", { variantCount: NaN }))).toBe(1);
  });

  it("is always 1 for node types without variant support", () => {
    expect(getVariantCount(makeNode("llmGenerate", { variantCount: 3 }))).toBe(1);
    expect(getVariantCount(undefined)).toBe(1);
  });
});

describe("runWithVariants", () => {
  it("runs once without variant bookkeeping when count is 1", async () => {
    const node = makeNode("nanoBanana");
    const ctx = makeCtx(node);
    const runOnce = vi.fn().mockResolvedValue(undefined);

    await runWithVariants(ctx, runOnce);

    expect(runOnce).toHaveBeenCalledTimes(1);
    expect(ctx.updateNodeData).not.toHaveBeenCalled();
  });

  it("runs the executor once per variant", async () => {
    const node = makeNode("nanoBanana", { variantCount: 3 });
    const ctx = makeCtx(node);
    const runOnce = vi.fn().mockResolvedValue(undefined);

    await runWithVariants(ctx, runOnce);

    expect(runOnce).toHaveBeenCalledTimes(3);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("continues after a failed variant and restores the last good output", async () => {
    const node = makeNode("nanoBanana", { variantCount: 3 });
    const ctx = makeCtx(node);
    let call = 0;
    const runOnce = vi.fn().mockImplementation(async () => {
      call++;
      if (call === 2) throw new Error("provider hiccup");
      node.data = { ...node.data, outputImage: `image-${call}` };
    });

    await runWithVariants(ctx, runOnce);

    expect(runOnce).toHaveBeenCalledTimes(3);
    expect(ctx.updateNodeData).toHaveBeenCalledWith("gen-1", {
      status: "complete",
      error: null,
      outputImage: "image-3",
    });
    expect(showToast).toHaveBeenCalledWith("1 of 3 variations failed — kept 2", "warning");
  });

  it("throws the first error when every variant fails", async () => {
    const node = makeNode("nanoBanana", { variantCount: 2 });
    const ctx = makeCtx(node);
    const runOnce = vi
      .fn()
      .mockRejectedValueOnce(new Error("first failure"))
      .mockRejectedValueOnce(new Error("second failure"));

    await expect(runWithVariants(ctx, runOnce)).rejects.toThrow("first failure");
    expect(showToast).not.toHaveBeenCalled();
  });

  it("rethrows aborts immediately without running remaining variants", async () => {
    const node = makeNode("nanoBanana", { variantCount: 4 });
    const ctx = makeCtx(node);
    const runOnce = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));

    await expect(runWithVariants(ctx, runOnce)).rejects.toThrow("Aborted");
    expect(runOnce).toHaveBeenCalledTimes(2);
  });

  it("uses the video output field for generateVideo nodes", async () => {
    const node = makeNode("generateVideo", { variantCount: 2 });
    const ctx = makeCtx(node);
    let call = 0;
    const runOnce = vi.fn().mockImplementation(async () => {
      call++;
      if (call === 2) throw new Error("boom");
      node.data = { ...node.data, outputVideo: "video-1" };
    });

    await runWithVariants(ctx, runOnce);

    expect(ctx.updateNodeData).toHaveBeenCalledWith("gen-1", {
      status: "complete",
      error: null,
      outputVideo: "video-1",
    });
  });
});
