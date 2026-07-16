import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { OutputsWorkspace } from "../OutputsWorkspace";
import { useWorkflowStore } from "@/store/workflowStore";

vi.mock("@/components/AssetLibrary", () => ({
  AssetLibrary: ({ embedded, thumbnailSize }: { embedded?: boolean; thumbnailSize?: number }) => (
    <div data-testid="asset-library">
      embedded: {String(embedded)} · thumbnail size: {thumbnailSize}
    </div>
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
    expect(screen.getByTestId("asset-library")).toHaveTextContent("embedded: true · thumbnail size: 208");
    expect(useWorkflowStore.getState().nodes).toBe(before);
  });

  it("returns to the canvas through workspace state", () => {
    render(<OutputsWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Back to Canvas" }));
    expect(useWorkflowStore.getState().workspaceView).toBe("canvas");
  });

  it("keeps wheel gestures inside the scrollable workspace", () => {
    const onParentWheel = vi.fn();
    render(<div onWheel={onParentWheel}><OutputsWorkspace /></div>);

    const workspace = screen.getByRole("main", { name: "Workflow outputs" });
    fireEvent.wheel(workspace, { deltaY: 80 });

    expect(onParentWheel).not.toHaveBeenCalled();
    expect(workspace).toHaveClass("nowheel", "overscroll-contain");
  });

  it("lets people adjust the output thumbnail scale", () => {
    render(<OutputsWorkspace />);

    const outputs = screen.getByRole("region", { name: "All outputs" });
    const slider = within(outputs).getByRole("slider", { name: "Thumbnail size" });
    expect(slider).toHaveValue("208");
    expect(outputs).toContainElement(slider);
    expect(screen.getByRole("banner")).not.toContainElement(slider);
    fireEvent.change(slider, { target: { value: "280" } });

    expect(screen.getByTestId("asset-library")).toHaveTextContent("thumbnail size: 280");
  });

  it("is constrained to the workspace instead of growing the page", () => {
    render(<OutputsWorkspace />);
    expect(screen.getByRole("main", { name: "Workflow outputs" })).toHaveClass("absolute", "inset-0", "h-full", "min-h-0", "overflow-y-auto", "nowheel", "overscroll-contain");
  });

});
