import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CurrentCommandBar } from "@/components/workspace/CurrentCommandBar";

const mockUseWorkflowStore = vi.fn();
vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) => mockUseWorkflowStore(selector),
}));
vi.mock("@/store/ftuxStore", () => ({
  useFTUXStore: { getState: () => ({ tutorialActive: false, tutorialSteps: [], currentTutorialStep: 0 }), subscribe: vi.fn(() => () => undefined) },
}));
vi.mock("@/components/workspace/ProjectMenu", () => ({ ProjectMenu: () => <button>Project</button> }));

const state = {
  nodes: [], getNodesWithComments: () => [], viewedCommentNodeIds: new Set(), markCommentViewed: vi.fn(), setNavigationTarget: vi.fn(),
  workspaceView: "canvas", setWorkspaceView: vi.fn(), canUndo: false, canRedo: false, undo: vi.fn(), redo: vi.fn(),
  activeLeftPanel: null, activeRightPanel: null, toggleLeftPanel: vi.fn(), toggleRightPanel: vi.fn(), setShowQuickstart: vi.fn(),
  isRunning: false, currentNodeIds: [], executeWorkflow: vi.fn(), regenerateNode: vi.fn(), executeSelectedNodes: vi.fn(), stopWorkflow: vi.fn(),
  mockTutorialExecution: vi.fn(), validateWorkflow: () => ({ valid: true, errors: [] }),
};

describe("workspace command controls composition", () => {
  it("opens the one owner-supplied Add Palette surface directly", () => {
    mockUseWorkflowStore.mockImplementation((selector) => selector(state));
    const open = vi.fn();
    render(<CurrentCommandBar onAddNode={open} />);
    fireEvent.click(screen.getByRole("button", { name: "Add node" }));
    expect(open).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("button", { name: "Run" })).toHaveLength(1);
  });
});
