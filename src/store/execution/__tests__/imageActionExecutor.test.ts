import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeImageAction } from "../imageActionExecutor";
import type { NodeExecutionContext } from "../types";
import type { WorkflowNode } from "@/types";

const applyImageOperation = vi.fn();
vi.mock("@/utils/imageOps", () => ({
  applyImageOperation: (...args: unknown[]) => applyImageOperation(...args),
}));

function makeNode(data: Record<string, unknown> = {}): WorkflowNode {
  return {
    id: "action-1",
    type: "imageAction",
    position: { x: 0, y: 0 },
    data: { operation: "rotate", params: { angle: "90" }, outputImage: null, status: "idle", error: null, ...data },
  } as WorkflowNode;
}

function makeCtx(node: WorkflowNode, images: string[] = ["data:image/png;base64,src"]): NodeExecutionContext {
  return {
    node,
    getConnectedInputs: vi.fn().mockReturnValue({ images, videos: [], audio: [], text: null, textItems: [], dynamicInputs: {}, easeCurve: null }),
    updateNodeData: vi.fn(),
    getFreshNode: vi.fn().mockReturnValue(node),
    getEdges: vi.fn().mockReturnValue([]),
    getNodes: vi.fn().mockReturnValue([node]),
  } as unknown as NodeExecutionContext;
}

beforeEach(() => vi.clearAllMocks());

describe("executeImageAction", () => {
  it("applies the operation to connected images and stores the result", async () => {
    applyImageOperation.mockResolvedValue("data:image/png;base64,result");
    const node = makeNode();
    const ctx = makeCtx(node);

    await executeImageAction(ctx);

    expect(applyImageOperation).toHaveBeenCalledWith(
      ["data:image/png;base64,src"],
      "rotate",
      { angle: "90" }
    );
    expect(ctx.updateNodeData).toHaveBeenCalledWith("action-1", { status: "loading", error: null });
    expect(ctx.updateNodeData).toHaveBeenLastCalledWith("action-1", {
      outputImage: "data:image/png;base64,result",
      outputImageRef: undefined,
      status: "complete",
      error: null,
    });
  });

  it("surfaces operation errors on the node and rethrows", async () => {
    applyImageOperation.mockRejectedValue(new Error("Connect an image input first"));
    const node = makeNode();
    const ctx = makeCtx(node, []);

    await expect(executeImageAction(ctx)).rejects.toThrow("Connect an image input first");
    expect(ctx.updateNodeData).toHaveBeenLastCalledWith("action-1", {
      status: "error",
      error: "Connect an image input first",
    });
  });

  it("resets to idle on abort", async () => {
    applyImageOperation.mockRejectedValue(new DOMException("Aborted", "AbortError"));
    const node = makeNode();
    const ctx = makeCtx(node);

    await expect(executeImageAction(ctx)).rejects.toThrow("Aborted");
    expect(ctx.updateNodeData).toHaveBeenLastCalledWith("action-1", { status: "idle", error: null });
  });
});
