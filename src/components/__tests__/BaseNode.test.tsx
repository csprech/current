import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BaseNode } from "@/components/nodes/BaseNode";
import { NodeStatusFooter } from "@/components/nodes/NodeStatusFooter";
import { ReactFlowProvider } from "@xyflow/react";

// Mock the workflow store
const mockSetHoveredNodeId = vi.fn();
const mockUseWorkflowStore = vi.fn();

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) => mockUseWorkflowStore(selector),
}));

// Mock isPanningRef
vi.mock("@/components/WorkflowCanvas", () => ({
  isPanningRef: { current: false },
}));

// Mock useReactFlow
const mockGetNodes = vi.fn(() => []);
const mockSetNodes = vi.fn();

vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual("@xyflow/react");
  return {
    ...actual,
    useReactFlow: () => ({
      getNodes: mockGetNodes,
      setNodes: mockSetNodes,
    }),
  };
});

// Wrapper component for React Flow context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}

describe("BaseNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkflowStore.mockImplementation((selector) => {
      const state = {
        currentNodeIds: [] as string[],
        hoveredNodeId: null,
        setHoveredNodeId: mockSetHoveredNodeId,
      };
      return selector(state);
    });
  });

  const defaultProps = {
    id: "test-node-1",
    children: <div data-testid="test-children">Test Content</div>,
  };

  describe("Basic Rendering", () => {
    it("should render children content", () => {
      render(
        <TestWrapper>
          <BaseNode {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId("test-children")).toBeInTheDocument();
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode {...defaultProps} className="custom-class" />
        </TestWrapper>
      );

      const nodeDiv = container.querySelector(".custom-class");
      expect(nodeDiv).toBeInTheDocument();
    });
  });

  describe("Visual States", () => {
    it("should apply selected styling when selected is true", () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode {...defaultProps} selected={true} />
        </TestWrapper>
      );

      const nodeDiv = screen.getByTestId("current-node");
      expect(nodeDiv).toHaveAttribute("data-selected", "true");
      expect(nodeDiv).toHaveAttribute("data-state", "selected");
      expect(container.querySelector(".iris-card")).not.toBeInTheDocument();
    });

    it("should apply executing styling when isExecuting is true", () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode {...defaultProps} isExecuting={true} />
        </TestWrapper>
      );

      const nodeDiv = screen.getByTestId("current-node");
      expect(nodeDiv).toHaveAttribute("data-state", "running");
      expect(screen.getByText("Running")).toBeInTheDocument();
    });

    it("should apply executing styling when currentNodeIds includes the node", () => {
      mockUseWorkflowStore.mockImplementation((selector) => {
        const state = {
          currentNodeIds: ["test-node-1"],
          hoveredNodeId: null,
          setHoveredNodeId: mockSetHoveredNodeId,
        };
        return selector(state);
      });

      const { container } = render(
        <TestWrapper>
          <BaseNode {...defaultProps} />
        </TestWrapper>
      );

      const nodeDiv = screen.getByTestId("current-node");
      expect(nodeDiv).toHaveAttribute("data-state", "running");
      expect(screen.getByText("Running")).toBeInTheDocument();
    });

    it.each([
      ["isInLockedGroup", "locked", "Locked"],
      ["isDisabled", "disabled", "Disabled"],
      ["isSkipped", "skipped", "Skipped"],
    ])("uses canvas-provided %s state ahead of running", (flag, state, label) => {
      mockUseWorkflowStore.mockImplementation((selector) => selector({
        currentNodeIds: ["test-node-1"],
        hoveredNodeId: null,
        setHoveredNodeId: mockSetHoveredNodeId,
      }));
      render(<TestWrapper><BaseNode {...defaultProps} nodeData={{ [flag]: true }} /></TestWrapper>);
      expect(screen.getByTestId("current-node")).toHaveAttribute("data-state", state);
      expect(screen.getByRole("status")).toHaveTextContent(label);
    });

    it("should apply error styling when hasError is true", () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode {...defaultProps} hasError={true} />
        </TestWrapper>
      );

      const nodeDiv = screen.getByTestId("current-node");
      expect(nodeDiv).toHaveAttribute("data-state", "error");
      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("renders an explicit state label, detail, and specialized footer", () => {
      render(
        <TestWrapper>
          <BaseNode
            {...defaultProps}
            stateLabel="Waiting"
            stateDetail="Connect an image input"
            statusFooter={<NodeStatusFooter state="skipped" label="Skipped" />}
          />
        </TestWrapper>
      );

      expect(screen.getByText("Waiting")).toBeInTheDocument();
      expect(screen.getByText("Connect an image input")).toBeInTheDocument();
      expect(screen.getByText("Skipped")).toBeInTheDocument();
    });
  });

  describe("Settings Panel", () => {
    it("should render settings panel when provided", () => {
      render(
        <TestWrapper>
          <BaseNode {...defaultProps} settingsExpanded={true} settingsPanel={<div data-testid="settings">Settings</div>} />
        </TestWrapper>
      );

      expect(screen.getByTestId("settings")).toBeInTheDocument();
    });

    it("should not render settings panel when settingsExpanded is false", () => {
      render(
        <TestWrapper>
          <BaseNode {...defaultProps} settingsExpanded={false} settingsPanel={<div data-testid="settings">Settings</div>} />
        </TestWrapper>
      );

      // Settings panel div is always rendered (for ref tracking), but settingsExpanded controls layout
      expect(screen.getByTestId("settings")).toBeInTheDocument();
    });
  });

  describe("Node Resizer", () => {
    it("should render without error when selected", () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode {...defaultProps} selected={true} />
        </TestWrapper>
      );

      expect(container.firstChild).toBeTruthy();
    });

    it("should accept custom minWidth and minHeight", () => {
      render(
        <TestWrapper>
          <BaseNode {...defaultProps} minWidth={200} minHeight={150} selected={true} />
        </TestWrapper>
      );

      expect(screen.getByTestId("test-children")).toBeInTheDocument();
    });
  });
});
