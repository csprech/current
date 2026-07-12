import { describe, expect, it } from "vitest";
import type { HandleType, NodeType } from "@/types";
import {
  deriveNodeStatus,
  getHandlePresentation,
  getMinimapColor,
  getNodeRole,
} from "../nodePresentation";

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
});
