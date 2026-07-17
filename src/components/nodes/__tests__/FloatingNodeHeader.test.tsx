import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingNodeHeader } from "@/components/nodes/FloatingNodeHeader";

const setNodes = vi.fn();
const getNodes = vi.fn(() => []);
const removeNode = vi.fn();
const duplicateNodes = vi.fn();
const executeWorkflow = vi.fn();
const showToast = vi.fn();

const storeState = {
  hoveredNodeId: null,
  removeNode,
  duplicateNodes,
  executeWorkflow,
  isRunning: false,
  nodes: [
    {
      id: "generate-1",
      type: "nanoBanana",
      position: { x: 0, y: 0 },
      data: { outputImage: "data:image/png;base64,abc" },
    },
    { id: "router-1", type: "router", position: { x: 0, y: 0 }, data: {} },
  ],
};

vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    setNodes,
    getNodes,
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  }),
}));

vi.mock("@/store/workflowStore", () => {
  const useWorkflowStore = (selector: (state: unknown) => unknown) => selector(storeState);
  useWorkflowStore.getState = () => storeState;
  return { useWorkflowStore };
});

vi.mock("@/components/Toast", () => ({
  useToast: { getState: () => ({ show: showToast }) },
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

  it("presents Run as the primary node action without changing execution", () => {
    const onRunNode = vi.fn();

    render(
      <FloatingNodeHeader
        id="generate-1"
        type="nanoBanana"
        position={{ x: 10, y: 20 }}
        width={320}
        selected
        title="Generate Image"
        onRunNode={onRunNode}
      />
    );

    const run = screen.getByRole("button", { name: "Run this node" });
    expect(run).toHaveClass(
      "current-media-action",
      "current-media-action--primary",
      "current-node-header__run"
    );
    expect(run).not.toHaveClass("text-neutral-500");
    expect(run).not.toHaveClass("border-neutral-600");

    fireEvent.click(run);
    expect(onRunNode).toHaveBeenCalledExactlyOnceWith("generate-1");
  });

  it("disables Run while the node is executing", () => {
    const onRunNode = vi.fn();

    render(
      <FloatingNodeHeader
        id="generate-1"
        type="nanoBanana"
        isExecuting
        position={{ x: 10, y: 20 }}
        width={320}
        selected
        title="Generate Image"
        onRunNode={onRunNode}
      />
    );

    const run = screen.getByRole("button", { name: "Run this node" });
    expect(run).toBeDisabled();

    fireEvent.click(run);
    expect(onRunNode).not.toHaveBeenCalled();
  });

  it("opens the contextual menu from the keyboard and returns focus on Escape", () => {
    render(
      <FloatingNodeHeader
        id="generate-1"
        type="nanoBanana"
        position={{ x: 10, y: 20 }}
        width={320}
        selected
        title="Generate Image"
      />
    );

    const more = screen.getByRole("button", { name: "More node actions" });
    fireEvent.keyDown(more, { key: "ArrowDown" });

    expect(screen.getByRole("menu", { name: "Node actions" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Node actions" })).not.toBeInTheDocument();
    expect(more).toHaveFocus();
  });

  it("runs the existing delete action and closes when clicking outside", () => {
    render(
      <FloatingNodeHeader
        id="router-1"
        type="router"
        position={{ x: 0, y: 0 }}
        width={280}
        selected
        title="Router"
      />
    );

    const more = screen.getByRole("button", { name: "More node actions" });
    expect(more).toHaveClass("nodrag", "nopan");
    fireEvent.click(more);
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete Node" }));
    expect(removeNode).toHaveBeenCalledWith("router-1");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(more);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("duplicates the node and runs from it via the contextual menu", () => {
    render(
      <FloatingNodeHeader
        id="generate-1"
        type="nanoBanana"
        position={{ x: 10, y: 20 }}
        width={320}
        selected
        title="Generate Image"
      />
    );

    const more = screen.getByRole("button", { name: "More node actions" });

    fireEvent.click(more);
    fireEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(duplicateNodes).toHaveBeenCalledExactlyOnceWith(["generate-1"]);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(more);
    fireEvent.click(screen.getByRole("menuitem", { name: "Run from Here" }));
    expect(executeWorkflow).toHaveBeenCalledExactlyOnceWith("generate-1");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("offers Copy Image only for nodes with an image output", () => {
    const { rerender } = render(
      <FloatingNodeHeader
        id="generate-1"
        type="nanoBanana"
        position={{ x: 10, y: 20 }}
        width={320}
        selected
        title="Generate Image"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "More node actions" }));
    expect(screen.getByRole("menuitem", { name: "Copy Image" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    rerender(
      <FloatingNodeHeader
        id="router-1"
        type="router"
        position={{ x: 10, y: 20 }}
        width={320}
        selected
        title="Router"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "More node actions" }));
    expect(screen.queryByRole("menuitem", { name: "Copy Image" })).not.toBeInTheDocument();
  });
});
