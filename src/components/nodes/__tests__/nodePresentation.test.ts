import { describe, expect, it } from "vitest";
import type { HandleType, NodeType } from "@/types";
import {
  deriveNodeStatus,
  deriveNodeStatusFromData,
  getHandlePresentation,
  getMinimapColor,
  getNodeRole,
} from "../nodePresentation";
import { createDefaultNodeData } from "@/store/utils/nodeDefaults";

describe("nodePresentation", () => {
  it("maps every connection type to a labeled Current-family presentation", () => {
    expect(getHandlePresentation("text")).toEqual(
      expect.objectContaining({ label: "Text", color: "var(--current-blue)" })
    );
    expect(getHandlePresentation("image")).toEqual(
      expect.objectContaining({ label: "Image", color: "var(--current-aqua)" })
    );
    expect(getHandlePresentation("video").gradient).toBe(true);

    const handleTypes: HandleType[] = ["text", "image", "video", "audio", "3d", "easeCurve"];
    for (const type of handleTypes) {
      expect(getHandlePresentation(type).label).toBeTruthy();
      expect(getHandlePresentation(type).color).toMatch(/^var\(--current-/);
    }

    expect(getHandlePresentation("generic")).toEqual(
      expect.objectContaining({ label: "Connection", color: "var(--current-steel-blue)" })
    );
  });

  it("assigns every node type to a semantic role and Current minimap color", () => {
    expect(getNodeRole("nanoBanana")).toBe("generator");
    expect(getNodeRole("outputGallery")).toBe("output");
    expect(getMinimapColor("generateAudio")).toBe("#6A70E8");
    expect(getMinimapColor("group")).toBe("#8A8D96");
    expect(getMinimapColor(undefined)).toBe("#8A8D96");

    const nodeTypes: NodeType[] = [
      "imageInput", "audioInput", "videoInput", "annotation", "prompt", "array",
      "promptConstructor", "nanoBanana", "generateVideo", "generateAudio", "llmGenerate",
      "splitGrid", "output", "outputGallery", "imageCompare", "videoStitch", "easeCurve",
      "videoTrim", "videoFrameGrab", "removeBackground", "router", "switch",
      "conditionalSwitch", "generate3d", "glbViewer",
    ];

    for (const type of nodeTypes) {
      expect(["input", "generator", "processor", "router", "output"]).toContain(getNodeRole(type));
      expect(getMinimapColor(type)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("derives one explicit status using execution precedence", () => {
    expect(deriveNodeStatus({ error: "Model unavailable", running: true })).toEqual({
      state: "error",
      label: "Error",
      detail: "Model unavailable",
    });
    expect(deriveNodeStatus({ running: true, locked: true })).toEqual({ state: "running", label: "Running" });
    expect(deriveNodeStatus({ locked: true, disabled: true })).toEqual({ state: "locked", label: "Locked" });
    expect(deriveNodeStatus({ disabled: true, skipped: true })).toEqual({ state: "disabled", label: "Disabled" });
    expect(deriveNodeStatus({ skipped: true, complete: true })).toEqual({
      state: "skipped",
      label: "Skipped",
      detail: "Missing optional input",
    });
    expect(deriveNodeStatus({ complete: true })).toEqual({ state: "complete", label: "Complete" });
    expect(deriveNodeStatus({})).toEqual({ state: "idle", label: "Ready" });
  });

  it("normalizes legacy node data into explicit Current states", () => {
    expect(deriveNodeStatusFromData("nanoBanana", { status: "loading" })).toMatchObject({ state: "running" });
    expect(deriveNodeStatusFromData("nanoBanana", { status: "error", error: "Provider unavailable" })).toEqual({
      state: "error", label: "Error", detail: "Provider unavailable · Run again to retry",
    });
    expect(deriveNodeStatusFromData("nanoBanana", { outputImage: "data:image/png;base64,x" })).toMatchObject({ state: "complete" });
    expect(deriveNodeStatusFromData("prompt", {}, { locked: true })).toMatchObject({ state: "locked" });
    expect(deriveNodeStatusFromData("prompt", {}, { disabled: true })).toMatchObject({ state: "disabled" });
    expect(deriveNodeStatusFromData("prompt", {}, { skipped: true })).toMatchObject({ state: "skipped" });
  });

  it("does not infer processor or generator completion from input and configuration fields", () => {
    expect(deriveNodeStatusFromData("splitGrid", { sourceImage: "image", defaultPrompt: "configured" }).state).toBe("idle");
    expect(deriveNodeStatusFromData("nanoBanana", { inputPrompt: "configured", resolution: "2K" }).state).toBe("idle");
    expect(deriveNodeStatusFromData("promptConstructor", { template: "Hello @name", outputText: null }).state).toBe("idle");
    expect(deriveNodeStatusFromData("nanoBanana", { status: "complete", outputImage: null }).state).toBe("idle");
    expect(deriveNodeStatusFromData("prompt", { prompt: "A true input value" }).state).toBe("complete");
  });

  it("keeps the default Array ready and completes only for meaningful array output", () => {
    expect(deriveNodeStatusFromData("array", createDefaultNodeData("array")).state).toBe("idle");
    expect(deriveNodeStatusFromData("array", { outputItems: ["first"], outputText: '["first"]' }).state).toBe("complete");
    expect(deriveNodeStatusFromData("array", { outputItems: [], outputText: '["first"]' }).state).toBe("complete");
  });

  it("maps explicit metadata for each node family", () => {
    expect(deriveNodeStatusFromData("videoInput", {
      video: "video", dimensions: { width: 1920, height: 1080 }, duration: 4.25, format: "video/mp4", isOptional: true,
    }).detail).toBe("1920 × 1080 · 4.3 s · MP4 · Optional");

    expect(deriveNodeStatusFromData("nanoBanana", {
      selectedModel: { provider: "fal", displayName: "Flux Pro", modelId: "flux-pro" }, resolution: "2K", status: "loading", progress: 42,
    }).detail).toBe("fal · Flux Pro · 2K · 42%");

    expect(deriveNodeStatusFromData("videoTrim", { duration: 8, outputVideo: null }).detail)
      .toBe("Trim video · MP4 · 8.0 s");

    expect(deriveNodeStatusFromData("conditionalSwitch", {
      rules: [{ label: "Portrait", isMatched: true }, { label: "Landscape", isMatched: false }],
    }).detail).toBe("Portrait active · 2 rules");

    expect(deriveNodeStatusFromData("output", { contentType: "audio", audio: "audio" }).detail)
      .toBe("Audio available");
  });
});
