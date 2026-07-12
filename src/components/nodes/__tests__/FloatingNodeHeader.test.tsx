import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingNodeHeader } from "@/components/nodes/FloatingNodeHeader";

const setNodes = vi.fn();
const getNodes = vi.fn(() => []);

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    setNodes,
    getNodes,
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  }),
}));

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) =>
    selector({ hoveredNodeId: null }),
}));

describe("FloatingNodeHeader", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps title editing and node controls keyboard reachable", () => {
    render(
      <FloatingNodeHeader
        id="generate-1"
        type="nanoBanana"
        position={{ x: 10, y: 20 }}
        width={320}
        selected={false}
        title="Generate Image"
        onRunNode={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Generate Image title" }));
    expect(screen.getByRole("textbox", { name: "Node title" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Add comment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run this node" })).toBeInTheDocument();
  });

  it("presents the node role as part of the Current header identity", () => {
    const { container } = render(
      <FloatingNodeHeader
        id="router-1"
        type="router"
        position={{ x: 0, y: 0 }}
        width={280}
        selected
        title="Router"
      />
    );

    expect(container.querySelector(".current-node-header")).toHaveAttribute("data-role", "router");
  });
});
