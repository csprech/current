import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
import { CurrentCommandBar } from "@/components/workspace/CurrentCommandBar";
import { FloatingActionBar } from "@/components/FloatingActionBar";

const mockUseWorkflowStore = vi.fn();

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) => mockUseWorkflowStore(selector),
}));

vi.mock("@/store/ftuxStore", () => ({
  useFTUXStore: {
    getState: () => ({ tutorialActive: false, tutorialSteps: [], currentTutorialStep: 0 }),
    subscribe: vi.fn(() => () => undefined),
  },
}));

vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    useReactFlow: () => ({ screenToFlowPosition: (position: unknown) => position }),
  };
});

vi.mock("@/components/workspace/ProjectMenu", () => ({
  ProjectMenu: () => <button type="button">Project</button>,
}));

vi.mock("@/components/modals/ModelSearchDialog", () => ({
  ModelSearchDialog: () => null,
}));

function createState() {
  return {
    nodes: [], edges: [], isRunning: false, currentNodeIds: [],
    executeWorkflow: vi.fn(), regenerateNode: vi.fn(), executeSelectedNodes: vi.fn(),
    stopWorkflow: vi.fn(), mockTutorialExecution: vi.fn(),
    validateWorkflow: vi.fn(() => ({ valid: true, errors: [] })),
    getNodesWithComments: vi.fn(() => []), viewedCommentNodeIds: new Set<string>(),
    markCommentViewed: vi.fn(), setNavigationTarget: vi.fn(),
    workspaceView: "canvas", setWorkspaceView: vi.fn(), canUndo: false, canRedo: false,
    undo: vi.fn(), redo: vi.fn(), activeLeftPanel: null, activeRightPanel: null,
    toggleLeftPanel: vi.fn(), toggleRightPanel: vi.fn(), setShowQuickstart: vi.fn(),
    edgeStyle: "angular", setEdgeStyle: vi.fn(), setModelSearchOpen: vi.fn(),
    modelSearchOpen: false, modelSearchProvider: null, addNode: vi.fn(),
  };
}

function renderWorkspaceControls() {
  return render(
    <ReactFlowProvider>
      <CurrentCommandBar />
      <FloatingActionBar />
    </ReactFlowProvider>
  );
}

describe("workspace command controls composition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkflowStore.mockImplementation((selector) => selector(createState()));
  });

  it("renders one primary Run control and one tutorial run target", () => {
    const { container } = renderWorkspaceControls();
    expect(screen.getAllByRole("button", { name: "Run" })).toHaveLength(1);
    expect(container.querySelectorAll('[data-tutorial="floating-run-button"]')).toHaveLength(1);
  });

  it("opens the legacy All Nodes menu from the Current Add node action", () => {
    renderWorkspaceControls();
    expect(screen.queryByRole("menu", { name: "All nodes" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add node" }));

    expect(screen.getByRole("menu", { name: "All nodes" })).toBeInTheDocument();
    expect(screen.getByText("Image Input")).toBeInTheDocument();
  });

  it("cleans up the temporary Add node event bridge", () => {
    const removeListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderWorkspaceControls();

    unmount();

    expect(removeListener).toHaveBeenCalledWith("current:add-node", expect.any(Function));
    removeListener.mockRestore();
  });
});
