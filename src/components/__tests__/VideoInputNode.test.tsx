import { fireEvent, render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VideoInputNode } from "@/components/nodes/VideoInputNode";

const mockUpdateNodeData = vi.fn();

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) => selector({
    updateNodeData: mockUpdateNodeData,
    currentNodeIds: [],
    groups: {},
    nodes: [],
    getNodesWithComments: () => [],
    markCommentViewed: vi.fn(),
    setNavigationTarget: vi.fn(),
  }),
}));

vi.mock("@/hooks/useVideoBlobUrl", () => ({ useVideoBlobUrl: () => null }));

const props = {
  id: "video-1",
  type: "videoInput" as const,
  data: { video: null, filename: null, duration: null, dimensions: null, format: null },
  selected: false,
  dragging: false,
  zIndex: 0,
  selectable: true,
  deletable: true,
  draggable: true,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
};

function renderNode() {
  return render(<ReactFlowProvider><VideoInputNode {...props} /></ReactFlowProvider>);
}

describe("VideoInputNode upload recovery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows an inline format validation error", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { container } = renderNode();
    const input = container.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(["x"], "clip.avi", { type: "video/avi" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Unsupported format. Use MP4, WebM, or QuickTime video files.");
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("shows an inline 200MB size validation error", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { container } = renderNode();
    const input = container.querySelector('input[type="file"]')!;
    const file = new File(["x"], "clip.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 201 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Video file too large. Maximum size is 200MB.");
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
