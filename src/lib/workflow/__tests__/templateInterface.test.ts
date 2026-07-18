import { describe, it, expect } from "vitest";
import { describeTemplateInterface } from "@/lib/workflow/templateInterface";
import type { WorkflowNode } from "@/types";

function makeNode(id: string, type: string, position: { x: number; y: number }, data: Record<string, unknown> = {}): WorkflowNode {
  return { id, type, position, data } as WorkflowNode;
}

describe("describeTemplateInterface", () => {
  it("maps input-family nodes to typed fields in canvas reading order", () => {
    const { inputs } = describeTemplateInterface([
      makeNode("i1", "imageInput", { x: 0, y: 200 }, { image: null }),
      makeNode("p1", "prompt", { x: 0, y: 0 }, { prompt: "hello", customTitle: "Scene description" }),
      makeNode("v1", "videoInput", { x: 100, y: 200 }, { video: null }),
      makeNode("a1", "audioInput", { x: 0, y: 400 }, { audioFile: "data:audio/mp3;base64,xx" }),
      makeNode("g1", "nanoBanana", { x: 300, y: 0 }, {}),
    ]);

    expect(inputs.map((i) => i.nodeId)).toEqual(["p1", "i1", "v1", "a1"]);
    expect(inputs[0]).toEqual({
      key: "Scene description",
      name: "Scene description",
      type: "text",
      nodeId: "p1",
      nodeType: "prompt",
      hasValue: true,
    });
    expect(inputs[1]).toMatchObject({ key: "i1", name: "Image", type: "image", hasValue: false });
    expect(inputs[2]).toMatchObject({ type: "video" });
    expect(inputs[3]).toMatchObject({ type: "audio", hasValue: true });
  });

  it("excludes inputs explicitly marked isTemplateInput: false", () => {
    const { inputs } = describeTemplateInterface([
      makeNode("p1", "prompt", { x: 0, y: 0 }, { prompt: "visible" }),
      makeNode("p2", "prompt", { x: 0, y: 100 }, { prompt: "hidden", isTemplateInput: false }),
    ]);
    expect(inputs.map((i) => i.nodeId)).toEqual(["p1"]);
  });

  it("reports output nodes with friendly names", () => {
    const { outputs } = describeTemplateInterface([
      makeNode("o1", "output", { x: 0, y: 0 }, {}),
      makeNode("o2", "outputGallery", { x: 0, y: 100 }, { customTitle: "Finals" }),
    ]);
    expect(outputs).toEqual([
      { key: "o1", name: "Output", nodeId: "o1", nodeType: "output" },
      { key: "Finals", name: "Finals", nodeId: "o2", nodeType: "outputGallery" },
    ]);
  });

  it("returns empty sets for a workflow with no inputs or outputs", () => {
    expect(describeTemplateInterface([makeNode("g1", "nanoBanana", { x: 0, y: 0 })])).toEqual({
      inputs: [],
      outputs: [],
    });
  });
});
