import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VideoTrimNode } from "@/components/nodes/VideoTrimNode";
import { VideoFrameGrabNode } from "@/components/nodes/VideoFrameGrabNode";
import type { VideoFrameGrabNodeData, VideoTrimNodeData } from "@/types";

const updateNodeData = vi.fn();
const regenerateNode = vi.fn();
let storeState: Record<string, unknown>;

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector: (state: Record<string, unknown>) => unknown) => selector(storeState),
}));
vi.mock("@/components/nodes/BaseNode", () => ({
  BaseNode: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));
vi.mock("@/components/nodes/CurrentHandle", () => ({ CurrentHandle: () => null }));
vi.mock("@/components/nodes/HandleLabel", () => ({ HandleLabel: () => null }));
vi.mock("@/hooks/useStitchVideos", () => ({ checkEncoderSupport: vi.fn(async () => true) }));
vi.mock("@/hooks/useVideoBlobUrl", () => ({ useVideoBlobUrl: (url: string | null) => url }));
vi.mock("@/hooks/useVideoAutoplay", () => ({ useVideoAutoplay: () => ({ current: null }) }));
vi.mock("@/hooks/useAdaptiveImageSrc", () => ({ useAdaptiveImageSrc: (url: string | null) => url }));
vi.mock("@/hooks/useShowHandleLabels", () => ({ useShowHandleLabels: () => false }));

const sourceNode = { id: "source", data: { outputVideo: "https://example.com/source.mp4" } };
const sourceEdge = { id: "edge", source: "source", target: "utility", targetHandle: "video" };

describe("video utility node regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState = {
      updateNodeData,
      regenerateNode,
      isRunning: false,
      nodes: [sourceNode],
      edges: [sourceEdge],
    };
  });

  it("keeps trim ranges editable and executes the configured trim", () => {
    const data: VideoTrimNodeData = {
      startTime: 1,
      endTime: 8,
      duration: 10,
      outputVideo: null,
      status: "idle",
      error: null,
      progress: 0,
      encoderSupported: true,
    };
    const props = { id: "utility", data, selected: false } as unknown as Parameters<typeof VideoTrimNode>[0];
    const { container } = render(<VideoTrimNode {...props} />);
    const sliders = container.querySelectorAll<HTMLInputElement>('input[type="range"]');
    fireEvent.change(sliders[0], { target: { value: "2" } });
    expect(updateNodeData).toHaveBeenCalledWith("utility", { startTime: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Trim" }));
    expect(regenerateNode).toHaveBeenCalledWith("utility");
  });

  it("keeps frame-position selection and extraction functional", () => {
    const data: VideoFrameGrabNodeData = {
      framePosition: "first",
      outputImage: null,
      status: "idle",
      error: null,
    };
    const props = { id: "utility", data, selected: false } as unknown as Parameters<typeof VideoFrameGrabNode>[0];
    render(<VideoFrameGrabNode {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Last" }));
    expect(updateNodeData).toHaveBeenCalledWith("utility", { framePosition: "last", outputImage: null });
    fireEvent.click(screen.getByRole("button", { name: "Extract Frame" }));
    expect(regenerateNode).toHaveBeenCalledWith("utility");
  });
});
