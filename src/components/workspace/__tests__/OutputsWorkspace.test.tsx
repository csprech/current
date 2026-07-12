import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OutputsWorkspace } from "../OutputsWorkspace";
import { useWorkflowStore } from "@/store/workflowStore";

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

  it("shows workflow outputs without mutating the canvas", () => {
    const before = useWorkflowStore.getState().nodes;
    render(<OutputsWorkspace />);
    expect(screen.getByRole("main", { name: "Workflow outputs" })).toBeInTheDocument();
    expect(screen.getByText("Latest generations")).toBeInTheDocument();
    expect(screen.getByText("Output nodes")).toBeInTheDocument();
    expect(screen.getByText("Final frame")).toBeInTheDocument();
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

  it("uses the Output node media contract for audio and video fallbacks", () => {
    useWorkflowStore.setState({ nodes: [
      { id: "audio", type: "output", position: { x: 0, y: 0 }, data: { customTitle: "Audio fallback", contentType: "audio", image: "data:audio/mpeg;base64,audio" } } as never,
      { id: "video", type: "output", position: { x: 0, y: 0 }, data: { customTitle: "Video fallback", image: "https://example.com/result.mp4" } } as never,
    ] });
    const { container } = render(<OutputsWorkspace />);
    expect(container.querySelector('audio[src="data:audio/mpeg;base64,audio"]')).toBeInTheDocument();
    expect(container.querySelector('video[src="https://example.com/result.mp4"]')).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });
});
