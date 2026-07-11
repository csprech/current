import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectMenu } from "@/components/workspace/ProjectMenu";

const mockUseWorkflowStore = vi.fn();
const mockListWorkflowVersions = vi.fn();
const mockRestoreWorkflowVersion = vi.fn();

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) =>
    mockUseWorkflowStore(selector),
}));

vi.mock("@/components/ProjectSetupModal", () => ({
  ProjectSetupModal: () => null,
}));

vi.mock("@/components/WorkflowBrowserModal", () => ({
  WorkflowBrowserModal: () => null,
}));

vi.mock("@/components/KeyboardShortcutsDialog", () => ({
  KeyboardShortcutsDialog: () => null,
}));

vi.mock("@/components/CostIndicator", () => ({
  CostIndicator: () => null,
}));

function createState() {
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
    setShowQuickstart: vi.fn(),
    listWorkflowVersions: mockListWorkflowVersions,
    restoreWorkflowVersion: mockRestoreWorkflowVersion,
  };
}

describe("ProjectMenu version history integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListWorkflowVersions.mockResolvedValue([
      { id: "1720000000000", timestamp: 1720000000000, size: 2048 },
    ]);
    mockRestoreWorkflowVersion.mockResolvedValue(true);
    mockUseWorkflowStore.mockImplementation((selector) => selector(createState()));
  });

  it("restores a version after the project popover dismisses", async () => {
    render(<ProjectMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Project menu for Campaign Study" }));
    fireEvent.click(screen.getByRole("button", { name: "Version history" }));
    const restoreButton = await screen.findByRole("button", { name: "Restore" });

    fireEvent.mouseDown(restoreButton);
    expect(screen.queryByRole("menu", { name: "Project menu" })).not.toBeInTheDocument();
    fireEvent.mouseUp(restoreButton);
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(mockRestoreWorkflowVersion).toHaveBeenCalledWith("1720000000000");
    });
  });
});
