import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OutputsWorkspace } from "../OutputsWorkspace";
import { useWorkflowStore } from "@/store/workflowStore";

vi.mock("@/components/AssetLibrary", () => ({
  AssetLibrary: ({ embedded }: { embedded?: boolean }) => (
    <div data-testid="asset-library">embedded: {String(embedded)}</div>
  ),
}));

describe("OutputsWorkspace", () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      nodes: [
        { id: "output", type: "output", position: { x: 0, y: 0 }, data: { image: "data:image/png;base64,one", customTitle: "Final frame" } } as never,
      ],
      globalImageHistory: [{ id: "history", image: "data:image/png;base64,two", timestamp: 1, prompt: "Latest", aspectRatio: "1:1", model: "nano-banana" }],
      workspaceView: "outputs",
    });
  });

  it("uses the asset browser as the Outputs workspace without mutating the canvas", () => {
    const before = useWorkflowStore.getState().nodes;
    render(<OutputsWorkspace />);
    expect(screen.getByRole("main", { name: "Workflow outputs" })).toBeInTheDocument();
    expect(screen.getByText("All outputs")).toBeInTheDocument();
    expect(screen.getByTestId("asset-library")).toHaveTextContent("embedded: true");
    expect(useWorkflowStore.getState().nodes).toBe(before);
  });

  it("returns to the canvas through workspace state", () => {
    render(<OutputsWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Back to Canvas" }));
    expect(useWorkflowStore.getState().workspaceView).toBe("canvas");
  });

  it("is constrained to the workspace instead of growing the page", () => {
    render(<OutputsWorkspace />);
    expect(screen.getByRole("main", { name: "Workflow outputs" })).toHaveClass("absolute", "inset-0", "h-full", "min-h-0", "overflow-y-auto");
  });

});
