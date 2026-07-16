import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
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
  ProjectSetupModal: function MockProjectSetupModal({
    isOpen,
    onSave,
    initialTab,
  }: {
    isOpen: boolean;
    onSave: (id: string, name: string, path: string) => void | boolean | Promise<void | boolean>;
    initialTab?: string;
  }) {
    const [name, setName] = useState("New Project");
    const [path, setPath] = useState("/tmp/new-project");
    const [saveError, setSaveError] = useState<string | null>(null);
    if (!isOpen) return null;
    return (
      <div role="dialog" aria-label="Project setup">
        <span>Initial tab: {initialTab || "project"}</span>
        <label>Project name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Project location<input value={path} onChange={(event) => setPath(event.target.value)} /></label>
        {saveError && <div role="alert">{saveError}</div>}
        <button type="button" onClick={async () => {
          setSaveError(null);
          const saved = await onSave("new-project", name, path);
          if (saved === false) setSaveError("Failed to save project. Please try again.");
        }}>
          Complete project setup
        </button>
      </div>
    );
  },
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
    setShowQuickstart: vi.fn(),
    listWorkflowVersions: mockListWorkflowVersions,
    restoreWorkflowVersion: mockRestoreWorkflowVersion,
    ...overrides,
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

  it("opens Provider settings directly from the command-bar API key control", () => {
    render(<ProjectMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Configure API keys" }));

    expect(screen.getByRole("dialog", { name: "Project setup" })).toHaveTextContent("Initial tab: providers");
  });

  it("asks before reverting AI changes without using browser confirm", () => {
    const revertToSnapshot = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    mockUseWorkflowStore.mockImplementation((selector) => selector(createState({
      previousWorkflowSnapshot: { nodes: [], edges: [] },
      revertToSnapshot,
    })));
    render(<ProjectMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Project menu for Campaign Study" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Revert AI changes" }));

    expect(screen.getByRole("alertdialog", { name: "Revert AI changes?" })).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Revert changes" }));
    expect(revertToSnapshot).toHaveBeenCalledOnce();
  });

  it("shows and dismisses an inline open-folder error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("offline"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<ProjectMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Project menu for Campaign Study" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open project folder" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to open project folder. Please try again.");
    expect(alertSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an inline error when a configured save returns false", async () => {
    const saveToFile = vi.fn().mockResolvedValue(false);
    mockUseWorkflowStore.mockImplementation((selector) => selector(createState({ saveToFile })));
    render(<ProjectMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Save project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to save project. Please try again.");
    expect(saveToFile).toHaveBeenCalledOnce();
  });

  it.each([
    ["returns false", () => vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)],
    ["rejects", () => vi.fn().mockRejectedValueOnce(new Error("disk unavailable")).mockResolvedValueOnce(true)],
  ])("keeps first-save context when saving %s and closes after a successful retry", async (_label, createSaveMock) => {
    const saveToFile = createSaveMock();
    const setWorkflowMetadata = vi.fn();
    mockUseWorkflowStore.mockImplementation((selector) => selector(createState({
      workflowName: null,
      workflowId: null,
      saveDirectoryPath: null,
      saveToFile,
      setWorkflowMetadata,
    })));
    render(<ProjectMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Configure save location" }));
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Launch Film" } });
    fireEvent.change(screen.getByLabelText("Project location"), { target: { value: "/tmp/launch-film" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete project setup" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to save project. Please try again.");
    expect(screen.getByRole("dialog", { name: "Project setup" })).toBeInTheDocument();
    expect(screen.getByLabelText("Project name")).toHaveValue("Launch Film");
    expect(screen.getByLabelText("Project location")).toHaveValue("/tmp/launch-film");
    expect(setWorkflowMetadata).toHaveBeenCalledWith("new-project", "Launch Film", "/tmp/launch-film");
    expect(saveToFile).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Complete project setup" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Project setup" })).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(saveToFile).toHaveBeenCalledTimes(2);
  });

  it("shows an inline error when a configured save rejects", async () => {
    const saveToFile = vi.fn().mockRejectedValue(new Error("disk unavailable"));
    mockUseWorkflowStore.mockImplementation((selector) => selector(createState({ saveToFile })));
    render(<ProjectMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Save project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to save project. Please try again.");
    expect(saveToFile).toHaveBeenCalledOnce();
  });

  it("clears a stale save error after a successful save", async () => {
    const saveToFile = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    mockUseWorkflowStore.mockImplementation((selector) => selector(createState({ saveToFile })));
    render(<ProjectMenu />);

    const saveButton = screen.getByRole("button", { name: "Save project" });
    fireEvent.click(saveButton);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    fireEvent.click(saveButton);
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(saveToFile).toHaveBeenCalledTimes(2);
  });

  it("clears a stale open-folder error before a successful retry", async () => {
    vi.spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) } as Response);
    render(<ProjectMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Project menu for Campaign Study" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open project folder" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Project menu for Campaign Study" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open project folder" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
