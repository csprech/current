import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RunControl } from "@/components/workspace/RunControl";
import { useWorkflowStore } from "@/store/workflowStore";
import type { WorkflowEdge, WorkflowNode } from "@/types";

vi.mock("@/store/ftuxStore", () => ({
  useFTUXStore: {
    getState: () => ({ tutorialActive: false, tutorialSteps: [], currentTutorialStep: 0 }),
    subscribe: vi.fn(() => () => undefined),
  },
}));

const nodes = [
  { id: "prompt", type: "prompt", position: { x: 0, y: 0 }, data: { prompt: "hello" } },
  { id: "generate", type: "nanoBanana", position: { x: 100, y: 0 }, data: {} },
] as WorkflowNode[];

const textEdge = {
  id: "prompt-generate",
  source: "prompt",
  target: "generate",
  sourceHandle: "text",
  targetHandle: "text",
} as WorkflowEdge;

describe("RunControl edge validation integration", () => {
  beforeEach(() => {
    useWorkflowStore.setState({ nodes, edges: [], isRunning: false, currentNodeIds: [] });
  });

  afterEach(() => {
    act(() => useWorkflowStore.setState({ nodes: [], edges: [], isRunning: false, currentNodeIds: [] }));
  });

  it("updates Run when only edges change", () => {
    render(<RunControl />);
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();

    act(() => useWorkflowStore.setState({ edges: [textEdge] }));

    expect(screen.getByRole("button", { name: "Run" })).toBeEnabled();
  });
});
