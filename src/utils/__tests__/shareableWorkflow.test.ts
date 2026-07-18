import { describe, it, expect } from "vitest";
import { buildShareableWorkflow, shareableFilename, stripGeneratedMedia } from "../shareableWorkflow";
import type { WorkflowNode, WorkflowEdge } from "@/types";

function node(id: string, data: Record<string, unknown>, type = "nanoBanana"): WorkflowNode {
  return { id, type, position: { x: 0, y: 0 }, data } as WorkflowNode;
}

describe("buildShareableWorkflow", () => {
  const base = {
    name: "My Flow",
    edges: [] as WorkflowEdge[],
    edgeStyle: "curved" as const,
  };

  it("strips external refs but keeps inline base64 media", () => {
    const result = buildShareableWorkflow({
      ...base,
      nodes: [
        node("n1", {
          outputImage: "data:image/png;base64,AAAA",
          outputImageRef: "img-123",
          imageRefBasePath: "/local/path",
          prompt: "a cat",
        }),
      ],
    });

    const data = result.nodes[0].data as Record<string, unknown>;
    expect(data.outputImage).toBe("data:image/png;base64,AAAA");
    expect(data.prompt).toBe("a cat");
    expect(data.outputImageRef).toBeUndefined();
    expect(data.imageRefBasePath).toBeUndefined();
  });

  it("omits id and directoryPath so the file is portable", () => {
    const result = buildShareableWorkflow({ ...base, nodes: [] });
    expect(result.id).toBeUndefined();
    expect(result.directoryPath).toBeUndefined();
    expect(result.version).toBe(1);
    expect(result.name).toBe("My Flow");
  });

  it("does not mutate the input nodes", () => {
    const original = node("n1", { imageRef: "keep-me", outputImage: "data:x" });
    buildShareableWorkflow({ ...base, nodes: [original] });
    expect((original.data as Record<string, unknown>).imageRef).toBe("keep-me");
  });

  it("drops empty groups but keeps populated ones", () => {
    const withEmpty = buildShareableWorkflow({ ...base, nodes: [], groups: {} });
    expect(withEmpty.groups).toBeUndefined();

    const g = { g1: { id: "g1" } } as never;
    const withGroups = buildShareableWorkflow({ ...base, nodes: [], groups: g });
    expect(withGroups.groups).toBe(g);
  });
});

describe("export → serialize → import round-trip", () => {
  // Mirror of the drop-handler import guard in WorkflowCanvas.tsx:
  //   if (workflow.version && workflow.nodes && workflow.edges) loadWorkflow(workflow)
  function importGuardPasses(w: { version?: unknown; nodes?: unknown; edges?: unknown }): boolean {
    return !!(w.version && w.nodes && w.edges);
  }

  it("produces JSON the canvas drop handler accepts, media inline, no local path", () => {
    const exported = buildShareableWorkflow({
      name: "Portrait Pipeline",
      edgeStyle: "curved",
      edges: [{ id: "e1", source: "a", target: "b" } as unknown as WorkflowEdge],
      nodes: [
        node("a", { image: "data:image/png;base64,AAAA", imageRef: "local-123" }),
      ],
    });

    // What the browser downloads and someone else drops in:
    const reimported = JSON.parse(JSON.stringify(exported));

    expect(importGuardPasses(reimported)).toBe(true);
    expect(reimported.directoryPath).toBeUndefined(); // no foreign path → no hydration attempt
    expect(reimported.nodes[0].data.image).toBe("data:image/png;base64,AAAA");
    expect(reimported.nodes[0].data.imageRef).toBeUndefined();
    expect(reimported.edges).toHaveLength(1);
  });
});

describe("shareableFilename", () => {
  it("slugifies workflow names", () => {
    expect(shareableFilename("My Cool Flow!")).toBe("my-cool-flow");
    expect(shareableFilename("")).toBe("workflow");
    expect(shareableFilename("   ")).toBe("workflow");
  });
});

describe("stripGeneratedMedia", () => {
  it("clears generated outputs and run state but keeps input media", () => {
    const workflow = buildShareableWorkflow({
      name: "Poster",
      edges: [],
      edgeStyle: "curved",
      nodes: [
        node("in1", { image: "data:image/png;base64,INPUT" }, "imageInput"),
        node("gen1", {
          outputImage: "data:image/png;base64,GENERATED",
          imageHistory: [{ id: "h1" }],
          selectedHistoryIndex: 2,
          status: "complete",
          error: "old error",
          prompt: "keep me",
        }),
        node("out1", { image: "data:image/png;base64,RESULT", video: "data:video/mp4;base64,V" }, "output"),
      ],
    });

    const cleaned = stripGeneratedMedia(workflow);
    const byId = new Map(cleaned.nodes.map((n) => [n.id, n.data as Record<string, unknown>]));

    expect(byId.get("in1")!.image).toBe("data:image/png;base64,INPUT");
    expect(byId.get("gen1")).toMatchObject({
      outputImage: null,
      imageHistory: [],
      selectedHistoryIndex: null,
      status: null,
      error: null,
      prompt: "keep me",
    });
    expect(byId.get("out1")).toMatchObject({ image: null, video: null, audio: null });
    // Interface recomputed from the cleaned nodes
    expect(cleaned.templateInterface?.inputs.map((i) => i.nodeId)).toEqual(["in1"]);
    expect(cleaned.templateInterface?.outputs.map((o) => o.nodeId)).toEqual(["out1"]);
  });
});
