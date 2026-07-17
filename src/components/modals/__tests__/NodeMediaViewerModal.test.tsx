import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NodeMediaViewerModal } from "@/components/modals/NodeMediaViewerModal";
import { useMediaViewerStore } from "@/store/mediaViewerStore";

const updateNodeData = vi.fn();
const addNode = vi.fn().mockReturnValue("imageInput-99");

const imageNode = {
  id: "gen-1",
  type: "nanoBanana",
  position: { x: 100, y: 100 },
  data: {
    outputImage: "data:image/png;base64,committed",
    selectedHistoryIndex: 0,
    imageHistory: [
      { id: "h1", timestamp: 1700000000000, prompt: "a red fox", aspectRatio: "1:1", model: "nano-banana" },
      { id: "h2", timestamp: 1700000100000, prompt: "a blue fox", aspectRatio: "1:1", model: "nano-banana" },
    ],
    selectedModel: { provider: "gemini", modelId: "nano-banana", displayName: "Nano Banana" },
    model: "nano-banana",
    resolution: "1K",
  },
};

const storeState = {
  nodes: [imageNode],
  generationsPath: "/tmp/generations",
  updateNodeData,
  addNode,
};

vi.mock("@/store/workflowStore", () => {
  const useWorkflowStore = (selector: (state: unknown) => unknown) => selector(storeState);
  useWorkflowStore.getState = () => storeState;
  return { useWorkflowStore };
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("NodeMediaViewerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, image: "data:image/png;base64,loaded-h2" }),
    });
    act(() => useMediaViewerStore.getState().close());
  });

  it("renders nothing while closed", () => {
    render(<NodeMediaViewerModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the history grid and metadata for the committed item", async () => {
    render(<NodeMediaViewerModal />);
    act(() => useMediaViewerStore.getState().open("gen-1"));

    expect(await screen.findByRole("dialog", { name: "Media viewer" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByText("a red fox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Current node output" })).toBeDisabled();
  });

  it("loads another history item and commits it as node output", async () => {
    render(<NodeMediaViewerModal />);
    act(() => useMediaViewerStore.getState().open("gen-1"));
    await screen.findByRole("dialog");

    fireEvent.click(screen.getAllByRole("option")[1]);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Use as node output" })).toBeEnabled()
    );
    expect(screen.getByText("a blue fox")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use as node output" }));
    expect(updateNodeData).toHaveBeenCalledWith("gen-1", {
      outputImage: "data:image/png;base64,loaded-h2",
      selectedHistoryIndex: 1,
      status: "idle",
      error: null,
    });
  });

  it("promotes the selected item to a new input node and closes", async () => {
    render(<NodeMediaViewerModal />);
    act(() => useMediaViewerStore.getState().open("gen-1"));
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Promote to input node" }));

    expect(addNode).toHaveBeenCalledWith(
      "imageInput",
      expect.objectContaining({ x: expect.any(Number), y: 100 }),
      expect.objectContaining({ image: "data:image/png;base64,committed" })
    );
    expect(useMediaViewerStore.getState().nodeId).toBeNull();
  });

  it("closes on Escape", async () => {
    render(<NodeMediaViewerModal />);
    act(() => useMediaViewerStore.getState().open("gen-1"));
    await screen.findByRole("dialog");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(useMediaViewerStore.getState().nodeId).toBeNull();
  });
});
