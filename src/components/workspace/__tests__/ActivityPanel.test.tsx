import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityPanel } from "../ActivityPanel";
import { useWorkflowStore } from "@/store/workflowStore";

describe("ActivityPanel", () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      nodes: [
        { id: "running", type: "nanoBanana", position: { x: 0, y: 0 }, data: { progress: 64, isLoading: true } } as never,
        { id: "waiting", type: "output", position: { x: 0, y: 0 }, data: {} } as never,
        { id: "complete", type: "nanoBanana", position: { x: 0, y: 0 }, data: { customTitle: "Finished image", outputImage: "data:image/png;base64,done" } } as never,
      ],
      isRunning: true,
      currentNodeIds: ["running"],
      skippedNodeIds: new Set(),
    });
  });

  it("lists running and waiting nodes without creating execution state", () => {
    render(<ActivityPanel onClose={vi.fn()} />);
    expect(screen.getByText("Generate image")).toBeInTheDocument();
    expect(screen.getByText("64%")).toBeInTheDocument();
    expect(screen.getAllByText("Waiting")).toHaveLength(1);
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });
});
