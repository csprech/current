import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CurrentCommandBar } from "@/components/workspace/CurrentCommandBar";
import { useWorkflowStore } from "@/store/workflowStore";
import type { WorkflowNode } from "@/types";

const { mockSegmentedRender } = vi.hoisted(() => ({ mockSegmentedRender: vi.fn() }));

vi.mock("@/components/current/CurrentSegmentedControl", () => ({
  CurrentSegmentedControl: () => {
    mockSegmentedRender();
    return <div data-testid="workspace-view" />;
  },
}));

vi.mock("@/components/workspace/ProjectMenu", () => ({ ProjectMenu: () => null }));
vi.mock("@/components/workspace/RunControl", () => ({ RunControl: () => null }));

const promptNode = {
  id: "prompt",
  type: "prompt",
  position: { x: 0, y: 0 },
  data: { prompt: "hello" },
} as WorkflowNode;

beforeEach(() => {
  mockSegmentedRender.mockClear();
  useWorkflowStore.setState({ nodes: [], edges: [] });
});

afterEach(() => {
  act(() => useWorkflowStore.setState({ nodes: [], edges: [] }));
});

it("does not rerender command-bar controls for comment-node changes", () => {
  render(<CurrentCommandBar />);
  expect(mockSegmentedRender).toHaveBeenCalledTimes(1);

  act(() => useWorkflowStore.setState({ nodes: [promptNode] }));

  expect(mockSegmentedRender).toHaveBeenCalledTimes(1);
});
