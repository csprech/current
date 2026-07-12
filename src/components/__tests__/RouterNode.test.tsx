import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { describe, expect, it, vi } from "vitest";
import { RouterNode } from "@/components/nodes/RouterNode";

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: vi.fn((selector) => selector({
    edges: [],
    updateNodeData: vi.fn(),
    currentNodeIds: [],
    setHoveredNodeId: vi.fn(),
  })),
}));

describe("RouterNode", () => {
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
    expect(container.querySelector(".iris-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("current-node")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ready");
  });
});
