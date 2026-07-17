import { describe, it, expect, vi } from "vitest";
import { runWorkflowHeadless, applyInputOverrides } from "../runWorkflow";
import type { WorkflowNode, WorkflowEdge } from "@/types";

function node(id: string, type: string, data: Record<string, unknown> = {}): WorkflowNode {
  return { id, type, position: { x: 0, y: 0 }, data } as WorkflowNode;
}

function edge(source: string, target: string, handle = "image"): WorkflowEdge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    sourceHandle: handle,
    targetHandle: handle,
  } as WorkflowEdge;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

const baseCtx = { origin: "http://test.local", headers: {} };

describe("runWorkflowHeadless", () => {
  it("passes an input image straight through to an output node without any provider call", async () => {
    const fetchImpl = vi.fn();
    const result = await runWorkflowHeadless(
      {
        workflow: {
          nodes: [
            node("in-1", "imageInput", { image: "data:image/png;base64,abc" }),
            node("out-1", "output", { image: null }),
          ],
          edges: [edge("in-1", "out-1")],
        },
      },
      { ...baseCtx, fetchImpl }
    );

    expect(result.success).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.outputs).toEqual([
      { nodeId: "out-1", title: "out-1", type: "image", data: "data:image/png;base64,abc" },
    ]);
  });

  it("runs prompt → generate → output through the generate endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, image: "data:image/png;base64,generated" })
    );

    const result = await runWorkflowHeadless(
      {
        workflow: {
          nodes: [
            node("p-1", "prompt", { prompt: "a red fox" }),
            node("gen-1", "nanoBanana", {
              model: "nano-banana",
              aspectRatio: "1:1",
              resolution: "1K",
              selectedModel: { provider: "gemini", modelId: "nano-banana", displayName: "Nano Banana" },
            }),
            node("out-1", "output", { image: null }),
          ],
          edges: [edge("p-1", "gen-1", "text"), edge("gen-1", "out-1")],
        },
      },
      { ...baseCtx, fetchImpl }
    );

    expect(result.success).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://test.local/api/generate");
    expect(JSON.parse(init.body).prompt).toBe("a red fox");
    expect(result.outputs).toEqual([
      { nodeId: "out-1", title: "out-1", type: "image", data: "data:image/png;base64,generated" },
    ]);
    expect(result.nodeResults.map((r) => r.status)).toEqual(["complete", "complete", "complete"]);
  });

  it("uses the node's inline prompt when no prompt node is connected", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, image: "data:image/png;base64,generated" })
    );

    const result = await runWorkflowHeadless(
      {
        workflow: {
          nodes: [
            node("gen-1", "nanoBanana", {
              model: "nano-banana",
              inlinePrompt: "typed on the node",
              selectedModel: { provider: "gemini", modelId: "nano-banana", displayName: "Nano Banana" },
            }),
          ],
          edges: [],
        },
      },
      { ...baseCtx, fetchImpl }
    );

    expect(result.success).toBe(true);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).prompt).toBe("typed on the node");
    // No output node: terminal generation result is collected
    expect(result.outputs[0]).toMatchObject({ nodeId: "gen-1", type: "image" });
  });

  it("follows the polling path for long-running providers", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ polling: true, taskId: "t1", pollProvider: "kie", pollModelId: "m", pollModelName: "M", pollMediaType: "image" })
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, image: "data:image/png;base64,polled" }));

    const result = await runWorkflowHeadless(
      {
        workflow: {
          nodes: [
            node("gen-1", "nanoBanana", {
              model: "nano-banana",
              inlinePrompt: "poll me",
              selectedModel: { provider: "kie", modelId: "m", displayName: "M" },
            }),
          ],
          edges: [],
        },
      },
      { ...baseCtx, fetchImpl, pollIntervalMs: 1 }
    );

    expect(result.success).toBe(true);
    expect(fetchImpl.mock.calls[1][0]).toBe("http://test.local/api/generate/poll");
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).taskId).toBe("t1");
    expect(result.outputs[0].data).toBe("data:image/png;base64,polled");
  });

  it("validates without executing when validateOnly is set", async () => {
    const fetchImpl = vi.fn();
    const result = await runWorkflowHeadless(
      {
        workflow: {
          nodes: [
            node("gen-1", "nanoBanana", {
              model: "nano-banana",
              inlinePrompt: "x",
              selectedModel: { provider: "gemini", modelId: "nano-banana", displayName: "Nano Banana" },
            }),
          ],
          edges: [],
        },
        validateOnly: true,
      },
      { ...baseCtx, fetchImpl }
    );

    expect(result.success).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.outputs).toEqual([]);
  });

  it("rejects workflows containing node types the headless engine cannot run", async () => {
    const result = await runWorkflowHeadless(
      {
        workflow: {
          nodes: [node("a-1", "imageAction", { operation: "rotate", params: {} })],
          edges: [],
        },
      },
      baseCtx
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("not supported in headless runs yet: imageAction");
  });

  it("surfaces generation failures with node context", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ success: false, error: "API key not configured" }, 500)
    );

    const result = await runWorkflowHeadless(
      {
        workflow: {
          nodes: [
            node("gen-1", "nanoBanana", {
              model: "nano-banana",
              inlinePrompt: "x",
              customTitle: "Hero Shot",
              selectedModel: { provider: "gemini", modelId: "nano-banana", displayName: "Nano Banana" },
            }),
          ],
          edges: [],
        },
      },
      { ...baseCtx, fetchImpl }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Node "Hero Shot" (nanoBanana) failed: API key not configured');
    expect(result.nodeResults[0].status).toBe("error");
  });
});

describe("applyInputOverrides", () => {
  it("matches nodes by id or custom title and sets the right field", () => {
    const nodes = [
      node("in-1", "imageInput", { image: null, customTitle: "Product Photo" }),
      node("p-1", "prompt", { prompt: "" }),
    ];

    const { applied, errors } = applyInputOverrides(nodes, {
      "Product Photo": { image: "data:image/png;base64,new" },
      "p-1": { text: "hello" },
    });

    expect(errors).toEqual([]);
    expect(applied.sort()).toEqual(["Product Photo", "p-1"]);
    expect((nodes[0].data as Record<string, unknown>).image).toBe("data:image/png;base64,new");
    expect((nodes[1].data as Record<string, unknown>).prompt).toBe("hello");
  });

  it("reports unknown input names", () => {
    const { errors } = applyInputOverrides([node("in-1", "imageInput", {})], {
      missing: { text: "x" },
    });
    expect(errors[0]).toContain('"missing" matches no node');
  });
});
