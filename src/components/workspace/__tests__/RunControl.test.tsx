import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RunControl } from "@/components/workspace/RunControl";

const mockExecuteWorkflow = vi.fn();
const mockRegenerateNode = vi.fn();
const mockExecuteSelectedNodes = vi.fn();
const mockStopWorkflow = vi.fn();
const mockMockTutorialExecution = vi.fn();
const mockValidateWorkflow = vi.fn();
const mockUseWorkflowStore = vi.fn();
const mockFTUXState = {
  tutorialActive: false,
  lockedFeatures: false,
  currentTutorialStep: 0,
  tutorialSteps: [] as Array<{ id: string }>,
};

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) =>
    mockUseWorkflowStore(selector),
}));

vi.mock("@/store/ftuxStore", () => ({
  useFTUXStore: {
    getState: () => mockFTUXState,
    subscribe: vi.fn(() => () => undefined),
  },
}));

function createState(overrides: Record<string, unknown> = {}) {
  return {
    nodes: [],
    isRunning: false,
    currentNodeIds: [],
    executeWorkflow: mockExecuteWorkflow,
    regenerateNode: mockRegenerateNode,
    executeSelectedNodes: mockExecuteSelectedNodes,
    stopWorkflow: mockStopWorkflow,
    mockTutorialExecution: mockMockTutorialExecution,
    validateWorkflow: mockValidateWorkflow,
    ...overrides,
  };
}

describe("RunControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockFTUXState, {
      tutorialActive: false,
      lockedFeatures: false,
      currentTutorialStep: 0,
      tutorialSteps: [],
    });
    mockValidateWorkflow.mockReturnValue({ valid: true, errors: [] });
    mockUseWorkflowStore.mockImplementation((selector) => selector(createState()));
  });

  it("runs a valid idle workflow", () => {
    render(<RunControl />);
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(mockExecuteWorkflow).toHaveBeenCalledOnce();
  });

  it("stops an active workflow", () => {
    mockUseWorkflowStore.mockImplementation((selector) =>
      selector(createState({ isRunning: true, currentNodeIds: ["one", "two"] }))
    );
    render(<RunControl />);
    fireEvent.click(screen.getByRole("button", { name: "Stop workflow" }));
    expect(mockStopWorkflow).toHaveBeenCalledOnce();
    expect(screen.getByText("Running 2 nodes")).toBeInTheDocument();
  });

  it("disables invalid idle execution with a readable reason", () => {
    mockValidateWorkflow.mockReturnValue({
      valid: false,
      errors: ["Connect an output node"],
    });
    render(<RunControl />);
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
    expect(screen.getByText("Connect an output node")).toBeInTheDocument();
  });

  it("uses mock execution on the tutorial run step", () => {
    Object.assign(mockFTUXState, {
      tutorialActive: true,
      currentTutorialStep: 0,
      tutorialSteps: [{ id: "run-workflow" }],
    });
    render(<RunControl />);
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(mockMockTutorialExecution).toHaveBeenCalledOnce();
    expect(mockExecuteWorkflow).not.toHaveBeenCalled();
  });

  it("offers all run modes with selection-aware disabled states", () => {
    const nodes = [
      { id: "one", selected: true, data: {}, type: "prompt" },
      { id: "two", selected: false, data: {}, type: "output" },
    ];
    mockUseWorkflowStore.mockImplementation((selector) =>
      selector(createState({ nodes }))
    );
    render(<RunControl />);
    fireEvent.click(screen.getByRole("button", { name: "Run options" }));

    fireEvent.click(screen.getByRole("menuitem", { name: "Run entire workflow" }));
    expect(mockExecuteWorkflow).toHaveBeenCalledWith();

    fireEvent.click(screen.getByRole("button", { name: "Run options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Run from selected node" }));
    expect(mockExecuteWorkflow).toHaveBeenCalledWith("one");

    fireEvent.click(screen.getByRole("button", { name: "Run options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Run selected node only" }));
    expect(mockRegenerateNode).toHaveBeenCalledWith("one");

    fireEvent.click(screen.getByRole("button", { name: "Run options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Run 1 selected node" }));
    expect(mockExecuteSelectedNodes).toHaveBeenCalledWith(["one"]);
  });

  it("disables selection run modes when no nodes are selected", () => {
    render(<RunControl />);
    fireEvent.click(screen.getByRole("button", { name: "Run options" }));
    expect(screen.getByRole("menuitem", { name: "Run from selected node" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Run selected node only" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Run selected nodes" })).toBeDisabled();
  });

  it("closes run options with Escape and outside click", () => {
    render(<RunControl />);
    const options = screen.getByRole("button", { name: "Run options" });
    fireEvent.click(options);
    expect(screen.getByRole("menu", { name: "Run options" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Run options" })).not.toBeInTheDocument();

    fireEvent.click(options);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu", { name: "Run options" })).not.toBeInTheDocument();
  });

  it("keeps tutorial selectors on the run controls", () => {
    render(<RunControl />);
    expect(screen.getByRole("button", { name: "Run" })).toHaveAttribute(
      "data-tutorial",
      "floating-run-button"
    );
    expect(screen.getByRole("button", { name: "Run options" })).toHaveAttribute(
      "data-tutorial",
      "floating-run-dropdown"
    );
  });
});
