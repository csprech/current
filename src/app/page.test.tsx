import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

const initializeAutoSave = vi.fn();
const cleanupAutoSave = vi.fn();
let workflowState: Record<string, unknown>;

vi.mock("@xyflow/react", () => ({ ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: Object.assign(
    (selector: (state: unknown) => unknown) => selector(workflowState),
    { getState: () => workflowState }
  ),
}));
vi.mock("@/store/ftuxStore", () => ({ useFTUXStore: { getState: () => ({ startTutorial: vi.fn() }) } }));
vi.mock("@/store/utils/localStorage", () => ({ getFTUXCompleted: () => true, setFTUXCompleted: vi.fn() }));
vi.mock("@/components/WorkflowCanvas", () => ({ WorkflowCanvas: () => <main>Canvas</main> }));
vi.mock("@/components/onboarding/FTUXModal", () => ({ FTUXModal: () => null }));
vi.mock("@/components/workspace/CurrentCommandBar", () => ({
  CurrentCommandBar: ({ onAddNode }: { onAddNode: () => void }) => <button onClick={onAddNode}>Add node</button>,
}));
vi.mock("@/components/workspace/AddPalette", () => ({
  AddPalette: ({ open }: { open: boolean }) => open ? <div role="dialog" aria-label="Add node">Palette</div> : null,
}));
vi.mock("@/components/workspace/WorkspaceModelSearchDialog", () => ({
  WorkspaceModelSearchDialog: () => <div data-testid="global-model-search-host" />,
}));

describe("Current workspace page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workflowState = {
      initializeAutoSave,
      cleanupAutoSave,
      setShowQuickstart: vi.fn(),
      hasUnsavedChanges: false,
      isModalOpen: false,
      modelSearchOpen: false,
      shortcutsDialogOpen: false,
      showQuickstart: false,
    };
  });

  it("owns one Add Palette and opens it directly from Add", () => {
    render(<Home />);
    expect(screen.getAllByTestId("global-model-search-host")).toHaveLength(1);
    expect(screen.queryByRole("dialog", { name: "Add node" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add node" }));
    expect(screen.getAllByRole("dialog", { name: "Add node" })).toHaveLength(1);
  });

  it("opens once with Cmd/Ctrl+K and prevents browser default", () => {
    render(<Home />);
    const first = new KeyboardEvent("keydown", { key: "k", metaKey: true, cancelable: true });
    act(() => { window.dispatchEvent(first); });
    expect(first.defaultPrevented).toBe(true);
    expect(screen.getAllByRole("dialog", { name: "Add node" })).toHaveLength(1);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getAllByRole("dialog", { name: "Add node" })).toHaveLength(1);
  });

  it.each([
    ["model browser", { modelSearchOpen: true }],
    ["registered modal", { isModalOpen: true }],
    ["shortcuts dialog", { shortcutsDialogOpen: true }],
    ["welcome dialog", { showQuickstart: true }],
  ])("does not stack Add Palette over an open %s", (_name, modalState) => {
    Object.assign(workflowState, modalState);
    render(<Home />);
    const shortcut = new KeyboardEvent("keydown", { key: "k", metaKey: true, cancelable: true });
    act(() => { window.dispatchEvent(shortcut); });
    expect(shortcut.defaultPrevented).toBe(false);
    expect(screen.queryByRole("dialog", { name: "Add node" })).not.toBeInTheDocument();
  });

  it("does not open over a modal rendered outside workflow state", () => {
    render(<Home />);
    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);
    try {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
      expect(screen.queryByRole("dialog", { name: "Add node" })).not.toBeInTheDocument();
    } finally {
      modal.remove();
    }
  });
});
