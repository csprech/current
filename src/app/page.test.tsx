import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

const initializeAutoSave = vi.fn();
const cleanupAutoSave = vi.fn();

vi.mock("@xyflow/react", () => ({ ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: Object.assign(
    (selector: (state: unknown) => unknown) => selector({ initializeAutoSave, cleanupAutoSave, setShowQuickstart: vi.fn() }),
    { getState: () => ({ hasUnsavedChanges: false }) }
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

describe("Current workspace page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("owns one Add Palette and opens it directly from Add", () => {
    render(<Home />);
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
});
