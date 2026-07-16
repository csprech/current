// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readComponent = (path: string) => readFileSync(`${process.cwd()}/src/components/${path}`, "utf8");

describe("adaptive appearance source contract", () => {
  it("uses Current semantic roles for appearance-dependent component chrome", () => {
    expect(readComponent("nodes/InlineParameterPanel.tsx")).not.toContain("#2a2a2a");
    expect(readComponent("nodes/InlineParameterPanel.tsx")).toContain("current-inline-parameters");
    expect(readComponent("onboarding/ElementHighlight.tsx")).toContain("var(--current-focus-outer)");
    expect(readComponent("edges/EditableEdge.tsx")).toContain('fill="var(--current-surface-elevated)"');
    expect(readComponent("WorkflowCanvas.tsx")).toContain('color="var(--current-border)"');
    expect(readComponent("nodes/ControlPanel.tsx")).toContain('stroke="currentColor"');
    expect(readComponent("GroupsOverlay.tsx")).toContain("var(--current-text-primary)");
    expect(readComponent("GroupsOverlay.tsx")).not.toContain("rgba(255,255,255,0.25)");
  });

  it.each([
    "nodes/RouterNode.tsx",
    "nodes/SwitchNode.tsx",
    "nodes/ConditionalSwitchNode.tsx",
    "nodes/SplitGridNode.tsx",
    "nodes/ImageInputNode.tsx",
    "nodes/RemoveBackgroundNode.tsx",
    "nodes/VideoFrameGrabNode.tsx",
    "nodes/OutputGalleryNode.tsx",
    "nodes/EaseCurveNode.tsx",
  ])("keeps %s connector presentation on adaptive Current roles", (path) => {
    expect(readComponent(path)).not.toMatch(/#1e1e1e|#6b7280|rgb\(59,\s*130,\s*246\)|rgb\(190,\s*242,\s*100\)/i);
  });
});
