import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkflowStore } from "../workflowStore";

vi.mock("@/components/Toast", () => ({
  useToast: {
    getState: () => ({
      show: vi.fn(),
    }),
  },
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    startSession: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn().mockResolvedValue(undefined),
    getCurrentSession: vi.fn().mockReturnValue(null),
  },
}));

const mockLocalStorage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  }),
});

describe("workspace panel state", () => {
  beforeEach(() => {
    const store = useWorkflowStore.getState();
    store.clearWorkflow();
    store.setActiveLeftPanel(null);
    store.setActiveRightPanel(null);
    store.setWorkspaceView("canvas");
  });

  it("starts with both panels closed and the canvas visible", () => {
    const initialState = useWorkflowStore.getInitialState();

    expect(initialState.activeLeftPanel).toBeNull();
    expect(initialState.activeRightPanel).toBeNull();
    expect(initialState.workspaceView).toBe("canvas");
  });

  it("keeps at most one panel open on each side", () => {
    const store = useWorkflowStore.getState();
    store.setActiveLeftPanel("library");
    store.setActiveRightPanel("assistant");

    expect(useWorkflowStore.getState().activeLeftPanel).toBe("library");
    expect(useWorkflowStore.getState().activeRightPanel).toBe("assistant");
  });

  it("sets, replaces, and clears panels on each side", () => {
    const store = useWorkflowStore.getState();
    store.setActiveLeftPanel("library");
    store.setActiveRightPanel("assistant");
    store.setActiveRightPanel("activity");

    expect(useWorkflowStore.getState().activeLeftPanel).toBe("library");
    expect(useWorkflowStore.getState().activeRightPanel).toBe("activity");

    store.setActiveLeftPanel(null);
    store.setActiveRightPanel(null);

    expect(useWorkflowStore.getState().activeLeftPanel).toBeNull();
    expect(useWorkflowStore.getState().activeRightPanel).toBeNull();
  });

  it("toggles an already-open panel closed", () => {
    const store = useWorkflowStore.getState();
    store.toggleRightPanel("activity");
    store.toggleRightPanel("activity");

    expect(useWorkflowStore.getState().activeRightPanel).toBeNull();
  });

  it("toggles the left panel open and closed", () => {
    const store = useWorkflowStore.getState();
    store.toggleLeftPanel("library");
    expect(useWorkflowStore.getState().activeLeftPanel).toBe("library");

    store.toggleLeftPanel("library");
    expect(useWorkflowStore.getState().activeLeftPanel).toBeNull();
  });

  it("replaces the open right panel when toggling a different panel", () => {
    const store = useWorkflowStore.getState();
    store.toggleRightPanel("assistant");
    store.toggleRightPanel("activity");

    expect(useWorkflowStore.getState().activeRightPanel).toBe("activity");
  });

  it("switches between canvas and outputs without changing workflow data", () => {
    const before = useWorkflowStore.getState().nodes;
    useWorkflowStore.getState().setWorkspaceView("outputs");

    expect(useWorkflowStore.getState().workspaceView).toBe("outputs");
    expect(useWorkflowStore.getState().nodes).toBe(before);
  });

  it("does not mark panel or view changes as unsaved or add undo history", () => {
    const store = useWorkflowStore.getState();

    store.setActiveLeftPanel("library");
    store.toggleRightPanel("assistant");
    store.setWorkspaceView("outputs");

    expect(useWorkflowStore.getState().hasUnsavedChanges).toBe(false);
    expect(useWorkflowStore.getState().canUndo).toBe(false);
    expect(useWorkflowStore.getState().canRedo).toBe(false);
  });

  it("does not change existing undo or redo availability", () => {
    let store = useWorkflowStore.getState();
    store.addNode("prompt", { x: 0, y: 0 });
    store.undo();
    store = useWorkflowStore.getState();

    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(true);

    store.setActiveLeftPanel("library");
    store.setActiveRightPanel("assistant");
    store.setWorkspaceView("outputs");

    expect(useWorkflowStore.getState().canUndo).toBe(false);
    expect(useWorkflowStore.getState().canRedo).toBe(true);
  });

  it("excludes presentation state from shareable workflows", () => {
    const store = useWorkflowStore.getState();
    store.setActiveLeftPanel("library");
    store.setActiveRightPanel("assistant");
    store.setWorkspaceView("outputs");

    const workflow = store.getShareableWorkflow();

    expect(workflow).not.toHaveProperty("activeLeftPanel");
    expect(workflow).not.toHaveProperty("activeRightPanel");
    expect(workflow).not.toHaveProperty("workspaceView");
  });

  it("preserves presentation state when clearing workflow data", () => {
    const store = useWorkflowStore.getState();
    store.setActiveLeftPanel("library");
    store.setActiveRightPanel("activity");
    store.setWorkspaceView("outputs");
    store.addNode("prompt", { x: 0, y: 0 });

    store.clearWorkflow();

    const next = useWorkflowStore.getState();
    expect(next.nodes).toEqual([]);
    expect(next.activeLeftPanel).toBe("library");
    expect(next.activeRightPanel).toBe("activity");
    expect(next.workspaceView).toBe("outputs");
  });

  it("preserves presentation state when loading workflow data", async () => {
    const store = useWorkflowStore.getState();
    store.setActiveLeftPanel("library");
    store.setActiveRightPanel("assistant");
    store.setWorkspaceView("outputs");

    await store.loadWorkflow({
      version: 1,
      name: "Loaded workflow",
      nodes: [],
      edges: [],
      edgeStyle: "curved",
    });

    const next = useWorkflowStore.getState();
    expect(next.activeLeftPanel).toBe("library");
    expect(next.activeRightPanel).toBe("assistant");
    expect(next.workspaceView).toBe("outputs");
  });

  it("does not restore presentation state when undoing workflow data", () => {
    const store = useWorkflowStore.getState();
    store.setActiveLeftPanel("library");
    store.setActiveRightPanel("assistant");
    store.setWorkspaceView("outputs");
    store.addNode("prompt", { x: 0, y: 0 });

    store.setActiveRightPanel("activity");
    store.setWorkspaceView("canvas");
    store.undo();

    const next = useWorkflowStore.getState();
    expect(next.nodes).toEqual([]);
    expect(next.activeLeftPanel).toBe("library");
    expect(next.activeRightPanel).toBe("activity");
    expect(next.workspaceView).toBe("canvas");
  });
});
