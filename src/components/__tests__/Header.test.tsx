import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { Header } from "@/components/Header";

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

vi.mock("@/components/ProjectSetupModal", () => ({ ProjectSetupModal: () => null }));
vi.mock("@/components/WorkflowBrowserModal", () => ({ WorkflowBrowserModal: () => null }));
vi.mock("@/components/KeyboardShortcutsDialog", () => ({ KeyboardShortcutsDialog: () => null }));
vi.mock("@/components/CostIndicator", () => ({ CostIndicator: () => null }));
vi.mock("@/components/WorkflowVersionHistory", () => ({ WorkflowVersionHistory: () => null }));

beforeEach(() => {
  mockUseWorkflowStore.mockImplementation((selector) => selector({
    workflowName: "Campaign Study",
    workflowId: "campaign-study",
    saveDirectoryPath: "/tmp/campaign-study",
    hasUnsavedChanges: false,
    lastSavedAt: null,
    isSaving: false,
    setWorkflowMetadata: vi.fn(), saveToFile: vi.fn(), loadWorkflow: vi.fn(),
    getShareableWorkflow: vi.fn(() => ({ name: "Campaign Study" })),
    previousWorkflowSnapshot: null, revertToSnapshot: vi.fn(), shortcutsDialogOpen: false,
    setShortcutsDialogOpen: vi.fn(), setShowQuickstart: vi.fn(), nodes: [],
    getNodesWithComments: vi.fn(() => []), viewedCommentNodeIds: new Set(),
    markCommentViewed: vi.fn(), setNavigationTarget: vi.fn(), workspaceView: "canvas",
    setWorkspaceView: vi.fn(), canUndo: false, canRedo: false, undo: vi.fn(), redo: vi.fn(),
    activeLeftPanel: null, activeRightPanel: null, toggleLeftPanel: vi.fn(), toggleRightPanel: vi.fn(),
    isRunning: false, currentNodeIds: [], executeWorkflow: vi.fn(), regenerateNode: vi.fn(),
    executeSelectedNodes: vi.fn(), stopWorkflow: vi.fn(), mockTutorialExecution: vi.fn(),
    validateWorkflow: vi.fn(() => ({ valid: true, errors: [] })),
  }));
});

it("keeps Header as the Current command bar compatibility export", () => {
  render(<Header />);
  expect(screen.getByRole("banner")).toHaveClass("current-command-bar");
  expect(screen.getByRole("img", { name: "Current" })).toBeInTheDocument();
  expect(screen.getByText("Campaign Study")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Run" })).toHaveLength(1);
});
