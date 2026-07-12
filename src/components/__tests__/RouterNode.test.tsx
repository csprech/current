import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouterNode } from "@/components/nodes/RouterNode";

const { mockEdges } = vi.hoisted(() => ({ mockEdges: [] as Array<Record<string, unknown>> }));

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: vi.fn((selector) => selector({
    edges: mockEdges,
    updateNodeData: vi.fn(),
    currentNodeIds: [],
    setHoveredNodeId: vi.fn(),
  })),
}));

describe("RouterNode", () => {
  beforeEach(() => { mockEdges.length = 0; });
  it("uses the Current chassis and exposes semantic state", () => {
    const { container } = render(
      <ReactFlowProvider>
        <RouterNode
          id="router-1"
          type="router"
          data={{}}
          selected={false}
          dragging={false}
          zIndex={0}
          selectable
          deletable
          draggable
          isConnectable
          positionAbsoluteX={0}
          positionAbsoluteY={0}
        />
      </ReactFlowProvider>
    );
    expect(container.querySelector(".current-node")).toBeInTheDocument();
    expect(screen.getByTestId("current-node")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ready");
    expect(screen.getByText("No active routes")).toBeInTheDocument();
  });

  it("uses centralized Current colors and accessible names for typed routes", () => {
    mockEdges.push({ id: "edge-1", source: "prompt-1", target: "router-1", targetHandle: "text" });
    render(<ReactFlowProvider><RouterNode id="router-1" type="router" data={{}} selected={false} dragging={false} zIndex={0} selectable deletable draggable isConnectable positionAbsoluteX={0} positionAbsoluteY={0} /></ReactFlowProvider>);
    const textPorts = screen.getAllByLabelText("Text connection port");
    expect(textPorts).toHaveLength(2);
    for (const port of textPorts) expect(port).toHaveStyle({ backgroundColor: "var(--current-blue)" });
  });
});
