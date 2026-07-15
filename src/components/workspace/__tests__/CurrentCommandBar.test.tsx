import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CurrentCommandBar } from "@/components/workspace/CurrentCommandBar";

const mockUseWorkflowStore = vi.fn();
const mockToggleLeftPanel = vi.fn();
const mockToggleRightPanel = vi.fn();
const mockSetWorkspaceView = vi.fn();
const mockUndo = vi.fn();
const mockRedo = vi.fn();
const mockSetShowQuickstart = vi.fn();

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) =>
    mockUseWorkflowStore(selector),
}));

vi.mock("@/store/ftuxStore", () => ({
  useFTUXStore: {
    getState: () => ({ tutorialActive: false, tutorialSteps: [], currentTutorialStep: 0 }),
    subscribe: vi.fn(() => () => undefined),
  },
}));

vi.mock("@/components/ProjectSetupModal", () => ({
  ProjectSetupModal: ({ isOpen, mode }: { isOpen: boolean; mode: string }) =>
    isOpen ? <div data-testid="project-setup" data-mode={mode} /> : null,
}));

vi.mock("@/components/WorkflowBrowserModal", () => ({
  WorkflowBrowserModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="workflow-browser" /> : null,
}));

vi.mock("@/components/KeyboardShortcutsDialog", () => ({
  KeyboardShortcutsDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="keyboard-shortcuts" /> : null,
}));

vi.mock("@/components/CostIndicator", () => ({
  CostIndicator: () => <button type="button">Cost details</button>,
}));

vi.mock("@/components/WorkflowVersionHistory", () => ({
  WorkflowVersionHistory: () => <button type="button">Version history</button>,
}));

function createState(overrides: Record<string, unknown> = {}) {
  return {
    workflowName: "Campaign Study",
    workflowId: "campaign-study",
    saveDirectoryPath: "/tmp/campaign-study",
    hasUnsavedChanges: false,
    lastSavedAt: null,
    isSaving: false,
    setWorkflowMetadata: vi.fn(),
    saveToFile: vi.fn(),
    loadWorkflow: vi.fn(),
    getShareableWorkflow: vi.fn(() => ({ name: "Campaign Study" })),
    previousWorkflowSnapshot: null,
    revertToSnapshot: vi.fn(),
    shortcutsDialogOpen: false,
    setShortcutsDialogOpen: vi.fn(),
    setShowQuickstart: mockSetShowQuickstart,
    nodes: [],
    getNodesWithComments: vi.fn(() => []),
    viewedCommentNodeIds: new Set<string>(),
    markCommentViewed: vi.fn(),
    setNavigationTarget: vi.fn(),
    workspaceView: "canvas",
    setWorkspaceView: mockSetWorkspaceView,
    canUndo: false,
    canRedo: false,
    undo: mockUndo,
    redo: mockRedo,
    activeLeftPanel: null,
    activeRightPanel: null,
    toggleLeftPanel: mockToggleLeftPanel,
    toggleRightPanel: mockToggleRightPanel,
    isRunning: false,
    currentNodeIds: [],
    executeWorkflow: vi.fn(),
    regenerateNode: vi.fn(),
    executeSelectedNodes: vi.fn(),
    stopWorkflow: vi.fn(),
    mockTutorialExecution: vi.fn(),
    validateWorkflow: vi.fn(() => ({ valid: true, errors: [] })),
    ...overrides,
  };
}

describe("CurrentCommandBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkflowStore.mockImplementation((selector) => selector(createState()));
  });

  it("renders Current, the project, and one primary Run control", () => {
    render(<CurrentCommandBar />);
    expect(screen.getByText("current")).toBeInTheDocument();
    expect(screen.getByText("Campaign Study")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Run" })).toHaveLength(1);
  });

  it("does not duplicate the Current accessible name in the project button", () => {
    render(<CurrentCommandBar />);
    expect(screen.getByRole("img", { name: "Current" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project menu for Campaign Study" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Current.*Campaign Study/i })).not.toBeInTheDocument();
  });

  it("shows configured and Untitled project states", () => {
    const { rerender } = render(<CurrentCommandBar />);
    expect(screen.getByText("Campaign Study")).toBeInTheDocument();
    mockUseWorkflowStore.mockImplementation((selector) =>
      selector(createState({ workflowName: null, workflowId: null, saveDirectoryPath: null }))
    );
    rerender(<CurrentCommandBar />);
    expect(screen.getByText("Untitled")).toBeInTheDocument();
  });

  it("exposes saving, unsaved, and saved state as text", () => {
    mockUseWorkflowStore.mockImplementation((selector) =>
      selector(createState({ hasUnsavedChanges: true }))
    );
    const { rerender } = render(<CurrentCommandBar />);
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    mockUseWorkflowStore.mockImplementation((selector) =>
      selector(createState({ isSaving: true }))
    );
    rerender(<CurrentCommandBar />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();

    mockUseWorkflowStore.mockImplementation((selector) =>
      selector(createState({ lastSavedAt: new Date("2024-01-15T14:30:00").getTime() }))
    );
    rerender(<CurrentCommandBar />);
    expect(screen.getByText(/Saved /)).toBeInTheDocument();
  });

  it("changes and reflects the workspace view", () => {
    mockUseWorkflowStore.mockImplementation((selector) =>
      selector(createState({ workspaceView: "outputs" }))
    );
    render(<CurrentCommandBar />);
    expect(screen.getByRole("button", { name: "Outputs" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Canvas" }));
    expect(mockSetWorkspaceView).toHaveBeenCalledWith("canvas");
  });

  it("uses undo and redo availability from the store", () => {
    mockUseWorkflowStore.mockImplementation((selector) =>
      selector(createState({ canUndo: true, canRedo: false }))
    );
    render(<CurrentCommandBar />);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(mockUndo).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  });

  it("calls the injected add-node opener and preserves the tutorial selector", () => {
    const onAddNode = vi.fn();
    render(<CurrentCommandBar onAddNode={onAddNode} />);
    const add = screen.getByRole("button", { name: "Add node" });
    fireEvent.click(add);
    expect(onAddNode).toHaveBeenCalledOnce();
    expect(add).toHaveAttribute("data-tutorial", "add-node-button");
    expect(add.querySelector("svg")).toHaveAttribute("stroke-width", "1.6");
  });

  it("opens the requested workspace panel", () => {
    render(<CurrentCommandBar />);
    fireEvent.click(screen.getByRole("button", { name: "Open library" }));
    expect(mockToggleLeftPanel).toHaveBeenCalledWith("library");
  });

  it("reflects and toggles activity and assistant panels", () => {
    mockUseWorkflowStore.mockImplementation((selector) =>
      selector(createState({ activeRightPanel: "activity", activeLeftPanel: "library" }))
    );
    render(<CurrentCommandBar />);
    expect(screen.getByRole("button", { name: "Open library" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Open activity" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Open assistant" }));
    expect(mockToggleRightPanel).toHaveBeenCalledWith("assistant");
  });

  it("keeps comment navigation reachable with an accessible count", () => {
    const markCommentViewed = vi.fn();
    const setNavigationTarget = vi.fn();
    const commentedNode = { id: "commented", data: {}, type: "prompt" };
    mockUseWorkflowStore.mockImplementation((selector) =>
      selector(createState({
        nodes: [commentedNode],
        getNodesWithComments: vi.fn(() => [commentedNode]),
        markCommentViewed,
        setNavigationTarget,
      }))
    );
    render(<CurrentCommandBar />);
    fireEvent.click(screen.getByRole("button", { name: "1 unviewed comment (1 total)" }));
    expect(markCommentViewed).toHaveBeenCalledWith("commented");
    expect(setNavigationTarget).toHaveBeenCalledWith("commented");
  });

  it("focuses and keyboard-navigates the project menu", async () => {
    render(<CurrentCommandBar />);
    fireEvent.click(screen.getByRole("button", { name: "Project menu for Campaign Study" }));
    const items = screen.getAllByRole("menuitem");

    await waitFor(() => expect(items[0]).toHaveFocus());
    fireEvent.keyDown(items[0], { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(items[1], { key: "End" });
    expect(items[items.length - 1]).toHaveFocus();
    fireEvent.keyDown(items[items.length - 1], { key: "Home" });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0], { key: "ArrowUp" });
    expect(items[items.length - 1]).toHaveFocus();
  });

  it("opens and closes the project menu with Escape and outside click", async () => {
    render(<CurrentCommandBar />);
    const trigger = screen.getByRole("button", { name: "Project menu for Campaign Study" });
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getAllByRole("menuitem")[0]).toHaveFocus());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Project menu" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu", { name: "Project menu" })).not.toBeInTheDocument();
  });

  it("keeps project actions accessible from the menu", () => {
    render(<CurrentCommandBar />);
    fireEvent.click(screen.getByRole("button", { name: "Project menu for Campaign Study" }));
    for (const name of [
      "Open welcome",
      "New project",
      "Project settings",
      "Save project",
      "Open project",
      "Open project folder",
      "Export shareable workflow",
      "Keyboard shortcuts",
    ]) {
      expect(screen.getByRole("menuitem", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Cost details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Version history" })).toBeInTheDocument();
  });
});
