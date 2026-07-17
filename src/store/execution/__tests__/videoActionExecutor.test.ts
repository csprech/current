import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeVideoAction } from "../videoActionExecutor";
import type { NodeExecutionContext } from "../types";
import type { WorkflowNode } from "@/types";

const applyVideoOperation = vi.fn();
vi.mock("@/utils/videoOps", () => ({
  applyVideoOperation: (...args: unknown[]) => applyVideoOperation(...args),
}));

function makeNode(data: Record<string, unknown> = {}): WorkflowNode {
  return {
    id: "vaction-1",
    type: "videoAction",
    position: { x: 0, y: 0 },
    data: {
      operation: "reverse",
      params: {},
      outputVideo: null,
      status: "idle",
      error: null,
      progress: 0,
      encoderSupported: true,
      ...data,
    },
  } as WorkflowNode;
}

function makeCtx(node: WorkflowNode, videos: string[] = ["data:video/mp4;base64,c3Jj"]): NodeExecutionContext {
  return {
    node,
    getConnectedInputs: vi.fn().mockReturnValue({ images: [], videos, audio: [], text: null, textItems: [], dynamicInputs: {}, easeCurve: null }),
    updateNodeData: vi.fn(),
    getFreshNode: vi.fn().mockReturnValue(node),
    getEdges: vi.fn().mockReturnValue([]),
    getNodes: vi.fn().mockReturnValue([node]),
  } as unknown as NodeExecutionContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ blob: () => Promise.resolve(new Blob(["source"], { type: "video/mp4" })) })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("executeVideoAction", () => {
  it("applies the operation to the connected video and stores the result as a data URL", async () => {
    applyVideoOperation.mockResolvedValue(new Blob(["out"], { type: "video/mp4" }));
    const node = makeNode({ operation: "speed", params: { rate: 2 } });
    const ctx = makeCtx(node);

    await executeVideoAction(ctx);

    expect(applyVideoOperation).toHaveBeenCalledWith(
      expect.any(Blob),
      "speed",
      { rate: 2 },
      expect.any(Function)
    );
    expect(ctx.updateNodeData).toHaveBeenCalledWith("vaction-1", { status: "loading", progress: 0, error: null });
    const lastCall = vi.mocked(ctx.updateNodeData).mock.calls.at(-1);
    expect(lastCall?.[0]).toBe("vaction-1");
    expect(lastCall?.[1]).toMatchObject({ status: "complete", progress: 100, error: null });
    expect((lastCall?.[1] as { outputVideo: string }).outputVideo).toMatch(/^data:video\/mp4;base64,/);
  });

  it("forwards progress updates to the node", async () => {
    applyVideoOperation.mockImplementation(async (_blob, _op, _params, onProgress) => {
      (onProgress as (p: number) => void)(42);
      return new Blob(["out"], { type: "video/mp4" });
    });
    const node = makeNode();
    const ctx = makeCtx(node);

    await executeVideoAction(ctx);

    expect(ctx.updateNodeData).toHaveBeenCalledWith("vaction-1", { progress: 42 });
  });

  it("errors when no video is connected", async () => {
    const node = makeNode();
    const ctx = makeCtx(node, []);

    await expect(executeVideoAction(ctx)).rejects.toThrow("Connect a video input first");
    expect(applyVideoOperation).not.toHaveBeenCalled();
    expect(ctx.updateNodeData).toHaveBeenLastCalledWith("vaction-1", {
      status: "error",
      error: "Connect a video input first",
      progress: 0,
    });
  });

  it("errors immediately when the browser cannot encode video", async () => {
    const node = makeNode({ encoderSupported: false });
    const ctx = makeCtx(node);

    await expect(executeVideoAction(ctx)).rejects.toThrow("Browser does not support video encoding");
    expect(ctx.getConnectedInputs).not.toHaveBeenCalled();
  });

  it("surfaces operation errors on the node and rethrows", async () => {
    applyVideoOperation.mockRejectedValue(new Error("No video track found in input"));
    const node = makeNode();
    const ctx = makeCtx(node);

    await expect(executeVideoAction(ctx)).rejects.toThrow("No video track found in input");
    expect(ctx.updateNodeData).toHaveBeenLastCalledWith("vaction-1", {
      status: "error",
      error: "No video track found in input",
      progress: 0,
    });
  });

  it("resets to idle on abort", async () => {
    applyVideoOperation.mockRejectedValue(new DOMException("Aborted", "AbortError"));
    const node = makeNode();
    const ctx = makeCtx(node);

    await expect(executeVideoAction(ctx)).rejects.toThrow("Aborted");
    expect(ctx.updateNodeData).toHaveBeenLastCalledWith("vaction-1", { status: "idle", progress: 0, error: null });
  });
});
